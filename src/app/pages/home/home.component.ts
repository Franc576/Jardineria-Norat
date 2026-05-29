import { Component } from '@angular/core';
import { HeroComponent } from '../../sections/hero/hero.component';
import { AboutComponent } from '../../sections/about/about.component';
import { ServicesComponent } from '../../sections/services/services.component';
import { FloraComponent } from '../../sections/flora/flora.component';
import { ContactComponent } from '../../sections/contact/contact.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    AboutComponent,
    ServicesComponent,
    FloraComponent,
    ContactComponent,
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent {}
