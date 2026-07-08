<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    protected function configurarConexionDinamica(?int $empresaId)
    {
        $databaseName = 'VALAD';

        if ($empresaId) {
            $empresa = \App\Models\Empresa::where('idEmpresa', $empresaId)->first();
            if ($empresa && $empresa->Base_sqlServer) {
                $databaseName = trim($empresa->Base_sqlServer);
            }
        }

        config([
            'database.connections.dynamic' => array_merge(
                config('database.connections.sqlsrv'),
                ['database' => $databaseName]
            )
        ]);

        \Illuminate\Support\Facades\DB::purge('dynamic');
    }
}
