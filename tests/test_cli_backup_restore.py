"""Isolated PostgreSQL checks: python3 -m unittest discover -s tests -v."""
import gzip
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
DOCKER = shutil.which('docker')


class CliBackupRestoreTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.container = 'sari-cli-test-' + uuid.uuid4().hex[:12]
        subprocess.run([DOCKER, 'run', '-d', '--name', cls.container,
                        '-e', 'POSTGRES_PASSWORD=test', 'postgres:17-alpine'], check=True,
                       stdout=subprocess.DEVNULL)
        cls.addClassCleanup(subprocess.run, [DOCKER, 'rm', '-f', cls.container],
                            stdout=subprocess.DEVNULL, check=True)
        for _ in range(60):
            if cls.sql('SELECT 1', check=False).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('Test PostgreSQL did not become ready')

    @classmethod
    def sql(cls, sql, check=True):
        return subprocess.run([DOCKER, 'exec', '-i', cls.container, 'psql', '-X',
                               '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-At'],
                              input=sql, text=True, capture_output=True, check=check)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='sari-cli-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        deploy = self.root / 'deploy'
        deploy.mkdir()
        (deploy / 'Caddyfile').touch()
        (deploy / 'docker-compose.yml').touch()
        (deploy / '.env').write_text('DB_USERNAME=postgres\nDB_DATABASE=postgres\nDB_PASSWORD=test\n')
        for entry in ('prod.sh', 'deploy/prod.sh'):
            shutil.copy(ROOT / entry, self.root / entry)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.log = self.root / 'calls'
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ['PATH'],
                        TEST_DOCKER=DOCKER, TEST_CONTAINER=self.container,
                        TEST_LOG=str(self.log), TEST_RUNNING=str(self.root / 'running'))
        Path(self.env['TEST_RUNNING']).touch()
        (self.bin / 'docker').write_text('''#!/usr/bin/env bash
set -e
printf '%s\\n' "$*" >> "$TEST_LOG"
if [ "$1" = info ]; then exit 0; fi
shift
case "$1" in
  ps) [ ! -f "$TEST_RUNNING" ] || echo backend ;;
  stop) rm -f "$TEST_RUNNING" ;;
  start) touch "$TEST_RUNNING" ;;
  exec)
    shift
    while [ "$1" != postgres ] && [ "$1" != backend ]; do
      if [ "$1" = -e ]; then shift; fi
      shift
    done
    service="$1"; shift
    if [ "$service" = backend ]; then
      if [ "$1" = grep ] && [ "$TEST_BOOTSTRAP" = unsupported ]; then exit 1; fi
      exit 0
    fi
    if [ "$1" = pg_dump ]; then
      case "$TEST_DUMP" in
        fail) echo 'partial SQL'; exit 1 ;;
        empty) exit 0 ;;
      esac
    fi
    if [ "$1" = psql ] && [ -f "$TEST_RUNNING" ]; then
      echo 'Application still running during restore' >&2
      exit 1
    fi
    exec "$TEST_DOCKER" exec -i "$TEST_CONTAINER" "$@"
    ;;
  *) echo 'Unexpected compose operation' >&2; exit 1 ;;
esac
''')
        (self.bin / 'docker').chmod(0o755)
        self.sql('DROP SCHEMA public CASCADE; CREATE SCHEMA public; '
                 'CREATE TABLE products (id serial PRIMARY KEY, name text); '
                 "INSERT INTO products (name) VALUES ('original'); "
                 'CREATE TABLE sales (id int PRIMARY KEY, product_id int REFERENCES products); '
                 'INSERT INTO sales VALUES (5, 1); CREATE VIEW catalog AS SELECT * FROM products;')

    def cli(self, entry, *args, **env):
        return subprocess.run(['bash', str(self.root / entry), *map(str, args)],
                              input='y\n', text=True, capture_output=True,
                              env=dict(self.env, **env))

    def archive(self):
        return next((self.root / 'deploy/backups').glob('*.sql.gz'))

    def snapshot(self):
        result = subprocess.run([DOCKER, 'exec', self.container, 'pg_dump', '-U',
                                 'postgres', '--clean', '--if-exists'],
                                text=True, capture_output=True, check=True)
        # PostgreSQL randomizes psql restriction keys, which are not database contents.
        return '\n'.join(line for line in result.stdout.splitlines()
                         if not line.startswith(('\\restrict ', '\\unrestrict ')))

    def assert_failed(self, result):
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn('successfully', result.stdout)

    def test_dump_failure_and_empty_dump_publish_nothing(self):
        for entry in ('prod.sh', 'deploy/prod.sh'):
            for failure in ('fail', 'empty'):
                with self.subTest(entry=entry, failure=failure):
                    self.assert_failed(self.cli(entry, 'backup', TEST_DUMP=failure))
                    self.assertEqual(list((self.root / 'deploy/backups').iterdir()), [])

    def test_compression_failure_publishes_nothing(self):
        (self.bin / 'gzip').write_text('#!/usr/bin/env bash\necho partial; exit 1\n')
        (self.bin / 'gzip').chmod(0o755)
        for entry in ('prod.sh', 'deploy/prod.sh'):
            with self.subTest(entry=entry):
                self.assert_failed(self.cli(entry, 'backup'))
                self.assertEqual(list((self.root / 'deploy/backups').iterdir()), [])

    def test_update_and_reset_require_backup_but_reset_allows_opt_out(self):
        for entry in ('prod.sh', 'deploy/prod.sh'):
            for command in ('update', 'reset'):
                with self.subTest(entry=entry, command=command):
                    self.log.write_text('')
                    self.assert_failed(self.cli(entry, command, '-y', TEST_DUMP='fail'))
                    calls = self.log.read_text()
                    self.assertNotIn('compose pull', calls)
                    self.assertNotIn('compose up', calls)
                    self.assertNotIn('artisan', calls)
            self.log.write_text('')
            result = self.cli(entry, 'reset', '-y', '--no-backup', TEST_DUMP='fail')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('sari:reset-db', self.log.read_text())
            self.assertNotIn('pg_dump', self.log.read_text())

    def test_bad_archive_never_touches_database(self):
        archive = self.root / 'bad.sql.gz'
        snapshot = self.snapshot()
        for content in (b'not gzip', gzip.compress(b''), gzip.compress(b'SELECT 1;')[:-5]):
            archive.write_bytes(content)
            for entry in ('prod.sh', 'deploy/prod.sh'):
                with self.subTest(entry=entry, content=content):
                    self.log.write_text('')
                    self.assert_failed(self.cli(entry, 'restore', archive))
                    self.assertNotIn('compose stop', self.log.read_text())
                    self.assertNotIn('psql', self.log.read_text())
                    self.assertEqual(self.snapshot(), snapshot)

    def test_old_backend_is_rejected_before_restore(self):
        archive = self.root / 'valid.sql.gz'
        archive.write_bytes(gzip.compress(b'CREATE TABLE replacement (id int);'))
        snapshot = self.snapshot()
        for entry in ('prod.sh', 'deploy/prod.sh'):
            with self.subTest(entry=entry):
                self.log.write_text('')
                self.assert_failed(self.cli(entry, 'restore', archive, TEST_BOOTSTRAP='unsupported'))
                self.assertNotIn('compose stop', self.log.read_text())
                self.assertNotIn('psql', self.log.read_text())
                self.assertEqual(self.snapshot(), snapshot)

    def test_sql_failure_rolls_back_and_restarts_backend(self):
        archive = self.root / 'bad.sql.gz'
        archive.write_bytes(gzip.compress(b'CREATE TABLE partial (id int); SELECT missing_column;'))
        snapshot = self.snapshot()
        for entry in ('prod.sh', 'deploy/prod.sh'):
            with self.subTest(entry=entry):
                self.assert_failed(self.cli(entry, 'restore', archive))
                self.assertEqual(self.snapshot(), snapshot)
                self.assertTrue(Path(self.env['TEST_RUNNING']).exists())

    def test_legacy_archive_replaces_contents_and_keeps_stopped_backend_stopped(self):
        dump = subprocess.run([DOCKER, 'exec', self.container, 'pg_dump', '-U', 'postgres'],
                              capture_output=True, check=True).stdout
        archive = self.root / 'legacy.sql.gz'
        archive.write_bytes(gzip.compress(dump))
        snapshot = self.snapshot()
        Path(self.env['TEST_RUNNING']).unlink()
        for entry in ('prod.sh', 'deploy/prod.sh'):
            with self.subTest(entry=entry):
                self.sql("UPDATE products SET name='changed'; CREATE TABLE obsolete (id int)")
                result = self.cli(entry, 'restore', archive)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual(self.snapshot(), snapshot)
                self.assertFalse(Path(self.env['TEST_RUNNING']).exists())

    def test_restore_restart_skips_bootstrap_once(self):
        subprocess.run([DOCKER, 'cp', str(ROOT / 'backend/docker-entrypoint.sh'),
                        self.container + ':/tmp/sari-entrypoint.sh'], check=True)
        script = """
set -e
mkdir -p /tmp/bootstrap-test/bin /tmp/bootstrap-test/vendor
cd /tmp/bootstrap-test
touch vendor/autoload.php /tmp/sari-skip-database-bootstrap
cat > bin/php <<'SH'
#!/bin/sh
printf '%s\\n' "$*" >> /tmp/bootstrap-test/calls
SH
chmod +x bin/php
export PATH="/tmp/bootstrap-test/bin:$PATH"
sh /tmp/sari-entrypoint.sh
cat calls
[ ! -f /tmp/sari-skip-database-bootstrap ]
: > calls
sh /tmp/sari-entrypoint.sh
cat calls
"""
        result = subprocess.run([DOCKER, 'exec', '-i', self.container, 'sh'], input=script,
                                text=True, capture_output=True, check=True)
        before, after = result.stdout.split('Running database migrations...')
        self.assertNotIn('artisan migrate', before)
        self.assertNotIn('artisan db:seed', before)
        self.assertIn('artisan serve', before)
        self.assertIn('artisan migrate --force', after)
        self.assertIn('artisan db:seed --force', after)

    def test_restore_replaces_populated_database(self):
        for entry in ('prod.sh', 'deploy/prod.sh'):
            with self.subTest(entry=entry):
                self.sql('DROP TABLE IF EXISTS obsolete')
                snapshot = self.snapshot()
                result = self.cli(entry, 'backup')
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                archive = self.archive()
                self.sql("UPDATE products SET name='changed'; INSERT INTO products (name) VALUES ('extra'); "
                         'CREATE TABLE obsolete (id int);')
                result = self.cli(entry, 'restore', archive)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual(self.snapshot(), snapshot)
                self.assertEqual(self.sql("SELECT to_regclass('public.obsolete') IS NULL").stdout, 't\n')
                self.assertEqual(self.sql("SELECT nextval('products_id_seq')").stdout, '2\n')
                self.sql("SELECT setval('products_id_seq', 1)")
                self.assertTrue(Path(self.env['TEST_RUNNING']).exists())


if __name__ == '__main__':
    unittest.main()
