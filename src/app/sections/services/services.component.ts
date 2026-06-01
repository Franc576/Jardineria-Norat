import { Component } from '@angular/core';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [ScrollPlantsComponent, TranslateModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {}
