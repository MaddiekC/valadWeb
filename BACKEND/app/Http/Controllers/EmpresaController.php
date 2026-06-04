<?php

namespace App\Http\Controllers;

use App\Models\Empresa;


class EmpresaController extends Controller
{
    public function index()
    {
        $empresas = Empresa::get();
        return response()->json($empresas);
    }

    public function show($id)
    {
        $empresa = Empresa::where('idEmpresa', $id)->first();
        return response()->json($empresa);
    }

  
}
