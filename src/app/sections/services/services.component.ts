import { Component } from '@angular/core';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [ScrollPlantsComponent, TranslateModule, RouterLink],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {}
