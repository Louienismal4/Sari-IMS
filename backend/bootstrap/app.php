<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

// Support root .env when running on host CLI outside Docker container
$backendEnv = dirname(__DIR__) . '/.env';
$parentEnv = dirname(dirname(__DIR__)) . '/.env';
if (!file_exists($backendEnv) && file_exists($parentEnv)) {
    \Dotenv\Dotenv::createImmutable(dirname(dirname(__DIR__)))->safeLoad();
}

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(\App\Http\Middleware\InstallationMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

// Centralized root .env support:
// If backend/.env does not exist or is empty, load the centralized .env from repository root
$parentEnv = dirname($app->basePath()) . '/.env';
if ((!file_exists($app->environmentFilePath()) || filesize($app->environmentFilePath()) === 0) && file_exists($parentEnv)) {
    $app->useEnvironmentPath(dirname($app->basePath()));
}

return $app;