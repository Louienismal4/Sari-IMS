#!/bin/sh
set -e

# Load centralized .env if mounted to reflect any runtime updates
if [ -f "/var/www/html/.env" ]; then
    set -a
    . /var/www/html/.env
    set +a
elif [ -f ".env" ]; then
    set -a
    . .env
    set +a
fi

# Ensure storage directories exist and have proper permissions
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
chmod -R 775 storage bootstrap/cache || true
rm -f bootstrap/cache/*.php 2>/dev/null || true

# Wait for Database if DB_HOST is set
if [ -n "$DB_HOST" ]; then
    DB_DRIVER="${DB_CONNECTION:-pgsql}"
    DEFAULT_PORT="5432"
    if [ "$DB_DRIVER" = "mysql" ]; then DEFAULT_PORT="3306"; fi
    TARGET_PORT="${DB_PORT:-$DEFAULT_PORT}"

    echo "Waiting for database connection ($DB_DRIVER) at $DB_HOST:$TARGET_PORT..."
    for i in $(seq 1 30); do
        if php -r "
            \$driver = getenv('DB_CONNECTION') ?: 'pgsql';
            \$host = getenv('DB_HOST') ?: 'postgres';
            \$port = getenv('DB_PORT') ?: (\$driver === 'mysql' ? '3306' : '5432');
            \$db = getenv('DB_DATABASE') ?: 'sari_inventory';
            \$user = getenv('DB_USERNAME') ?: 'sari_user';
            \$pass = getenv('DB_PASSWORD') ?: '';
            \$dsn = \"\$driver:host=\$host;port=\$port;dbname=\$db\";
            try {
                new PDO(\$dsn, \$user, \$pass, [PDO::ATTR_TIMEOUT => 3]);
                exit(0);
            } catch (Exception \$e) {
                exit(1);
            }
        "; then
            echo "Database connection established!"
            break
        fi
        echo "Database is unavailable - sleeping 2s ($i/30)..."
        sleep 2
    done
fi

# Wait for Redis if REDIS_HOST is set
if [ -n "$REDIS_HOST" ]; then
    echo "Waiting for Redis at $REDIS_HOST:${REDIS_PORT:-6379}..."
    for i in $(seq 1 20); do
        if php -r "
            \$host = getenv('REDIS_HOST') ?: 'redis';
            \$port = (int)(getenv('REDIS_PORT') ?: 6379);
            \$pass = getenv('REDIS_PASSWORD') ?: null;
            try {
                if (extension_loaded('redis')) {
                    \$r = new Redis();
                    if (\$r->connect(\$host, \$port, 2)) {
                        if (\$pass) { \$r->auth(\$pass); }
                        if (\$r->ping()) { exit(0); }
                    }
                } else {
                    \$fp = @fsockopen(\$host, \$port, \$errno, \$errstr, 2);
                    if (\$fp) { fclose(\$fp); exit(0); }
                }
                exit(1);
            } catch (Exception \$e) {
                exit(1);
            }
        "; then
            echo "Redis connection established!"
            break
        fi
        echo "Redis is unavailable - sleeping 1s ($i/20)..."
        sleep 1
    done
fi

# Ensure composer vendor directory exists if shadowed by a host mount
if [ ! -f "vendor/autoload.php" ]; then
    echo "Vendor autoload not found. Installing composer dependencies..."
    composer install --no-dev --no-interaction --prefer-dist --no-progress
fi

# Cache configuration & routes ONLY in production
if [ "$APP_ENV" = "production" ] && [ -n "$APP_KEY" ]; then
    echo "Optimizing Laravel configuration & routes for production..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force || true

# Seed database with initial catalog
echo "Seeding starter store inventory..."
php artisan db:seed --force || true

# Start server
echo "Starting Laravel server on port 8000..."
exec php artisan serve --host=0.0.0.0 --port=8000

