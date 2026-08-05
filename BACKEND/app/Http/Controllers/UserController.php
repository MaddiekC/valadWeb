<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Transaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index()
    {
        $usuarios = User::where('estado', '!=', 'I')->orWhereNull('estado')->orderByDesc('created_at')->get();
        return response()->json($usuarios);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'surname' => $request->surname,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'estado' => 'A'
            ]);

            return response()->json($user, 201);
        } catch (\Throwable $e) {
            Log::error('Error creando usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al crear usuario'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $user->estado = 'I';
            $user->save();
            return response()->json(['message' => 'Usuario inactivo']);
        } catch (\Throwable $e) {
            Log::error('Error al inactivar usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al inactivar usuario'], 500);
        }
    }

    public function getTransacciones()
    {
        try {
            $transacciones = Transaccion::orderBy('id', 'asc')->get();
            return response()->json($transacciones);
        } catch (\Throwable $e) {
            Log::error('Error al obtener transacciones: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al obtener transacciones'], 500);
        }
    }

    public function getUserTransacciones($id)
    {
        try {
            $user = User::findOrFail($id);
            $transaccionIds = $user->transacciones()->pluck('transacciones.id')->map(fn($id) => (int)$id);
            return response()->json($transaccionIds);
        } catch (\Throwable $e) {
            Log::error('Error al obtener transacciones de usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al obtener transacciones del usuario'], 500);
        }
    }

    public function updateUserTransacciones(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);
            
            // Validate transaction ids if provided
            $transaccionIds = $request->input('transacciones', []);
            if (!is_array($transaccionIds)) {
                return response()->json(['message' => 'Formato de transacciones inválido'], 420);
            }

            // Normalize request IDs to integers
            $requestedIds = array_map('intval', $transaccionIds);

            // Fetch existing pivot rows for this user: array of [transaccion_id => estado]
            $existingPivot = DB::table('transaccion_user')
                ->where('user_id', $id)
                ->pluck('estado', 'transaccion_id')
                ->toArray();

            DB::beginTransaction();

            // 1. Update existing entries
            foreach ($existingPivot as $transId => $estado) {
                // If the transaction ID is in the requested array, set to active ('A'), otherwise inactive ('I')
                $newEstado = in_array((int)$transId, $requestedIds) ? 'A' : 'I';
                // Trim in case there is trailing whitespace in the database (e.g. char fields)
                $trimmedEstado = trim($estado);
                if ($trimmedEstado !== $newEstado) {
                    DB::table('transaccion_user')
                        ->where('user_id', $id)
                        ->where('transaccion_id', $transId)
                        ->update(['estado' => $newEstado]);
                }
            }

            // 2. Insert new entries
            foreach ($requestedIds as $transId) {
                if (!array_key_exists($transId, $existingPivot)) {
                    DB::table('transaccion_user')->insert([
                        'user_id' => $id,
                        'transaccion_id' => $transId,
                        'estado' => 'A'
                    ]);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Permisos actualizados correctamente']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al actualizar transacciones de usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al actualizar permisos del usuario: ' . $e->getMessage()], 500);
        }
    }

    public function getUserEmpresas($id)
    {
        try {
            $user = User::findOrFail($id);
            $empresaIds = DB::table('usuarioEmpresa')
                ->where('Id_Usuario', $id)
                ->where('Estado', 1)
                ->pluck('Id_Empresa')
                ->map(fn($id) => (int)$id);
            return response()->json($empresaIds);
        } catch (\Throwable $e) {
            Log::error('Error al obtener empresas de usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al obtener empresas del usuario'], 500);
        }
    }

    public function updateUserEmpresas(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);
            $empresaIds = $request->input('empresas', []);
            if (!is_array($empresaIds)) {
                return response()->json(['message' => 'Formato de empresas inválido'], 420);
            }

            $requestedIds = array_map('intval', $empresaIds);

            // Fetch existing pivot rows for this user: array of [Id_Empresa => Estado]
            $existingPivot = DB::table('usuarioEmpresa')
                ->where('Id_Usuario', $id)
                ->pluck('Estado', 'Id_Empresa')
                ->toArray();

            DB::beginTransaction();

            // 1. Update existing entries
            foreach ($existingPivot as $empId => $estado) {
                // If the company ID is in the requested array, set active (1), otherwise inactive (0)
                $newEstado = in_array((int)$empId, $requestedIds) ? 1 : 0;
                if ((int)$estado !== $newEstado) {
                    DB::table('usuarioEmpresa')
                        ->where('Id_Usuario', $id)
                        ->where('Id_Empresa', $empId)
                        ->update(['Estado' => $newEstado]);
                }
            }

            // 2. Insert new entries
            foreach ($requestedIds as $empId) {
                if (!array_key_exists($empId, $existingPivot)) {
                    DB::table('usuarioEmpresa')->insert([
                        'Id_Usuario' => $id,
                        'Id_Empresa' => $empId,
                        'Estado' => 1,
                        'Fecha_Registro' => now()
                    ]);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Empresas autorizadas actualizadas correctamente']);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Error al actualizar empresas de usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al actualizar empresas del usuario: ' . $e->getMessage()], 500);
        }
    }
}

