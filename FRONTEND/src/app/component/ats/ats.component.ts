import { Component, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ParametrosAts, ApiService } from '../../services/api.service';

declare const bootstrap: any;

interface RetencionDetalle {
  codRetAir: string;
  baseImpAir: number;
  porcentajeAir: number;
  valRetAir: number;
  SerieRet?: string;
  PtoEmiRet?: string;
  NoReten?: string;
  AutoriRet?: string;
  FchRete?: string;
}

interface ReembolsoDetalle {
  tipoComprobanteReemb: string;
  tpIdProvReemb: string;
  idProvReemb: string;
  establecimientoReemb: string;
  puntoEmisionReemb: string;
  secuencialReemb: string;
  fechaEmisionReemb: string;
  autorizacionReemb: string;
  baseImponible: number;
  baseImpGrav: number;
  baseNoGraIva: number;
  baseImpExe: number;
  montoIce: number;
  montoIva: number;
}

interface ats {
  codSustento: string;
  TipoIDProveedor: string;
  TipoID: string;
  idProv: string;
  razonSocial: string;
  tipoComprobante: string;
  establecimiento: string;
  parteRel: string;
  puntoEmision: string;
  secuencial: string;
  fechaEmision: string;
  fechaRegistro: string;
  autorizacion: string;
  baseNoGraIva: number;
  baseImponible: number;
  baseimpgrav: number;
  montoIva: number;
  baseImpExe: number;
  montoIce: number;
  valorRetBien10: number;
  valorRetBienes: number;
  valorRetRenta: number;
  valRetServ20: number;
  valRetServ50: number;
  valorRetServicios: number;
  valorRetServ100: number;
  valRetServ100: number;
  formaPago01: string;
  detallesRetencion?: RetencionDetalle[];
  detallesReembolso?: ReembolsoDetalle[];
}

@Component({
  selector: 'app-ats',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './ats.component.html',
  styleUrl: './ats.component.css'
})
export class AtsComponent {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('detallesModal') detallesModal!: ElementRef;
  private modalInstance: any;
  private detallesModalInstance: any;

  facturaSeleccionada: ats | null = null;
  cargando: boolean = false;
  username: string = '';

  empresas: any[] = [];
  empresaSeleccionada: string = '';
  filtroBusqueda: string = '';
  filtroTipoId: string = '';
  filtroTipoComp: string = '';
  filtroCodRetencion: string = '';
  filtroCodSustento: string = '';

  get uniqueCodSustento(): string[] {
    return [...new Set(this.atsData.map(d => d.codSustento).filter(Boolean))].sort();
  }

  get uniqueTipoId(): string[] {
    return [...new Set(this.atsData.map(d => d.TipoID).filter(Boolean))].sort();
  }

  get uniqueTipoComp(): string[] {
    return [...new Set(this.atsData.map(d => d.tipoComprobante).filter(Boolean))].sort();
  }

  get uniqueCodRetencion(): string[] {
    const codes = new Set<string>();
    this.atsData.forEach(ats => {
      if (ats.detallesRetencion) {
        ats.detallesRetencion.forEach(det => {
          if (det.codRetAir) {
            codes.add(det.codRetAir);
          }
        });
      }
    });
    return [...codes].sort();
  }

