import { Component, Input, OnInit } from '@angular/core';

interface Petal {
  type: 'poppy' | 'jasmine' | 'lavender';
  left: string;
  fallDuration: string;
  fallDelay: string;
  swayDuration: string;
  scale: string;
  rotation: string;
}

@Component({
  selector: 'app-scroll-plants',
  standalone: true,
  templateUrl: './scroll-plants.component.html',
  styleUrl: './scroll-plants.component.css',
})
export class ScrollPlantsComponent implements OnInit {
  @Input() section: 'about' | 'services' | 'flora' | 'contact' = 'about';
  
  petals: Petal[] = [];

  ngOnInit() {
    this.generatePetals();
  }

  generatePetals() {
    // Definimos los tres tipos solicitados
    const types: ('poppy' | 'jasmine' | 'lavender')[] = ['poppy', 'jasmine', 'lavender'];
    
    // 25 pétalos dan un efecto rico pero sutil, sin saturar
    const petalCount = 25; 

    for (let i = 0; i < petalCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      
      // Distribuir a lo largo de todo el ancho (0% a 100%)
      const left = Math.random() * 100; 
      
      // Velocidad de caída variada (entre 10s y 25s)
      const fallDuration = 10 + Math.random() * 15; 
      
      // Delay negativo para que algunos ya estén a mitad de pantalla al cargar
      const fallDelay = -(Math.random() * 25); 
      
      // Velocidad del bamboleo lateral (3s a 7s)
      const swayDuration = 3 + Math.random() * 4; 
      
      // Escala sutil para dar sensación de profundidad
      const scale = 0.5 + Math.random() * 0.7; 
      
      // Rotación inicial aleatoria
      const rotation = Math.random() * 360; 

      this.petals.push({
        type,
        left: `${left}%`,
        fallDuration: `${fallDuration}s`,
        fallDelay: `${fallDelay}s`,
        swayDuration: `${swayDuration}s`,
        scale: `${scale}`,
        rotation: `${rotation}deg`
      });
    }
  }
}
