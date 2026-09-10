<?php

use App\Http\Controllers\Api\SetupController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [SetupController::class, 'health']);
Route::get('/health/ready', [SetupController::class, 'ready']);

Route::get('/', function () {
    return view('welcome');
});
