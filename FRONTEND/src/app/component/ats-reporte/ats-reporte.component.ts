import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

export interface ReporteItem {
  concepto: string;
  codigo: string;
  baseImponible: number;
  valorRetenido: number;
  esSubtitulo?: boolean;
}

export interface ReporteGrupo {
  titulo: string;
  items: ReporteItem[];
}

export interface PurchaseSummaryDetail {
  tipoComprobante: string;
  baseImp0: number;
  baseImpGrava: number;
  baseNoObjIva: number;
  montoIva: number;
}

export interface PurchaseSustentoGroup {
  codSustento: string;
  items: PurchaseSummaryDetail[];
}

@Component({
  selector: 'app-ats-reporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ats-reporte.component.html',
  styleUrl: './ats-reporte.component.css'
})
export class AtsReporteComponent implements OnInit, OnChanges {
  @Input() atsData: any[] = [];
  @Input() mes: string = '';
  @Input() anio: string = '';
  @Input() empresaNombre: string = '';

  catalogo: any[] = [];
  grupos: ReporteGrupo[] = [];
  totalGeneralBase: number = 0;
  totalGeneralRetenido: number = 0;
  cargandoCatalogo: boolean = false;
  fechaImpresion: string = '';

  // Purchase summary fields
  reporteActivo: 'retenciones' | 'compras' = 'retenciones';
  resumenCompras: PurchaseSustentoGroup[] = [];
  totalCompraBase0: number = 0;
  totalCompraBaseGrava: number = 0;
  totalCompraBaseNoObj: number = 0;
  totalCompraMontoIva: number = 0;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarCatalogo();
    this.actualizarFechaImpresion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['atsData']) {
      if (this.catalogo.length > 0) {
        this.generarReporte();
      }
      this.generarResumenCompras();
    }
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo = true;
    this.apiService.getCatalogoRetenciones().subscribe({
      next: (res) => {
        this.cargandoCatalogo = false;
        if (res && res.success) {
          this.catalogo = res.data || [];
          this.generarReporte();
          this.generarResumenCompras();
        }
      },
      error: (err) => {
        this.cargandoCatalogo = false;
        console.error('Error al cargar catálogo de retenciones:', err);
      }
    });
  }

  actualizarFechaImpresion(): void {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mesNum = String(now.getMonth() + 1).padStart(2, '0');
    const anioNum = now.getFullYear();
    const horas = String(now.getHours()).padStart(2, '0');
    const minutos = String(now.getMinutes()).padStart(2, '0');
    this.fechaImpresion = `${dia}/${mesNum}/${anioNum} ${horas}:${minutos}`;
  }

  imprimir(): void {
    this.actualizarFechaImpresion();
    window.print();
  }

  generarReporte(): void {
    if (this.catalogo.length === 0) return;

    // Estructuras para agrupación dinámica
    const mapaGrupos = new Map<string, Map<string, ReporteItem[]>>();
    const itemsSinSubtituloPorGrupo = new Map<string, ReporteItem[]>();
    const titulosOrdenados: string[] = [];
    const subtitulosOrdenadosPorGrupo = new Map<string, string[]>();

    // 1. Obtener la suma acumulada de las facturas agrupada por código AIR
    const acumuladoFacturas = new Map<string, { base: number, retenido: number }>();
    this.atsData.forEach(ats => {
      if (ats.detallesRetencion) {
        ats.detallesRetencion.forEach((det: any) => {
          if (det.codRetAir) {
            const cod = String(det.codRetAir).trim();
            const current = acumuladoFacturas.get(cod) || { base: 0, retenido: 0 };
            current.base += Number(det.baseImpAir) || 0;
            current.retenido += Number(det.valRetAir) || 0;
            acumuladoFacturas.set(cod, current);
          }
        });
      }
    });

    // 2. Procesar los registros del catálogo obtenidos de la base de datos
    this.catalogo.forEach(item => {
      const titulo = item.titulo_nombre ? item.titulo_nombre.trim() : 'SIN CATEGORÍA';
      const subtitulo = item.subtitulo_nombre ? item.subtitulo_nombre.trim() : '';
      const codigo = item.codigo ? String(item.codigo).trim() : '';
      const concepto = item.concepto ? item.concepto.trim() : '';

      // Buscar valores acumulados reales en la facturación del período
      const acum = acumuladoFacturas.get(codigo) || { base: 0, retenido: 0 };

      // Omitir si ambos son cero (Base Imponible y Valor Retenido)
      if ((Number(acum.base) || 0) === 0 && (Number(acum.retenido) || 0) === 0) {
        return;
      }

      // Registrar los títulos únicos respetando el orden del backend
      if (!titulosOrdenados.includes(titulo)) {
        titulosOrdenados.push(titulo);
      }

      const reporteItem: ReporteItem = {
        concepto: concepto,
        codigo: codigo,
        baseImponible: acum.base,
        valorRetenido: acum.retenido
      };

      if (subtitulo) {
        // Inicializar mapas para subtítulos
        if (!mapaGrupos.has(titulo)) {
          mapaGrupos.set(titulo, new Map<string, ReporteItem[]>());
        }
        const mapaSubtitulos = mapaGrupos.get(titulo)!;
        if (!mapaSubtitulos.has(subtitulo)) {
          mapaSubtitulos.set(subtitulo, []);
        }
        mapaSubtitulos.get(subtitulo)!.push(reporteItem);

        // Registrar orden de subtítulos en el grupo
        if (!subtitulosOrdenadosPorGrupo.has(titulo)) {
          subtitulosOrdenadosPorGrupo.set(titulo, []);
        }
        const listaSub = subtitulosOrdenadosPorGrupo.get(titulo)!;
        if (!listaSub.includes(subtitulo)) {
          listaSub.push(subtitulo);
        }
      } else {
        // Items que están directo bajo el grupo principal (sin subtítulo)
        if (!itemsSinSubtituloPorGrupo.has(titulo)) {
          itemsSinSubtituloPorGrupo.set(titulo, []);
        }
        itemsSinSubtituloPorGrupo.get(titulo)!.push(reporteItem);
      }
    });

    // 3. Ensamblar los grupos finales con la jerarquía correspondiente
    const structure: ReporteGrupo[] = [];
    titulosOrdenados.forEach(titulo => {
      const itemsGrupo: ReporteItem[] = [];

      // Si hay ítems sin subtítulo en este grupo (se muestran antes de los subtítulos)
      const itemsDirectos = itemsSinSubtituloPorGrupo.get(titulo) || [];
      itemsGrupo.push(...itemsDirectos);

      // Si hay sub-grupos (con subtítulos) bajo este título
      const mapaSubtitulos = mapaGrupos.get(titulo);
      const listaSub = subtitulosOrdenadosPorGrupo.get(titulo) || [];
      
      listaSub.forEach(subtitulo => {
        // Añadimos la fila separadora del subtítulo
        itemsGrupo.push({
          concepto: subtitulo,
          codigo: '',
          baseImponible: 0,
          valorRetenido: 0,
          esSubtitulo: true
        });

        // Añadimos los ítems que pertenecen a este subtítulo
        const itemsSub = mapaSubtitulos?.get(subtitulo) || [];
        itemsGrupo.push(...itemsSub);
      });

      structure.push({
        titulo: titulo,
        items: itemsGrupo
      });
    });

    // 4. Identificar códigos de facturas que no están en el catálogo (no clasificados)
    const codigosCatalogados = new Set<string>(
      this.catalogo.map(item => item.codigo ? String(item.codigo).trim() : '').filter(Boolean)
    );

    const otrasItems: ReporteItem[] = [];
    acumuladoFacturas.forEach((val, key) => {
      if (!codigosCatalogados.has(key)) {
        otrasItems.push({
          concepto: `Retención Código ${key}`,
          codigo: key,
          baseImponible: val.base,
          valorRetenido: val.retenido
        });
      }
    });

    if (otrasItems.length > 0) {
      structure.push({
        titulo: 'OTRAS RETENCIONES EN LA FUENTE',
        items: otrasItems
      });
    }

    this.grupos = structure;

    // Calcular totales generales del reporte
    this.totalGeneralBase = 0;
    this.totalGeneralRetenido = 0;
    this.grupos.forEach(grupo => {
      grupo.items.forEach(item => {
        if (!item.esSubtitulo) {
          this.totalGeneralBase += item.baseImponible;
          this.totalGeneralRetenido += item.valorRetenido;
        }
      });
    });
  }

  getTipoComprobanteDesc(code: string): string {
    const map: { [key: string]: string } = {
      '01': 'Factura',
      '02': 'Nota o Boleta de Venta',
      '03': 'Liquidación de Compra',
      '04': 'Nota de Crédito',
      '05': 'Nota de Débito',
      '07': 'Comprobante de Retención',
      '41': 'Comprobante de Reembolso',
      '43': 'Liquidación de Compra por Reembolso'
    };
    const cleanCode = String(code).trim().padStart(2, '0');
    return map[cleanCode] || 'Otro Comprobante';
  }

  getCodSustentoDesc(code: string): string {
    const map: { [key: string]: string } = {
      '01': 'Crédito Tributario para IVA (Costo/Gasto IR)',
      '02': 'Costo/Gasto para IR (Sin Crédito IVA)',
      '03': 'Activo Fijo (Con Crédito IVA)',
      '04': 'Costo/Gasto para IR (Sin Crédito IVA - Simplificado)',
      '05': 'Gastos de viaje, hospedaje y alimentación',
      '06': 'Inventario de materia prima / mercaderías',
      '07': 'Costo/Gasto no deducible',
      '08': 'Reembolso de Siniestros',
      '09': 'Reembolso por intermedio de operadores de turismo',
      '10': 'Distribución de dividendos'
    };
    const cleanCode = String(code).trim().padStart(2, '0');
    return map[cleanCode] || 'Otro Sustento';
  }

  generarResumenCompras(): void {
    const map = new Map<string, Map<string, PurchaseSummaryDetail>>();
    
    this.atsData.forEach(ats => {
      const codSust = ats.codSustento ? String(ats.codSustento).trim() : 'S/N';
      let tipoComp = ats.tipoComprobante ? String(ats.tipoComprobante).trim() : 'S/N';
      if (tipoComp !== 'S/N') {
        tipoComp = tipoComp.padStart(2, '0');
      }
      
      const base0 = Number(ats.baseImponible) || 0;
      const baseGrava = Number(ats.baseimpgrav) || 0;
      const baseNoObj = Number(ats.baseNoGraIva) || 0;
      const mIva = Number(ats.montoIva) || 0;
      
      if (!map.has(codSust)) {
        map.set(codSust, new Map<string, PurchaseSummaryDetail>());
      }
      
      const subMap = map.get(codSust)!;
      if (!subMap.has(tipoComp)) {
        subMap.set(tipoComp, {
          tipoComprobante: tipoComp,
          baseImp0: 0,
          baseImpGrava: 0,
          baseNoObjIva: 0,
          montoIva: 0
        });
      }
      
      const detail = subMap.get(tipoComp)!;
      detail.baseImp0 += base0;
      detail.baseImpGrava += baseGrava;
      detail.baseNoObjIva += baseNoObj;
      detail.montoIva += mIva;
    });
    
    const groups: PurchaseSustentoGroup[] = [];
    const sortedCodSustentos = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    
    sortedCodSustentos.forEach(codSust => {
      const subMap = map.get(codSust)!;
      const sortedDetails = Array.from(subMap.values()).sort((a, b) => 
        a.tipoComprobante.localeCompare(b.tipoComprobante)
      );
      
      groups.push({
        codSustento: codSust,
        items: sortedDetails
      });
    });
    
    this.resumenCompras = groups;
    
    // Totales
    this.totalCompraBase0 = 0;
    this.totalCompraBaseGrava = 0;
    this.totalCompraBaseNoObj = 0;
    this.totalCompraMontoIva = 0;
    
    this.resumenCompras.forEach(g => {
      g.items.forEach(item => {
        this.totalCompraBase0 += item.baseImp0;
        this.totalCompraBaseGrava += item.baseImpGrava;
        this.totalCompraBaseNoObj += item.baseNoObjIva;
        this.totalCompraMontoIva += item.montoIva;
      });
    });
  }
}
