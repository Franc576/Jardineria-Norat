import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroPanel', { static: true })
  private heroPanelRef!: ElementRef<HTMLElement>;

  @ViewChild('bgVideo', { static: false })
  private bgVideoRef!: ElementRef<HTMLVideoElement>;

  private rafId = 0;
  private mouse = { x: 0, y: 0 };
  private mobile = false;

  private currentTilt = { x: 0, y: 0, px: 0, py: 0 };

  private handleMouseMove = this.onMouseMove.bind(this);
  private handleResize = this.onResize.bind(this);

  constructor(private zone: NgZone) {}

  /* ══════════════════════════════════════════════════════════
     Lifecycle
     ══════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.mobile = window.innerWidth < 992;
    this.bootstrap();
  }

  ngAfterViewInit(): void {
    if (this.bgVideoRef) {
      const video = this.bgVideoRef.nativeElement;
      video.muted = true;
      video.loop = true;

      // Bulletproof loop event listener fallback
      video.addEventListener('ended', () => {
        video.currentTime = 0;
        video.play().catch(err => console.warn('Video loop play failed:', err));
      });

      // Explicitly trigger initial play
      video.play().catch(err => console.warn('Video play trigger failed:', err));
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
  }

  /* ══════════════════════════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════════════════════════ */

  private bootstrap(): void {
    this.zone.runOutsideAngular(() => {
      if (!this.mobile) {
        window.addEventListener('mousemove', this.handleMouseMove);
      }
      window.addEventListener('resize', this.handleResize);
      this.tick();
    });
  }

  /* ══════════════════════════════════════════════════════════
     Animation loop – Panel tilt only
     ══════════════════════════════════════════════════════════ */

  private tick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());
    this.updatePanelTilt();
  }

  private updatePanelTilt(): void {
    if (!this.heroPanelRef || this.mobile) return;

    const mx = this.mouse.x;
    const my = this.mouse.y;

    // Max tilt angles: 9 degrees
    const targetTiltX = -my * 8;
    const targetTiltY = mx * 8;

    // Max parallax shift: 12px
    const targetPx = mx * 12;
    const targetPy = -my * 12;

    // Smooth lerp
    this.currentTilt.x += (targetTiltX - this.currentTilt.x) * 0.08;
    this.currentTilt.y += (targetTiltY - this.currentTilt.y) * 0.08;
    this.currentTilt.px += (targetPx - this.currentTilt.px) * 0.08;
    this.currentTilt.py += (targetPy - this.currentTilt.py) * 0.08;

    const el = this.heroPanelRef.nativeElement;
    el.style.transform = `rotateX(${this.currentTilt.x}deg) rotateY(${this.currentTilt.y}deg) translateX(${this.currentTilt.px}px) translateY(${this.currentTilt.py}px)`;
  }

  /* ══════════════════════════════════════════════════════════
     Events & Sizing Helpers
     ══════════════════════════════════════════════════════════ */

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  private onResize(): void {
    const wasMobile = this.mobile;
    this.mobile = window.innerWidth < 992;

    if (this.mobile && !wasMobile) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.mouse = { x: 0, y: 0 };
      if (this.heroPanelRef) {
        this.heroPanelRef.nativeElement.style.transform = 'none';
      }
    } else if (!this.mobile && wasMobile) {
      window.addEventListener('mousemove', this.handleMouseMove);
    }
  }
}