  get totalBaseImponible(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => acc + (Number(curr.baseImponible) || 0), 0);
  }

  get totalBaseImpGrav(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => acc + (Number(curr.baseimpgrav) || 0), 0);
  }

  get totalMontoIva(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => acc + (Number(curr.montoIva) || 0), 0);
  }

  get totalRetBienes(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => 
      acc + (Number(curr.valorRetBien10) || 0) + (Number(curr.valorRetBienes) || 0)
    , 0);
  }

  get totalRetServicios(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => 
      acc + (Number(curr.valRetServ20) || 0) + (Number(curr.valRetServ50) || 0) + (Number(curr.valorRetServicios) || 0)
    , 0);
  }

  get totalRetIva100(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => acc + (Number(curr.valRetServ100) || 0), 0);
  }

  get totalBaseImpAir(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => {
      if (!curr.detallesRetencion) return acc;
      const sumAir = curr.detallesRetencion.reduce((sum, det) => {
        if (this.filtroCodRetencion && det.codRetAir !== this.filtroCodRetencion) {
          return sum;
        }
        return sum + (Number(det.baseImpAir) || 0);
      }, 0);
      return acc + sumAir;
    }, 0);
  }

  get totalValRetAir(): number {
    return this.atsDataFiltrada.reduce((acc, curr) => {
      if (!curr.detallesRetencion) return acc;
      const sumAir = curr.detallesRetencion.reduce((sum, det) => {
        if (this.filtroCodRetencion && det.codRetAir !== this.filtroCodRetencion) {
          return sum;
        }
        return sum + (Number(det.valRetAir) || 0);
      }, 0);
      return acc + sumAir;
    }, 0);
  }

  atsData: ats[] = [];
  atsDataFiltrada: ats[] = [];

  paginaActual: number = 1
  itemsPorPagina: number = 15;

  errorMensajeNuevo: string = '';
  clearError() {
    this.errorMensajeNuevo = '';
  }
  mesSeleccionado: string = String(new Date().getMonth() + 1).padStart(2, '0');
  anioSeleccionado: string = String(new Date().getFullYear());
  anios: string[] = [];
  meses = [
    { valor: '01', nombre: 'Enero' },
    { valor: '02', nombre: 'Febrero' },
    { valor: '03', nombre: 'Marzo' },
    { valor: '04', nombre: 'Abril' },
    { valor: '05', nombre: 'Mayo' },
    { valor: '06', nombre: 'Junio' },
    { valor: '07', nombre: 'Julio' },
    { valor: '08', nombre: 'Agosto' },
    { valor: '09', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' }
  ];

  constructor(private apiService: ApiService) {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.anios.push(String(currentYear - i));
    }
  }
  ngOnInit(): void {
    this.cargarEmpresas();
  }

  private obtenerParametrosAts(accion: 'vista_previa' | 'generar_xml' = 'vista_previa'): ParametrosAts {
    return {
      empresa_id: this.empresaSeleccionada,
      mes: this.mesSeleccionado,
      anio: this.anioSeleccionado,
      accion: accion
    };
  }

  cargarEmpresas(): void {
    this.apiService.getEmpresas().subscribe({
      next: (data) => {
        // Filtrar empresas que tengan Base_sqlServer definida
        this.empresas = data.filter((e: any) => e.Base_sqlServer && e.Base_sqlServer.trim() !== '');

        if (this.empresas.length > 0) {
          // Buscamos si existe alguna base con el nombre VALAD para ponerla por defecto
          const defaultEmp = this.empresas.find(e => e.Base_sqlServer.toLowerCase().includes('valad'))
            || this.empresas[0];
          this.empresaSeleccionada = defaultEmp.idEmpresa;
          this.cargarAts();
        }
      },
      error: (err) => {
        console.error('Error al cargar empresas', err);
      }
    });
  }

  cargarAts(): void {
    if (!this.empresaSeleccionada) {
      return;
    }
    const parametros = this.obtenerParametrosAts();
    console.log('Cargando ATS con parámetros:', parametros);
    this.cargando = true;

    this.apiService.getAts(parametros).subscribe({
      next: (res) => {
        const lista = res && res.success ? res.data : (Array.isArray(res) ? res : []);
        this.atsData = lista;
        
        // Reset sub-filters
        this.filtroTipoId = '';
        this.filtroTipoComp = '';
        this.filtroCodRetencion = '';
        this.filtroCodSustento = '';
        
        this.atsDataFiltrada = lista;
        console.log('ATS cargados:', this.atsData);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar ATS', err);
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    let list = this.atsData;

    if (this.filtroBusqueda.trim()) {
      const filterText = this.filtroBusqueda.toLowerCase();
      list = list.filter((ats) => {
        return (
          (ats.idProv && ats.idProv.toLowerCase().includes(filterText)) ||
          (ats.secuencial && ats.secuencial.toLowerCase().includes(filterText)) ||
          (ats.autorizacion && ats.autorizacion.toLowerCase().includes(filterText)) ||
          (ats.establecimiento && ats.establecimiento.toLowerCase().includes(filterText)) ||
          (ats.razonSocial && ats.razonSocial.toLowerCase().includes(filterText))
        );
      });
    }

    if (this.filtroTipoId) {
      list = list.filter(ats => ats.TipoID === this.filtroTipoId);
    }

    if (this.filtroTipoComp) {
      list = list.filter(ats => ats.tipoComprobante === this.filtroTipoComp);
    }

    if (this.filtroCodRetencion) {
      list = list.filter(ats => 
        ats.detallesRetencion && 
        ats.detallesRetencion.some(det => det.codRetAir === this.filtroCodRetencion)
      );
    }

    if (this.filtroCodSustento) {
      list = list.filter(ats => ats.codSustento === this.filtroCodSustento);
    }

    this.atsDataFiltrada = list;
    this.paginaActual = 1;
  }
  onEmpresaChange(): void {
    this.cargarAts();
  }

  onFechaChange(): void {
    this.cargarAts();
  }

  generarXml(): void {
    if (!this.empresaSeleccionada) {
      Swal.fire('Error', 'Seleccione una empresa primero', 'error');
      return;
    }
    const parametros = this.obtenerParametrosAts('generar_xml');
    console.log('Generando XML con parámetros:', parametros);
    this.cargando = true;

    this.apiService.getAts(parametros).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response && response.success === false) {
          Swal.fire('Error', response.message || 'Error al generar el XML', 'error');
        } else {
          const xmlContent = response.xml || response.data || (typeof response === 'string' ? response : JSON.stringify(response));
          
          const blob = new Blob([xmlContent], { type: 'application/xml' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ATS_${this.mesSeleccionado}_${this.anioSeleccionado}.xml`;
          link.click();
          window.URL.revokeObjectURL(url);
          
          Swal.fire('Éxito', 'XML generado y descargado correctamente', 'success');
        }
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al generar XML', err);
        const errMsg = err.error?.message || 'Error de comunicación con el servidor';
        Swal.fire('Error', errMsg, 'error');
      }
    });
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    this.detallesModalInstance = new bootstrap.Modal(this.detallesModal.nativeElement);
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl: Element) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  openConfirmModal(id: number) {
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }

  startEdit(id: number) {
    // Método para iniciar edición
  }

  verDetallesFactura(atsItem: ats): void {
    this.facturaSeleccionada = atsItem;
    if (this.detallesModalInstance) {
      this.detallesModalInstance.show();
    }
  }

  cerrarDetallesModal(): void {
    if (this.detallesModalInstance) {
      this.detallesModalInstance.hide();
    }
  }
}
