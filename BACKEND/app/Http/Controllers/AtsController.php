<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use DOMDocument;

class AtsController extends Controller
{
    public function procesarAts(Request $request)
    {
        $request->validate([
            'empresa_id' => 'required',
            'mes'        => 'required|string|size:2',
            'anio'       => 'required|string|size:4',
            'accion'     => 'required|string'         // 'vista_previa' o 'generar_xml'
        ]);

        $empresaId = $request->input('empresa_id');
        $mes       = $request->input('mes');
        $anio      = $request->input('anio');
        $accion    = $request->input('accion');

        // Conexión dinámica
        $this->configurarConexionDinamica((int) $empresaId);

        try {
            $compras = DB::connection('dynamic')->select(
                "EXEC [dbo].[Prc_ValadWeb_ExtraerATSCompras] @MesParam = ?, @AnioParam = ?",
                [$mes, $anio]
            );

            // 4. Recorre las compras y llamar a los SPs de reembolsos y retenciones de forma individual
            $datasetFinal = [];
            foreach ($compras as $compra) {
                // Convertir bases imponibles, montos y retenciones a valor absoluto para evitar valores negativos
                $compra->baseImponible   = abs((float)($compra->baseImponible ?? 0));
                $compra->baseimpgrav     = abs((float)($compra->baseimpgrav ?? 0));
                $compra->baseNoGraIva    = abs((float)($compra->baseNoGraIva ?? 0));
                $compra->baseImpExe      = abs((float)($compra->baseImpExe ?? 0));
                $compra->montoIva        = abs((float)($compra->montoIva ?? 0));
                $compra->montoIce        = abs((float)($compra->montoIce ?? 0));
                $compra->valorRetBienes  = abs((float)($compra->valorRetBienes ?? 0));
                $compra->valorRetServicios = abs((float)($compra->valorRetServicios ?? 0));
                $compra->valRetServ100   = abs((float)($compra->valRetServ100 ?? 0));

                if ($compra->tipoComprobante == '41' || isset($compra->es_reembolso)) {
                    $compra->detallesReembolso = DB::connection('dynamic')->select(
                        "EXEC [dbo].[Prc_ValadWeb_LeerReembolsoATS] @IdCompraFactura = ?",
                        [$compra->id_fila] // UUID de la factura padre
                    );
                } else {
                    $compra->detallesReembolso = [];
                }

                // Obtener retenciones para la compra
                $tipoComprobante = intval(trim($compra->tipoComprobante ?? 0));
                $tipoComprobanteFormateado = sprintf('%02d', $tipoComprobante);

                $compra->detallesRetencion = DB::connection('dynamic')->select(
                    "EXEC [dbo].[Prc_ValadWeb_RetencionesATS] @IdCompraFactura = ?, @TipoComprobante = ?",
                    [trim($compra->id_fila), $tipoComprobanteFormateado]
                );

                // Calcular retenciones de IVA en bienes según sriporivab
                $sriporivab = intval($compra->sriporivab ?? 0);
                $valRetBienesBase = (float)($compra->valorRetBienes ?? 0);
                $compra->valorRetBien10 = 0.00;
                $compra->valorRetBienes = 0.00;

                if ($sriporivab === 10) {
                    $compra->valorRetBien10 = $valRetBienesBase;
                } else {
                    $compra->valorRetBienes = $valRetBienesBase;
                }

                // Calcular retenciones de IVA en servicios según sriporivas
                $sriporivas = intval($compra->sriporivas ?? 0);
                $valRetServiciosBase = (float)($compra->valorRetServicios ?? 0);
                $valRetServ100Base = (float)($compra->valRetServ100 ?? 0);

                $compra->valRetServ20 = 0.00;
                $compra->valRetServ50 = 0.00;
                $compra->valRetServ100 = 0.00;
                $compra->valorRetServicios = 0.00;

                if ($sriporivas === 20) {
                    $compra->valRetServ20 = $valRetServiciosBase;
                } elseif ($sriporivas === 50) {
                    $compra->valRetServ50 = $valRetServiciosBase;
                } elseif ($sriporivas === 100) {
                    $compra->valRetServ100 = $valRetServiciosBase;
                } else {
                    $compra->valorRetServicios = $valRetServiciosBase;
                }

                // Si por alguna razón valRetServ100 no se asignó por sriporivas, pero la base original de valRetServ100 tiene valor, la respetamos.
                if ($compra->valRetServ100 === 0.00 && $valRetServ100Base > 0.00) {
                    $compra->valRetServ100 = $valRetServ100Base;
                }

                $datasetFinal[] = $compra;
            }

            // 5. Bifurcación según lo que el usuario quiere hacer
            if ($accion === 'vista_previa') {
                return response()->json([
                    'success' => true,
                    'data'    => $datasetFinal
                ]);
            } elseif ($accion === 'generar_xml') {
                return $this->generarArchivoXml($datasetFinal, $mes, $anio, (int) $empresaId);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el ATS: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Genera el archivo XML estructurado bajo el estándar del SRI
     */
    private function generarArchivoXml(array $dataset, string $mes, string $anio, int $empresaId)
    {
        try {
            // 1. Obtener datos de la empresa para extraer el RUC dinámicamente
            $empresa = \App\Models\Empresa::where('idEmpresa', $empresaId)->first();
            $rucEmpresa = $empresa ? trim($empresa->ruc) : '';
            $nombreEmpresa = $empresa ? trim($empresa->nombre) : '';
            $nombreEmpresaClean = str_replace('.', '', $nombreEmpresa);
            // 2. Inicializar DOMDocument con codificación estándar UTF-8
            $dom = new DOMDocument('1.0', 'UTF-8');
            $dom->formatOutput = true; // Hace que el XML se genere con sangrías/indentado limpio

            // 3. Crear el nodo raíz del ATS
            $iva = $dom->createElement('iva');
            $dom->appendChild($iva);

            // 4. Nodos de cabecera obligatorios del ATS
            $iva->appendChild($dom->createElement('TipoIDInformante', 'R')); // R para RUC
            $iva->appendChild($dom->createElement('IdInformante', $rucEmpresa));
            $iva->appendChild($dom->createElement('razonSocial', $nombreEmpresaClean));
            $iva->appendChild($dom->createElement('Anio', $anio));
            $iva->appendChild($dom->createElement('Mes', $mes));
            $iva->appendChild($dom->createElement('numEstabRuc', '001')); // Estructura base
            $iva->appendChild($dom->createElement('totalVentas', '0.00')); // Si solo haces compras, va en 0
            $iva->appendChild($dom->createElement('codigoOperativo', 'IVA'));
            // 5. Crear el bloque contenedor de COMPRAS
            $comprasNode = $dom->createElement('compras');
            $iva->appendChild($comprasNode);

            // 6. Iterar el dataset que unificó el SP de compras y tu SP de reembolsos
            foreach ($dataset as $factura) {
                $detalleCompras = $dom->createElement('detalleCompras');
                $comprasNode->appendChild($detalleCompras);

                // Mapeo de campos desde tu SP Prc_ValadWeb_ExtraerATSCompras (protegido contra valores null en PHP 8.1+)
                $detalleCompras->appendChild($dom->createElement('codSustento', trim($factura->codSustento ?? '')));
                $detalleCompras->appendChild($dom->createElement('tpIdProv', trim($factura->TipoID ?? '')));
                $detalleCompras->appendChild($dom->createElement('idProv', trim($factura->idProv ?? '')));
                //$detalleCompras->appendChild($dom->createElement('razonSocial', trim($factura->razonSocial ?? '')));
                //Formato de 2 digitos 
                $tipoComprobante = intval(trim($factura->tipoComprobante ?? 0));
                $tipoComprobanteFormateado = sprintf('%02d', $tipoComprobante);
                $detalleCompras->appendChild($dom->createElement('tipoComprobante', $tipoComprobanteFormateado));

                $detalleCompras->appendChild($dom->createElement('parteRel', trim($factura->parteRel ?? '')));
                $detalleCompras->appendChild($dom->createElement('fechaRegistro', trim($factura->fechaRegistro ?? '')));
                $detalleCompras->appendChild($dom->createElement('establecimiento', trim($factura->establecimiento ?? '')));
                $detalleCompras->appendChild($dom->createElement('puntoEmision', trim($factura->puntoEmision ?? '')));
                $detalleCompras->appendChild($dom->createElement('secuencial', trim($factura->secuencial ?? '')));
                $detalleCompras->appendChild($dom->createElement('fechaEmision', trim($factura->fechaEmision ?? '')));
                $detalleCompras->appendChild($dom->createElement('autorizacion', trim($factura->autorizacion ?? '')));

                // Valores Numéricos redondeados a 2 decimales (asegurando casteo float para evitar TypeErrors)
                $detalleCompras->appendChild($dom->createElement('baseNoGraIva', number_format((float)($factura->baseNoGraIva ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('baseImponible', number_format((float)($factura->baseImponible ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('baseImpGrav', number_format((float)($factura->baseimpgrav ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('baseImpExe', number_format((float)($factura->baseImpExe ?? 0), 2, '.', '')));

                $detalleCompras->appendChild($dom->createElement('montoIce', number_format((float)($factura->montoIce ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('montoIva', number_format((float)($factura->montoIva ?? 0), 2, '.', '')));

                if (trim($factura->tipoComprobante) === '41' || trim($factura->tipoComprobante) === '43') {
                    $totbasesImpReemb = (float)($factura->baseNoGraIva ?? 0) +
                        (float)($factura->baseImponible ?? 0) +
                        (float)($factura->baseimpgrav ?? 0) +
                        (float)($factura->baseImpExe ?? 0);
                } else {
                    $totbasesImpReemb = 0.00;
                }
                
                // Bloque de Retenciones
                $detalleCompras->appendChild($dom->createElement('valRetBien10', number_format((float)($factura->valorRetBien10 ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('valRetServ20', number_format((float)($factura->valRetServ20 ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('valorRetBienes', number_format((float)($factura->valorRetBienes ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('valRetServ50', number_format((float)($factura->valRetServ50 ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('valorRetServicios', number_format((float)($factura->valorRetServicios ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('valRetServ100', number_format((float)($factura->valRetServ100 ?? 0), 2, '.', '')));

                $detalleCompras->appendChild($dom->createElement('valorRetencionNc', number_format((float)($factura->valorRetencionNc ?? 0), 2, '.', '')));
                $detalleCompras->appendChild($dom->createElement('totbasesImpReemb', number_format($totbasesImpReemb, 2, '.', '')));

                // PAGO EXTERIOR
                if (!empty($factura->pagoLocExt)) {
                    $pagoExteriorNode = $dom->createElement('pagoExterior');
                    $detalleCompras->appendChild($pagoExteriorNode);
                    $pagoExteriorNode->appendChild($dom->createElement('pagoLocExt', trim($factura->pagoLocExt ?? '')));
                    $pagoExteriorNode->appendChild($dom->createElement('paisEfecPago', trim($factura->paisEfecPago ?? 'NA')));
                    $pagoExteriorNode->appendChild($dom->createElement('aplicConvDobTrib', trim($factura->aplicConvDobTrib ?? 'NA')));
                    $pagoExteriorNode->appendChild($dom->createElement('pagExtSujRetNorLeg', trim($factura->pagExtSujRetNorLeg ?? 'NA')));
                }

                // ==========================================
                // REGLA DE FORMAS DE PAGO 
                // ==========================================
                if (!empty(trim($factura->formaPago01 ?? ''))) {
                    $formasDePagoNode = $dom->createElement('formasDePago');
                    $detalleCompras->appendChild($formasDePagoNode);
                    $formasDePagoNode->appendChild($dom->createElement('formaPago', trim($factura->formaPago01 ?? '')));
                }

                // RETENCIONES (air) - Siempre debe existir bajo el esquema del SRI
                // ==========================================
                $retencionesNode = $dom->createElement('air');
                $detalleCompras->appendChild($retencionesNode);

                if (!empty($factura->detallesRetencion)) {
                    foreach ($factura->detallesRetencion as $retencion) {
                        $detalleRetencion = $dom->createElement('detalleAir');
                        $retencionesNode->appendChild($detalleRetencion);

                        $detalleRetencion->appendChild($dom->createElement('codRetAir', trim($retencion->codRetAir ?? '')));
                        $detalleRetencion->appendChild($dom->createElement('baseImpAir', number_format((float)($retencion->baseImpAir ?? 0), 2, '.', '')));
                        $detalleRetencion->appendChild($dom->createElement('porcentajeAir', number_format((float)($retencion->porcentajeAir ?? 0), 2, '.', '')));
                        $detalleRetencion->appendChild($dom->createElement('valRetAir', number_format((float)($retencion->valRetAir ?? 0), 2, '.', '')));
                    }
                }

                if (!empty($factura->detallesRetencion)) {
                    $primerRetencion = $factura->detallesRetencion[0];
                    $serieRet = trim($primerRetencion->SerieRet ?? '');
                    $ptoEmiRet = trim($primerRetencion->PtoEmiRet ?? '');
                    $noReten = trim($primerRetencion->NoReten ?? '');
                    $autoriRet = trim($primerRetencion->AutoriRet ?? '');
                    $fchRete = trim($primerRetencion->FchRete ?? '');

                    // Solo agregamos la sección si todos los campos de la retención están llenos
                    if ($serieRet !== '' && $ptoEmiRet !== '' && $noReten !== '' && $autoriRet !== '' && $fchRete !== '') {
                        $detalleCompras->appendChild($dom->createElement('estabRetencion1', $serieRet));
                        $detalleCompras->appendChild($dom->createElement('ptoEmiRetencion1', $ptoEmiRet));
                        $detalleCompras->appendChild($dom->createElement('secRetencion1', $noReten));
                        $detalleCompras->appendChild($dom->createElement('autRetencion1', $autoriRet));
                        $detalleCompras->appendChild($dom->createElement('fechaEmiRet1', $fchRete));
                    }
                }

                // ==========================================
                // REGLA DE REEMBOLSOS 
                // ==========================================
                if (!empty($factura->detallesReembolso)) {
                    $reembolsosNode = $dom->createElement('reembolsos');
                    $detalleCompras->appendChild($reembolsosNode);

                    foreach ($factura->detallesReembolso as $reembolso) {
                        $justificativo = $dom->createElement('reembolso');
                        $reembolsosNode->appendChild($justificativo);

                        $justificativo->appendChild($dom->createElement('tipoComprobanteReemb', trim($reembolso->tipoComprobanteReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('tpIdProvReemb', trim($reembolso->tpIdProvReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('idProvReemb', trim($reembolso->idProvReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('establecimientoReemb', trim($reembolso->establecimientoReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('puntoEmisionReemb', trim($reembolso->puntoEmisionReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('secuencialReemb', trim($reembolso->secuencialReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('fechaEmisionReemb', trim($reembolso->fechaEmisionReemb ?? '')));
                        $justificativo->appendChild($dom->createElement('autorizacionReemb', trim($reembolso->autorizacionReemb ?? '')));

                        // Bases de los reembolsos
                        $justificativo->appendChild($dom->createElement('baseImponibleReemb', number_format((float)($reembolso->baseImponible ?? 0), 2, '.', '')));
                        $justificativo->appendChild($dom->createElement('baseImpGravReemb', number_format((float)($reembolso->baseImpGrav ?? 0), 2, '.', '')));
                        $justificativo->appendChild($dom->createElement('baseNoGraIvaReemb', number_format((float)($reembolso->baseNoGraIva ?? 0), 2, '.', '')));
                        $justificativo->appendChild($dom->createElement('baseImpExeReemb', number_format((float)($reembolso->baseImpExe ?? 0), 2, '.', '')));
                        $justificativo->appendChild($dom->createElement('montoIceRemb', number_format((float)($reembolso->montoIce ?? 0), 2, '.', '')));
                        $justificativo->appendChild($dom->createElement('montoIvaRemb', number_format((float)($reembolso->montoIva ?? 0), 2, '.', '')));
                    }
                }

                // ==========================================
                // MODIFICADOS
                // ==========================================
                if (!empty(trim($factura->docModificado ?? ''))) {
                    $docModificadoFormateado = sprintf('%02d', intval(trim($factura->docModificado)));

                    $detalleCompras->appendChild($dom->createElement('docModificado', $docModificadoFormateado));
                    $detalleCompras->appendChild($dom->createElement('estabModificado', trim($factura->estabModificado ?? '')));
                    $detalleCompras->appendChild($dom->createElement('ptoEmiModificado', trim($factura->ptoEmiModificado ?? '')));
                    $detalleCompras->appendChild($dom->createElement('secModificado', trim($factura->secModificado ?? '')));
                    $detalleCompras->appendChild($dom->createElement('autModificado', trim($factura->autModificado ?? '')));
                }
            }

            // Ventas
            $ventasNode = $dom->createElement('ventas');
            $iva->appendChild($ventasNode);

            $ventasEstablecimientoNode = $dom->createElement('ventasEstablecimiento');
            $iva->appendChild($ventasEstablecimientoNode);

            $ventaEstNode = $dom->createElement('ventaEst');
            $ventasEstablecimientoNode->appendChild($ventaEstNode);

            $ventaEstNode->appendChild($dom->createElement('codEstab', '001'));
            $ventaEstNode->appendChild($dom->createElement('ventasEstab', '0.00'));
            $ventaEstNode->appendChild($dom->createElement('ivaComp', '0.00'));

            // 7. Retornar en un JSON estructurado para compatibilidad nativa con Angular HttpClient
            $xmlString = $dom->saveXML();
            return response()->json([
                'success' => true,
                'xml' => $xmlString
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error crítico al estructurar el XML: ' . $e->getMessage()
            ], 500);
        }
    }

    public function actualizarAutorizacionRetencion(Request $request)
    {
        $request->validate([
            'empresa_id'    => 'required|integer',
            'id_fila'       => 'required|string',
            'autretencion1' => 'required|string|size:49|regex:/^[0-9]{49}$/',
        ]);

        $empresaId = (int)$request->input('empresa_id');
        $idFila = trim($request->input('id_fila'));
        $autRetencion = trim($request->input('autretencion1'));

        $this->configurarConexionDinamica($empresaId);

        try {
            $affected = DB::connection('dynamic')
                ->table('SGI_Sri_Compras')
                ->whereRaw("id_fila = CAST(? AS uniqueidentifier)", [$idFila])
                ->update([
                    'autretencion1' => $autRetencion
                ]);

            if ($affected === 0) {
                // Si la fila existe pero el valor no cambió, Laravel update devuelve 0.
                // Verificamos si realmente existe el registro para dar un mensaje adecuado.
                $existe = DB::connection('dynamic')
                    ->table('SGI_Sri_Compras')
                    ->whereRaw("id_fila = CAST(? AS uniqueidentifier)", [$idFila])
                    ->exists();

                if (!$existe) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se encontró el registro de compra.'
                    ], 404);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'La autorización de retención ya tiene ese valor o no se realizaron cambios.'
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Autorización de retención actualizada con éxito.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la autorización: ' . $e->getMessage()
            ], 500);
        }
    }
}

