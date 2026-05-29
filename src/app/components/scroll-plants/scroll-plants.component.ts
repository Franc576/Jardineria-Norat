import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-scroll-plants',
  standalone: true,
  templateUrl: './scroll-plants.component.html',
  styleUrl: './scroll-plants.component.css',
})
export class ScrollPlantsComponent {
  @Input() section: 'about' | 'services' | 'flora' | 'contact' = 'about';
}
