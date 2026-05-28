import { Component } from '@angular/core';

@Component({
  selector: 'app-aviso-legal',
  standalone: true,
  templateUrl: './aviso-legal.component.html',
  styles: [`
    .legal-page-container { padding: 8rem 5% 6rem; background: #ffffff; min-height: 70vh; }
    .legal-content { max-width: 900px; margin: 0 auto; color: #212529; }
    .legal-content h1 { font-size: 2.5rem; color: #1b4332; margin-bottom: 2rem; border-bottom: 3px solid #52b788; padding-bottom: 0.5rem; display: inline-block; }
    .legal-content p { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1.5rem; }
  `]
})
export class AvisoLegalComponent {}
