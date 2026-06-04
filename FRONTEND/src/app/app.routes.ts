import { Routes } from '@angular/router';
import { MainComponent } from './index/main/main.component';
import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./component/menu/menu.component').then(m => m.MenuComponent),
        data: { title: 'Menu' }
      },
      {
        path: 'ordp-cheques',
        loadComponent: () => import('./component/ordp-cheques/ordp-cheques.component').then(m => m.OrdpChequesComponent),
        data: { title: 'Ordp-Cheques' }
      },
      {
        path: 'ordp-transacciones',
        loadComponent: () => import('./component/ordp-transacciones/ordp-transacciones.component').then(m => m.OrdpTransaccionesComponent),
        data: { title: 'Ordp-Transacciones' }
      },
      {
        path: 'usuario',
        loadComponent: () => import('./component/usuario/usuario.component').then(m => m.UsuarioComponent),
        data: { title: 'Usuarios' }
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: { title: 'Página no encontrada' }
  }
];
