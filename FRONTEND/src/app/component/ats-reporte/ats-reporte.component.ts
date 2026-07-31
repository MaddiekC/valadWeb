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

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarCatalogo();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['atsData'] && this.catalogo.length > 0) {
      this.generarReporte();
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
        }
      },
      error: (err) => {
        this.cargandoCatalogo = false;
        console.error('Error al cargar catálogo de retenciones:', err);
      }
    });
  }

  imprimir(): void {
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
}
