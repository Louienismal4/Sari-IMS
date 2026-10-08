"""Live dev-stack regression: python3 -m unittest discover -s tests -p test_bootstrap_cache_isolation.py -v."""
import json
from pathlib import Path
import subprocess
import unittest
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


class BootstrapCacheIsolationTest(unittest.TestCase):
    def test_host_package_discovery_does_not_break_container_status(self):
        subprocess.run(['php', 'artisan', 'package:discover'], cwd=ROOT / 'backend',
                       check=True, capture_output=True)
        address = subprocess.check_output(
            ['docker', 'compose', 'port', 'frontend', '3000'], cwd=ROOT, text=True).strip()
        port = int(address.rsplit(':', 1)[1])
        request = urllib.request.Request(
            f'http://127.0.0.1:{port}/api/installation/status',
            headers={'Accept': 'application/json'})
        with urllib.request.urlopen(request, timeout=10) as response:
            self.assertEqual(response.status, 200)
            self.assertIsInstance(json.load(response)['installed'], bool)


if __name__ == '__main__':
    unittest.main()
