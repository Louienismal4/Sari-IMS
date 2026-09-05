#!/bin/sh
set -e

# Ensure storage directories exist and have proper permissions
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs
chmod -R 775 storage bootstrap/cache || true

# Wait for MySQL if DB_HOST is set
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database connection at $DB_HOST:$DB_PORT..."
    for i in $(seq 1 30); do
        if php -r "try { new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . (getenv('DB_PORT') ?: '3306') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD')); exit(0); } catch (Exception \$e) { exit(1); }"; then
            echo "Database connection established!"
            break
        fi
        echo "Database is unavailable - sleeping 2s ($i/30)..."
        sleep 2
    done
fi

# Cache configuration & routes in production if APP_KEY exists
if [ -n "$APP_KEY" ]; then
    echo "Optimizing Laravel configuration & routes..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force || true

# Start server
echo "Starting Laravel server on port 8000..."
exec php artisan serve --host=0.0.0.0 --port=8000
