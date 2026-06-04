<?php

namespace App\Http\Controllers;

use App\Models\DetallePago;


class DetallePagoController extends Controller
{
    public function listarPagos()
    {
        $conexiones = ['sqlsrv_db2', 'sqlsrv_db3'];
        $todosLosPagos = collect();

        foreach ($conexiones as $conexion) {
            // Instanciamos un modelo limpio y le asignamos la conexión en caliente
            $pagosDeBase = (new DetallePago)->setConnection($conexion)
                ->where('NroCheque', '0')
                ->get()
                ->map(function ($pago) use ($conexion) {
                    // Para saber de qué base de datos vino
                    $pago->origen_db = $conexion;
                    return $pago;
                });

            // Fusionamos los resultados en la colección principal
            $todosLosPagos = $todosLosPagos->concat($pagosDeBase);
        }
        return view('pagos.index', compact('todosLosPagos'));
    }
}
