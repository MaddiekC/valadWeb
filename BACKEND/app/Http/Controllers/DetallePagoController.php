<?php

namespace App\Http\Controllers;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DetallePagoController extends Controller
{
    public function listarCheques(Request $request)
    {
        $empresaId = $request->query('empresa_id');
        
        // Conexión dinámica
        $this->configurarConexionDinamica($empresaId ? (int)$empresaId : null);

        try {
            $cheques = DB::connection('dynamic')
                ->table('ERP_Cxp_Detalle_Pagos as dp')
                ->leftJoin('SGI_Con_Cab as cc', function ($join) {
                    $join->on('cc.id_cia', '=', 'dp.id_cia')
                         ->on('cc.cheque', '=', 'dp.NroCheque')
                         ->where('cc.tipo', '=', 'EG');
                })
                ->leftJoin('SGI_Cxp_Catalogo as prov', 'prov.codigo', '=', 'dp.CodigoPro')
                ->where('dp.Tipo_Entidad', 'CHQ')
                ->where('dp.CuentaContable', '101010201002')
                -> where('dp.NroCheque', '=', 0)
                ->select([
                    'dp.id_fila',
                    'cc.documento as num_comp',
                    DB::raw("COALESCE(cc.fecha, dp.FechaPago) as fecha_pago"),
                    DB::raw("COALESCE(cc.beneficiario, prov.nombre) as beneficiario"),
                    DB::raw("COALESCE(cc.observaciones, '') as concepto"),
                    'dp.Valor as valor',
                    'dp.NroCuenta as nro_cuenta',
                    'prov.ruc as ruc'
                ])
                ->get();

            return response()->json($cheques);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Error al consultar la base de datos: ' . $e->getMessage()
            ], 500);
        }
    }
}

