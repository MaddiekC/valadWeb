import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

//import { EncryptionService } from './encryption.service';
export interface ParametrosAts {
  empresa_id: number | string;
  mes: string;    // '06'
  anio: string;   // '2026'
  accion: 'vista_previa' | 'generar_xml';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {
  }

  //-----Empresas--------//
  getEmpresas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/empresas`);
  }
  getEmpresa(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/empresas/${id}`);
  }

  //-----Cheques--------//
  getPagosCheques(empresaId?: number): Observable<any> {
    const url = empresaId ? `${this.baseUrl}/pagosCheques?empresa_id=${empresaId}` : `${this.baseUrl}/pagosCheques`;
    return this.http.get(url);
  }

  //-----ATS--------//
  getAts(ats: ParametrosAts): Observable<any> {
    return this.http.post(`${this.baseUrl}/ats/procesar`, ats);
  }

  //-----USUARIOS-------//
  getUsuarios(): Observable<any> {
    return this.http.get(`${this.baseUrl}/usuarios`);
  }
  postUsuario(usuario: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios`, usuario);
  }
  putUsuarioInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/usuarios/${id}/inactive`, {});
  }
  getTransacciones(): Observable<any> {
    return this.http.get(`${this.baseUrl}/transacciones`);
  }
  getUserTransacciones(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/usuarios/${id}/transacciones`);
  }
  updateUserTransacciones(id: number, transaccionIds: number[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/usuarios/${id}/transacciones`, { transacciones: transaccionIds });
  }

  actualizarAutorizacionRetencion(params: {
    empresa_id: string | number;
    id_fila: string;
    autretencion1: string;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/ats/retencion/autorizacion`, params);
  }
}