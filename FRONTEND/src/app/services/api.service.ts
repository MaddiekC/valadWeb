import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

//import { EncryptionService } from './encryption.service';
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
  getPagosCheques(): Observable<any> {
    return this.http.get(`${this.baseUrl}/pagosCheques`);
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
}