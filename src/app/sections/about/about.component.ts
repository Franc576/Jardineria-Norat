import { Component } from '@angular/core';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ScrollPlantsComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {}
