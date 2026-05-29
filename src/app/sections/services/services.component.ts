import { Component } from '@angular/core';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [ScrollPlantsComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent {}
