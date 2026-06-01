import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPlantsComponent } from '../../components/scroll-plants/scroll-plants.component';
import { TranslateModule } from '@ngx-translate/core';

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
  imports: [CommonModule, ScrollPlantsComponent, TranslateModule]
})
export class FloraComponent {
  /** Lista de plantas y sus imágenes clasificada por categoría */
  readonly plants = [
    { nameKey: 'PLANT_Adelfa_NAME', descKey: 'PLANT_Adelfa_DESC', image: 'adelfadefloracion.jpg', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Agapanto_NAME', descKey: 'PLANT_Agapanto_DESC', image: 'agapato.webp', categoryKey: 'CAT_FLOWERS' },
    { nameKey: 'PLANT_Agave_NAME', descKey: 'PLANT_Agave_DESC', image: 'agave.jpg', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Algarrobo_NAME', descKey: 'PLANT_Algarrobo_DESC', image: 'algarrobo.jpg', categoryKey: 'CAT_TREES' },
    { nameKey: 'PLANT_Buganvilla_NAME', descKey: 'PLANT_Buganvilla_DESC', image: 'bugambilla.webp', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Ciprés Totem_NAME', descKey: 'PLANT_Ciprés Totem_DESC', image: 'ciprestotem.webp', categoryKey: 'CAT_TREES' },
    { nameKey: 'PLANT_Jazmín Estrellado_NAME', descKey: 'PLANT_Jazmín Estrellado_DESC', image: 'jazminestrellado.jpg', categoryKey: 'CAT_FLOWERS' },
    { nameKey: 'PLANT_Lantana_NAME', descKey: 'PLANT_Lantana_DESC', image: 'lantana.jpg', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Lavanda_NAME', descKey: 'PLANT_Lavanda_DESC', image: 'lavanda.jpg', categoryKey: 'CAT_FLOWERS' },
    { nameKey: 'PLANT_Limonero_NAME', descKey: 'PLANT_Limonero_DESC', image: 'limonero.jpg', categoryKey: 'CAT_TREES' },
    { nameKey: 'PLANT_Naranjo_NAME', descKey: 'PLANT_Naranjo_DESC', image: 'naranjero.jpg', categoryKey: 'CAT_TREES' },
    { nameKey: 'PLANT_Olivo_NAME', descKey: 'PLANT_Olivo_DESC', image: 'olivo.jpg', categoryKey: 'CAT_TREES' },
    { nameKey: 'PLANT_Palmito_NAME', descKey: 'PLANT_Palmito_DESC', image: 'palmito.jpg', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Romero_NAME', descKey: 'PLANT_Romero_DESC', image: 'romero.jpg', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Santolina_NAME', descKey: 'PLANT_Santolina_DESC', image: 'santolina.JPG', categoryKey: 'CAT_SHRUBS' },
    { nameKey: 'PLANT_Strelitzia_NAME', descKey: 'PLANT_Strelitzia_DESC', image: 'strelitzia.jpg', categoryKey: 'CAT_FLOWERS' }
  ];

  /** Categorías para estructurar el catálogo */
  readonly categories = ['CAT_SHRUBS', 'CAT_FLOWERS', 'CAT_TREES'];

  /** Obtiene las plantas que pertenecen a una categoría específica */
  getPlantsByCategory(categoryKey: string) {
    return this.plants.filter(p => p.categoryKey === categoryKey);
  }
}
