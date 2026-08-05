<?php

namespace App\Http\Controllers;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmpresaController extends Controller
{
    public function index(Request $request)
    {
        // Si se solicitan todas las empresas (vista administrativa para asignar)
        if ($request->has('all') || $request->has('todos')) {
            $empresas = Empresa::get();
            return response()->json($empresas);
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'No autorizado'], 401);
        }

        // Obtener IDs de empresas autorizadas
        $allowedCompanyIds = DB::table('usuarioEmpresa')
            ->where('Id_Usuario', $user->id)
            ->where('Estado', 1)
            ->pluck('Id_Empresa')
            ->toArray();

        // Retornar solo las autorizadas
        $empresas = Empresa::whereIn('idEmpresa', $allowedCompanyIds)->get();
        return response()->json($empresas);
    }

    public function show($id)
    {
        $empresa = Empresa::where('idEmpresa', $id)->first();
        return response()->json($empresa);
    }
}
