<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\DetallePagoController;
use App\Http\Controllers\UserController;

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

/*Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});*/

//Route::post('/refresh', [AuthController::class, 'refresh']);

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
        
        Route::get('/empresas', [EmpresaController::class, 'index']); // Listar todas las empresas
        Route::get('/empresas/{id}', [EmpresaController::class, 'show']); // Ver una empresa por ID

        Route::get('/pagosCheques', [DetallePagoController::class, 'listarPagos']); // Listar todos los pagos

        Route::get('/usuarios', [UserController::class, 'index']); // Listar usuarios
        Route::post('/usuarios', [UserController::class, 'store']); // Crear usuario
        Route::put('/usuarios/{id}/inactive', [UserController::class, 'destroy']); // Inactivar usuario
    }
);

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });
// Route::get('/prueba', function(){
//     return response()->json(['mensaje' => 'funciona']);
// });
// Route::group([
//     'middleware' => 'api',
//     'prefix' => 'auth'], function (){
//     Route::post('/login', [AuthController::class, 'login']);
//     Route::post('/logout', [AuthController::class, 'logout']);
//     Route::post('/bosques', [BosqueController::class, 'store']); // Crear un bosque

// });
