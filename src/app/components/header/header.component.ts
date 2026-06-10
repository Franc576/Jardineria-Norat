import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, TranslateModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  menuOpen = false;
  langMenuOpen = false;
  isNavbarVisible = true;
  lastScrollTop = 0;

  constructor(private translate: TranslateService) {}

  @HostListener('window:scroll')
  onScroll() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    // Hide when scrolling down, show when scrolling up
    if (currentScroll > this.lastScrollTop && currentScroll > 80) {
      this.isNavbarVisible = false;
    } else {
      this.isNavbarVisible = true;
    }
    
    this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleLangMenu(): void {
    this.langMenuOpen = !this.langMenuOpen;
  }

  selectLanguage(lang: string): void {
    this.translate.use(lang);
    this.langMenuOpen = false;
    this.closeMenu();
  }

  getCurrentLanguage(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'es';
  }
}
