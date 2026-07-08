import { Component, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../../auth/authservice.service';
import Swal from 'sweetalert2';
import { HasPermissionDirective } from '../../services/has-permission.directive';
import { forkJoin } from 'rxjs';

// bootstrap is loaded globally (from Bootstrap JS). Declare for TypeScript.
declare const bootstrap: any;

interface Cheque {
  id_fila: number;
  num_comp: string;
  fecha_pago: string;
  beneficiario: string;
  concepto: string;
  valor: number;
  nro_cuenta: string;
  ruc: string;
}

@Component({
  selector: 'app-ordp-cheques',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './ordp-cheques.component.html',
  styleUrl: './ordp-cheques.component.css'
})
export class OrdpChequesComponent implements OnInit, AfterViewInit {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

  username: string = '';
  
  empresas: any[] = [];
  empresaSeleccionada: number = 0;
  filtroBusqueda: string = '';
  
  todosLosCheques: Cheque[] = [];
  chequesFiltrados: Cheque[] = [];
  
  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  errorMensajeNuevo: string = '';
  clearError() {
    this.errorMensajeNuevo = '';
  }

  @ViewChild('miModal') miModalEl!: ElementRef<HTMLDivElement>;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarEmpresas();
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
          this.cargarCheques();
        }
      },
      error: (err) => {
        console.error('Error al cargar empresas', err);
      }
    });
  }

  cargarCheques(): void {
    if (!this.empresaSeleccionada) return;
    this.apiService.getPagosCheques(this.empresaSeleccionada).subscribe({
      next: (data: Cheque[]) => {
        this.todosLosCheques = data;
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error al cargar cheques', err);
        this.todosLosCheques = [];
        this.chequesFiltrados = [];
      }
    });
  }

  aplicarFiltros(): void {
    const query = this.filtroBusqueda ? this.filtroBusqueda.toLowerCase().trim() : '';
    if (!query) {
      this.chequesFiltrados = [...this.todosLosCheques];
    } else {
      this.chequesFiltrados = this.todosLosCheques.filter(c => {
        const numComp = c.num_comp ? String(c.num_comp).toLowerCase() : '';
        const beneficiario = c.beneficiario ? String(c.beneficiario).toLowerCase() : '';
        const nroCuenta = c.nro_cuenta ? String(c.nro_cuenta).toLowerCase() : '';
        const ruc = c.ruc ? String(c.ruc).toLowerCase() : '';
        
        return numComp.includes(query) ||
               beneficiario.includes(query) ||
               nroCuenta.includes(query) ||
               ruc.includes(query);
      });
    }
    this.paginaActual = 1; // Resetear paginación al filtrar
  }

  onEmpresaChange(): void {
    this.cargarCheques();
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl: Element) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
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
}
