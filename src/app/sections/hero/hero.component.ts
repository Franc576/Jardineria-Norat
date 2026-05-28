import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Three.js core ──────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private group!: THREE.Group;

  // ── Frame animation ────────────────────────────────
  private static readonly TOTAL_FRAMES = 52;
  private static readonly ANIM_FPS = 12;
  private static readonly FRAME_RATIO = 16 / 9;
  private textures: THREE.Texture[] = [];
  private plane!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private frameIndex = 0;
  private frameAcc = 0;

  // ── Particles ──────────────────────────────────────
  private points!: THREE.Points;
  private pSpeeds!: Float32Array;
  private pPhases!: Float32Array;

  // ── State ──────────────────────────────────────────
  private rafId = 0;
  private clock = new THREE.Clock();
  private mouse = { x: 0, y: 0 };
  private mobile = false;
  private static readonly FRUSTUM = 5;

  // ── Bound handlers ────────────────────────────────
  private handleMouseMove = this.onMouseMove.bind(this);
  private handleResize = this.onResize.bind(this);

  constructor(private zone: NgZone) {}

  // ═══════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════

  ngOnInit(): void {
    this.mobile = window.innerWidth < 992;
    this.bootstrap();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);

    for (const t of this.textures) t.dispose();
    this.plane?.geometry.dispose();
    this.plane?.material.dispose();
    this.points?.geometry.dispose();
    (this.points?.material as THREE.Material)?.dispose();
    this.renderer?.dispose();
  }

  // ═══════════════════════════════════════════════════
  // Bootstrap
  // ═══════════════════════════════════════════════════

  private bootstrap(): void {
    this.initRenderer();
    this.initCamera();
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.loadAllFrames()
      .then(() => {
        this.buildPlane();
        this.buildParticles();

        // Fade canvas in once everything is ready
        this.canvasRef.nativeElement.style.opacity = '1';

        this.zone.runOutsideAngular(() => {
          if (!this.mobile) {
            window.addEventListener('mousemove', this.handleMouseMove);
          }
          window.addEventListener('resize', this.handleResize);
          this.tick();
        });
      })
      .catch((err) => console.warn('[Hero] Frame load error:', err));
  }

  // ═══════════════════════════════════════════════════
  // Renderer & Camera
  // ═══════════════════════════════════════════════════

  private initRenderer(): void {
    const canvas = this.canvasRef.nativeElement;
    const { w, h } = this.parentSize();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
  }

  private initCamera(): void {
    const { w, h } = this.parentSize();
    const aspect = w / h;
    const half = HeroComponent.FRUSTUM / 2;

    this.camera = new THREE.OrthographicCamera(
      -half * aspect,
      half * aspect,
      half,
      -half,
      0.1,
      50
    );
    this.camera.position.z = 10;
  }

  // ═══════════════════════════════════════════════════
  // Texture preloading (52 WebP frames)
  // ═══════════════════════════════════════════════════

  private loadAllFrames(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const dir = 'kling_20260528_VIDEO_Image1_Ima_4689_0 (1)_000';
    const stem = 'kling_20260528_VIDEO_Image1_Ima_4689_0 (1)';

    const jobs = Array.from(
      { length: HeroComponent.TOTAL_FRAMES },
      (_, i) => {
        const idx = String(i).padStart(3, '0');
        const url = encodeURI(`${dir}/${stem}_${idx}.webp`);

        return new Promise<THREE.Texture>((resolve, reject) =>
          loader.load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.generateMipmaps = false;
              resolve(tex);
            },
            undefined,
            reject
          )
        );
      }
    );

    return Promise.all(jobs).then((list) => {
      this.textures = list;
    });
  }

  // ═══════════════════════════════════════════════════
  // Animated plane (the plant)
  // ═══════════════════════════════════════════════════

  private buildPlane(): void {
    const { pw, ph } = this.planeSize();
    const geo = new THREE.PlaneGeometry(pw, ph);
    const mat = new THREE.MeshBasicMaterial({ map: this.textures[0] });

    this.plane = new THREE.Mesh(geo, mat);
    this.group.add(this.plane);
  }

  /**
   * Cover-fit: the plane fills or slightly overflows the camera frustum
   * so no gaps are visible at the edges, regardless of canvas aspect ratio.
   */
  private planeSize(): { pw: number; ph: number } {
    const { w, h } = this.parentSize();
    const viewAspect = w / h;
    const frameAspect = HeroComponent.FRAME_RATIO;
    const F = HeroComponent.FRUSTUM;
    const pad = 1.04; // slight overscale to prevent sub-pixel gaps

    let pw: number;
    let ph: number;

    if (viewAspect >= frameAspect) {
      // Canvas is wider than frame → match width, crop top/bottom
      pw = F * viewAspect * pad;
      ph = pw / frameAspect;
    } else {
      // Canvas is taller → match height, crop left/right
      ph = F * pad;
      pw = ph * frameAspect;
    }

    return { pw, ph };
  }

  // ═══════════════════════════════════════════════════
  // Particle system (pollen / illuminated dust)
  // ═══════════════════════════════════════════════════

  private buildParticles(): void {
    const count = this.mobile ? 40 : 120;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.pSpeeds = new Float32Array(count);
    this.pPhases = new Float32Array(count);

    const palette = [
      new THREE.Color('#d4a853'), // golden
      new THREE.Color('#c9a84c'), // warm gold
      new THREE.Color('#b8963f'), // deep gold
      new THREE.Color('#7cb587'), // soft green
      new THREE.Color('#8fc99a'), // light green
      new THREE.Color('#a3d4ad'), // pale green
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Spread particles across the scene with mild central exclusion
      let x: number;
      let y: number;
      do {
        x = (Math.random() - 0.5) * 7;
        y = (Math.random() - 0.5) * 5.5;
      } while (Math.abs(x) < 1.0 && Math.abs(y) < 0.7);

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = 0.5 + Math.random() * 1.5; // in front of the plane

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i3] = c.r;
      col[i3 + 1] = c.g;
      col[i3 + 2] = c.b;

      this.pSpeeds[i] = 0.08 + Math.random() * 0.22;
      this.pPhases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const pr = Math.min(window.devicePixelRatio, 2);
    const material = new THREE.PointsMaterial({
      size: 3 * pr,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
  }

  // ═══════════════════════════════════════════════════
  // Render loop
  // ═══════════════════════════════════════════════════

  private tick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());

    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    // ── Flip to next frame ──
    this.frameAcc += dt;
    const interval = 1 / HeroComponent.ANIM_FPS;
    if (this.frameAcc >= interval && this.textures.length > 0) {
      this.frameAcc -= interval;
      this.frameIndex =
        (this.frameIndex + 1) % HeroComponent.TOTAL_FRAMES;
      this.plane.material.map = this.textures[this.frameIndex];
    }

    // ── Animate particles ──
    this.animateParticles(t, dt);

    // ── Mouse parallax (desktop only) ──
    if (!this.mobile) {
      const targetX = this.mouse.y * 0.04; // vertical tilt
      const targetY = this.mouse.x * 0.04; // horizontal tilt
      this.group.rotation.x +=
        (targetX - this.group.rotation.x) * 0.03;
      this.group.rotation.y +=
        (targetY - this.group.rotation.y) * 0.03;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private animateParticles(t: number, dt: number): void {
    if (!this.points) return;

    const attr = this.points.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = arr.length / 3;
    const ceiling = HeroComponent.FRUSTUM / 2 + 1;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Rise gently
      arr[i3 + 1] += this.pSpeeds[i] * dt;

      // Lateral sway
      arr[i3] += Math.sin(t * 0.4 + this.pPhases[i]) * 0.0015;

      // Recycle particle when it floats above the view
      if (arr[i3 + 1] > ceiling) {
        arr[i3 + 1] = -ceiling;
        let nx: number;
        do {
          nx = (Math.random() - 0.5) * 7;
        } while (Math.abs(nx) < 1.0);
        arr[i3] = nx;
        arr[i3 + 2] = 0.5 + Math.random() * 1.5;
      }
    }

    attr.needsUpdate = true;
  }

  // ═══════════════════════════════════════════════════
  // Event handlers
  // ═══════════════════════════════════════════════════

  private onMouseMove(e: MouseEvent): void {
    // Normalise to [-1, 1]
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }

  private onResize(): void {
    const { w, h } = this.parentSize();
    if (!w || !h) return;

    // Update camera frustum
    const aspect = w / h;
    const half = HeroComponent.FRUSTUM / 2;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);

    // Rebuild plane geometry to match new view proportions
    if (this.plane) {
      const { pw, ph } = this.planeSize();
      this.plane.geometry.dispose();
      this.plane.geometry = new THREE.PlaneGeometry(pw, ph);
    }

    // Toggle mobile mode
    const wasMobile = this.mobile;
    this.mobile = window.innerWidth < 992;

    if (this.mobile && !wasMobile) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.group.rotation.set(0, 0, 0);
    } else if (!this.mobile && wasMobile) {
      window.addEventListener('mousemove', this.handleMouseMove);
    }
  }

  // ═══════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════

  private parentSize(): { w: number; h: number } {
    const el = this.canvasRef.nativeElement;
    const p = el.parentElement;
    return {
      w: p?.clientWidth ?? el.clientWidth,
      h: p?.clientHeight ?? el.clientHeight,
    };
  }
}
