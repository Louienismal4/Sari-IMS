<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

// Centralized root .env support:
// If backend/.env does not exist, load the centralized .env from the repository root
$parentEnv = dirname($app->basePath()).'/.env';
if (!file_exists($app->environmentFilePath()) && file_exists($parentEnv)) {
    $app->useEnvironmentPath(dirname($app->basePath()));
}

return $app;