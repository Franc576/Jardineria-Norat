import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AvisoLegalComponent } from './pages/aviso-legal/aviso-legal.component';
import { PoliticaPrivacidadComponent } from './pages/politica-privacidad/politica-privacidad.component';
import { PoliticaCookiesComponent } from './pages/politica-cookies/politica-cookies.component';
import { AccesibilidadComponent } from './pages/accesibilidad/accesibilidad.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'aviso-legal', component: AvisoLegalComponent },
  { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
  { path: 'politica-cookies', component: PoliticaCookiesComponent },
  { path: 'accesibilidad', component: AccesibilidadComponent },
  { path: '**', redirectTo: '' }
];
