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
  id_fila?: string;
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
  editandoAut: boolean = false;
  tempAut: string = '';
  cargandoEdicion: boolean = false;

  empresas: any[] = [];
  empresaSeleccionada: string = '';
  filtroBusqueda: string = '';
  filtroTipoId: string = '';
  filtroTipoComp: string = '';
  filtroCodRetencion: string = '';
  filtroCodSustento: string = '';
  filtroAutRetMalFormed: boolean = false;

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
    this.atsData = [];
    this.atsDataFiltrada = [];
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
        this.filtroAutRetMalFormed = false;
        
        this.atsDataFiltrada = lista;
        console.log('ATS cargados:', this.atsData);
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar ATS', err);
        this.cargando = false;
        this.atsData = [];
        this.atsDataFiltrada = [];
        const errMsg = err.error?.message || err.message || 'Error de comunicación con el servidor';
        Swal.fire('Error', `No se pudo cargar la información del ATS`);
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

    if (this.filtroAutRetMalFormed) {
      list = list.filter(ats => this.isAutRetMalformed(ats));
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
    this.editandoAut = false;
    this.tempAut = '';
    if (this.detallesModalInstance) {
      this.detallesModalInstance.show();
    }
  }

  cerrarDetallesModal(): void {
    if (this.detallesModalInstance) {
      this.detallesModalInstance.hide();
    }
  }

  activarEdicion(): void {
    if (this.facturaSeleccionada && this.facturaSeleccionada.detallesRetencion && this.facturaSeleccionada.detallesRetencion.length > 0) {
      this.tempAut = this.facturaSeleccionada.detallesRetencion[0].AutoriRet || '';
      this.editandoAut = true;
    }
  }

  cancelarEdicion(): void {
    this.editandoAut = false;
    this.tempAut = '';
  }

  guardarEdicion(): void {
    if (!this.facturaSeleccionada || !this.facturaSeleccionada.id_fila) {
      Swal.fire('Error', 'No se puede identificar el registro para actualizar', 'error');
      return;
    }

    if (!this.tempAut.trim()) {
      Swal.fire('Atención', 'El número de autorización no puede estar vacío', 'warning');
      return;
    }

    const cleanAut = this.tempAut.trim();
    if (!/^\d{49}$/.test(cleanAut)) {
      Swal.fire('Atención', 'La autorización de retención debe tener exactamente 49 dígitos numéricos', 'warning');
      return;
    }

    this.cargandoEdicion = true;

    const params = {
      empresa_id: this.empresaSeleccionada,
      id_fila: this.facturaSeleccionada.id_fila,
      autretencion1: this.tempAut.trim()
    };

    this.apiService.actualizarAutorizacionRetencion(params).subscribe({
      next: (res) => {
        this.cargandoEdicion = false;
        if (res && res.success) {
          Swal.fire('Éxito', 'Autorización de retención actualizada correctamente', 'success');
          
          // Actualizar localmente el objeto facturaSeleccionada
          if (this.facturaSeleccionada && this.facturaSeleccionada.detallesRetencion && this.facturaSeleccionada.detallesRetencion.length > 0) {
            this.facturaSeleccionada.detallesRetencion[0].AutoriRet = this.tempAut.trim();
          }

          // También debemos actualizarlo en el listado original atsData para que se refresque en la tabla principal
          const originalItem = this.atsData.find(item => item.id_fila === this.facturaSeleccionada?.id_fila);
          if (originalItem && originalItem.detallesRetencion && originalItem.detallesRetencion.length > 0) {
            originalItem.detallesRetencion[0].AutoriRet = this.tempAut.trim();
          }

          // Re-aplicar filtros para actualizar la vista principal
          this.aplicarFiltros();

          this.editandoAut = false;
        } else {
          Swal.fire('Error', res.message || 'No se pudo actualizar la autorización', 'error');
        }
      },
      error: (err) => {
        this.cargandoEdicion = false;
        console.error('Error al actualizar autorización', err);
        const msg = err.error?.message || 'Error de comunicación con el servidor';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  isAutRetMalformed(atsItem: ats): boolean {
    if (!atsItem.detallesRetencion || atsItem.detallesRetencion.length === 0) {
      return false;
    }
    const ret = atsItem.detallesRetencion[0];
    const noReten = ret.NoReten ? ret.NoReten.trim() : '';
    
    // Si no hay secuencial de retención, no validamos
    if (!noReten) {
      return false;
    }

    const aut = ret.AutoriRet ? ret.AutoriRet.trim() : '';
    const dateStr = ret.FchRete ? ret.FchRete.trim() : '';

    // Si no tiene exactamente 49 dígitos numéricos, se considera mala
    if (!/^\d{49}$/.test(aut)) {
      return true;
    }

    // Si tiene número de retención pero no tiene fecha, está mal formada
    if (!dateStr) {
      return true;
    }

    // Convertir dateStr a formato DDMMYYYY
    let expectedPrefix = '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      expectedPrefix = dateStr.replace(/\//g, '');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      expectedPrefix = parts[2] + parts[1] + parts[0];
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      expectedPrefix = dateStr.replace(/-/g, '');
    } else {
      const digitsOnly = dateStr.replace(/\D/g, '');
      if (digitsOnly.length === 8) {
        expectedPrefix = digitsOnly;
      }
    }

    if (!expectedPrefix || expectedPrefix.length !== 8) {
      return true; // Formato de fecha no válido o irreconocible
    }

    // Si la autorización no comienza con la fecha esperada, está mal formada
    return !aut.startsWith(expectedPrefix);
  }
}
