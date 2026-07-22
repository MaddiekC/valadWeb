<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\DetallePagoController;
use App\Http\Controllers\AtsController;
use App\Http\Controllers\UserController;

use Illuminate\Support\Facades\Route;


Route::group(
    [
        'prefix' => 'auth'
    ],
    function () {
        Route::post('/login', [AuthController::class, 'login'])->name('login');
        Route::post('/logout', [AuthController::class, 'logout']);
    }
);
 
Route::group(
    [
        'middleware' =>  'auth:api'
    ],
    function () {
        Route::get('/me/permissions', [AuthController::class, 'permissions']); // Transacciones
        
        Route::get('/empresas', [EmpresaController::class, 'index']); 
        Route::get('/empresas/{id}', [EmpresaController::class, 'show']); 
        
        Route::post('/ats/procesar', [AtsController::class, 'procesarAts']);
        Route::put('/ats/retencion/autorizacion', [AtsController::class, 'actualizarAutorizacionRetencion']);
        Route::get('/pagosCheques', [DetallePagoController::class, 'listarCheques']);
    
        Route::get('/usuarios', [UserController::class, 'index']); // Listar usuarios
        Route::post('/usuarios', [UserController::class, 'store']); // Crear usuario
        Route::put('/usuarios/{id}/inactive', [UserController::class, 'destroy']); // Inactivar usuario
        Route::get('/transacciones', [UserController::class, 'getTransacciones']); // Listar todas las transacciones/permisos
        Route::get('/usuarios/{id}/transacciones', [UserController::class, 'getUserTransacciones']); // Listar permisos de un usuario
        Route::put('/usuarios/{id}/transacciones', [UserController::class, 'updateUserTransacciones']); // Actualizar permisos de un usuario
    }
);