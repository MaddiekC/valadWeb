import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
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
  banco_tarjeta: string;
  nro_cuenta: string;
  documento: string;
  fecha_pago: string;
  valor: number;
}

@Component({
  selector: 'app-ordp-cheques',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './ordp-cheques.component.html',
  styleUrl: './ordp-cheques.component.css'
})
export class OrdpChequesComponent {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

  username: string = '';
  chequesFiltrados: Cheque[] = [];
  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  errorMensajeNuevo: string = '';
  clearError() {
    this.errorMensajeNuevo = '';
  }

  @ViewChild('miModal') miModalEl!: ElementRef<HTMLDivElement>;

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
    //this.eliminarBosque(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }

  startEdit(id: number) {
    // const original = this.listaBosques.find(s => s.id === id);
    // if (!original) return;

    // // Crear una copia para editar
    // this.bosqueEditando = { ...original, seccion_id: Number(original.seccion_id) };
    // const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    //modal.show();
  }

}
