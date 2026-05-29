import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';

/**
 * Componente que muestra la sección de flora con todas las fotos recuperadas.
 * Cada objeto del arreglo `plants` contiene el nombre de la planta y el
 * nombre del archivo de imagen (ubicado en `public/flora/`).
 */
@Component({
  selector: 'app-flora',
  templateUrl: './flora.component.html',
  styleUrl: './flora.component.css',
  standalone: true,
  imports: [CommonModule, ScrollPlantsComponent]
})
export class FloraComponent {
  /** Lista de plantas y sus imágenes clasificada por categoría */
  readonly plants = [
    { name: 'Adelfa', image: 'adelfadefloracion.jpg', description: 'Arbusto perenne muy resistente con flores de colores vivos, ideal para setos en climas mediterráneos.', category: 'Arbustos' },
    { name: 'Agapanto', image: 'agapato.webp', description: 'Planta ornamental de hermosas flores agrupadas en tonos azulados o blancos, perfecta para borduras.', category: 'Flores' },
    { name: 'Agave', image: 'agave.jpg', description: 'Suculenta de gran tamaño con hojas carnosas y espinosas, ideal para jardines de bajo mantenimiento.', category: 'Arbustos' },
    { name: 'Algarrobo', image: 'algarrobo.jpg', description: 'Árbol mediterráneo perenne que ofrece una sombra densa y produce vainas dulces comestibles.', category: 'Árboles' },
    { name: 'Buganvilla', image: 'bugambilla.webp', description: 'Arbusto trepador espectacular con brácteas de colores vibrantes y gran resistencia al sol.', category: 'Arbustos' },
    { name: 'Ciprés Totem', image: 'ciprestotem.webp', description: 'Árbol columnar de crecimiento vertical muy compacto, ideal para crear límites visuales elegantes.', category: 'Árboles' },
    { name: 'Jazmín Estrellado', image: 'jazminestrellado.jpg', description: 'Trepadora de follaje denso con delicadas flores blancas muy perfumadas que florecen en primavera.', category: 'Flores' },
    { name: 'Lantana', image: 'lantana.jpg', description: 'Arbusto rústico y florido cuyas flores cambian de color, atrayendo a mariposas y polinizadores.', category: 'Arbustos' },
    { name: 'Lavanda', image: 'lavanda.jpg', description: 'Planta aromática con flores de color violeta intenso, famosa por su fragancia relajante y sus propiedades.', category: 'Flores' },
    { name: 'Limonero', image: 'limonero.jpg', description: 'Árbol frutal cítrico que produce frutos ácidos y hojas muy aromáticas durante gran parte del año.', category: 'Árboles' },
    { name: 'Naranjo', image: 'naranjero.jpg', description: 'Árbol frutal clásico de azahar perfumado y hojas verde brillante, productor de deliciosas naranjas.', category: 'Árboles' },
    { name: 'Olivo', image: 'olivo.jpg', description: 'Árbol mediterráneo ancestral de hojas plateadas, conocido por su longevidad y la producción de aceitunas.', category: 'Árboles' },
    { name: 'Palmito', image: 'palmito.jpg', description: 'Palmera arbustiva nativa de la región mediterránea, muy resistente y de gran valor ornamental.', category: 'Arbustos' },
    { name: 'Romero', image: 'romero.jpg', description: 'Arbusto aromático perenne muy resistente, ideal para condimentar y con un follaje siempre verde.', category: 'Arbustos' },
    { name: 'Santolina', image: 'santolina.JPG', description: 'Pequeño arbusto compacto con hojas plateadas y abundantes flores amarillas en forma de botón.', category: 'Arbustos' },
    { name: 'Strelitzia', image: 'strelitzia.jpg', description: 'Planta exótica conocida como "ave del paraíso" debido a la forma y vivos colores de sus flores.', category: 'Flores' }
  ];

  /** Categorías para estructurar el catálogo */
  readonly categories = ['Arbustos', 'Flores', 'Árboles'];

  /** Obtiene las plantas que pertenecen a una categoría específica */
  getPlantsByCategory(category: string) {
    return this.plants.filter(p => p.category === category);
  }
}
