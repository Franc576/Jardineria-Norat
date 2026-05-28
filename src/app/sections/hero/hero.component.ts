import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

type ParticleLayer = {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  speeds: Float32Array;
  phases: Float32Array;
  drift: Float32Array;
  rangeX: number;
  rangeY: number;
  sway: number;
};

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

  private static readonly TOTAL_FRAMES = 52;
  private static readonly ANIM_FPS = 10;
  private static readonly FRAME_RATIO = 16 / 9;
  private static readonly FRUSTUM = 5;
  private static readonly SEQUENCE_DIR =
    'kling_20260528_VIDEO_Image1_Ima_4689_0 (1)_000';
  private static readonly SEQUENCE_STEM =
    'kling_20260528_VIDEO_Image1_Ima_4689_0 (1)';

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;

  private plantLayer = new THREE.Group();
  private atmosphereLayer = new THREE.Group();
  private foregroundLayer = new THREE.Group();

  private textures: THREE.Texture[] = [];
  private generatedTextures: THREE.Texture[] = [];
  private particleLayers: ParticleLayer[] = [];

  private plantPlane?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private glowMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private shadowMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private pedestalMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private rafId = 0;
  private clock = new THREE.Clock();
  private frameIndex = 0;
  private frameAcc = 0;
  private mouse = { x: 0, y: 0 };
  private mobile = false;

  private handleMouseMove = this.onMouseMove.bind(this);
  private handleResize = this.onResize.bind(this);

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.mobile = window.innerWidth < 992;
    this.bootstrap();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);

    for (const texture of this.textures) texture.dispose();
    for (const texture of this.generatedTextures) texture.dispose();

    this.disposeObject(this.scene);
    this.renderer?.dispose();
  }

  private bootstrap(): void {
    this.initRenderer();
    this.initCamera();
    this.initSceneLayers();

    this.loadAllFrames()
      .then(() => {
        this.buildShowcase();
        this.canvasRef.nativeElement.style.opacity = '1';

        this.zone.runOutsideAngular(() => {
          if (!this.mobile) {
            window.addEventListener('mousemove', this.handleMouseMove);
          }
          window.addEventListener('resize', this.handleResize);
          this.clock.start();
          this.tick();
        });
      })
      .catch((err) => console.warn('[Hero] Frame load error:', err));
  }

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
    this.renderer.setClearColor(0x000000, 0);

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

  private initSceneLayers(): void {
    this.atmosphereLayer.renderOrder = 1;
    this.plantLayer.renderOrder = 2;
    this.foregroundLayer.renderOrder = 3;

    this.scene.add(this.atmosphereLayer);
    this.scene.add(this.plantLayer);
    this.scene.add(this.foregroundLayer);
  }

  private loadAllFrames(): Promise<void> {
    const loader = new THREE.TextureLoader();

    const jobs = Array.from(
      { length: HeroComponent.TOTAL_FRAMES },
      (_, i) => {
        const idx = String(i).padStart(3, '0');
        const url = encodeURI(
          `${HeroComponent.SEQUENCE_DIR}/${HeroComponent.SEQUENCE_STEM}_${idx}.webp`
        );

        return new Promise<THREE.Texture>((resolve, reject) =>
          loader.load(
            url,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = false;
              resolve(texture);
            },
            undefined,
            reject
          )
        );
      }
    );

    return Promise.all(jobs).then((textures) => {
      this.textures = textures;
    });
  }

  private buildShowcase(): void {
    this.buildPlantPlane();
    this.buildLightWash();
    this.buildGroundingShadow();
    this.buildPedestalGlow();
    this.buildParticleLayers();
  }

  private buildPlantPlane(): void {
    const { pw, ph } = this.planeSize();
    const geometry = new THREE.PlaneGeometry(pw, ph);
    const material = new THREE.MeshBasicMaterial({
      map: this.textures[0],
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.plantPlane = new THREE.Mesh(geometry, material);
    this.plantPlane.renderOrder = 2;
    this.plantLayer.add(this.plantPlane);
  }

  private buildLightWash(): void {
    const texture = this.createRadialTexture(
      'rgba(255, 245, 212, 0.55)',
      'rgba(255, 245, 212, 0)'
    );
    const { vw, vh } = this.viewSize();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.glowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(vw * 0.95, vh * 1.2),
      material
    );
    this.glowMesh.position.set(-vw * 0.22, vh * 0.18, 1.2);
    this.glowMesh.renderOrder = 4;
    this.foregroundLayer.add(this.glowMesh);
  }

  private buildGroundingShadow(): void {
    const texture = this.createRadialTexture(
      'rgba(74, 48, 24, 0.34)',
      'rgba(74, 48, 24, 0)'
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });

    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.68),
      material
    );
    this.shadowMesh.position.set(0, -1.78, 1.25);
    this.shadowMesh.renderOrder = 5;
    this.foregroundLayer.add(this.shadowMesh);
  }

  private buildPedestalGlow(): void {
    const texture = this.createPedestalTexture();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });

    this.pedestalMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.25, 0.42),
      material
    );
    this.pedestalMesh.position.set(0, -1.93, 1.3);
    this.pedestalMesh.renderOrder = 6;
    this.foregroundLayer.add(this.pedestalMesh);
  }

  private buildParticleLayers(): void {
    const far = this.createParticleLayer({
      count: this.mobile ? 36 : 95,
      size: this.mobile ? 1.8 : 2.2,
      opacity: 0.2,
      rangeX: 7.2,
      rangeY: 5.4,
      z: 1.35,
      sway: 0.0012,
      speedMin: 0.03,
      speedMax: 0.12,
      excludeX: 0.9,
      excludeY: 0.6,
      palette: ['#f1d381', '#d9bd64', '#b9d8a4', '#9fc992'],
    });

    const near = this.createParticleLayer({
      count: this.mobile ? 10 : 24,
      size: this.mobile ? 3.6 : 5.2,
      opacity: 0.26,
      rangeX: 6.8,
      rangeY: 5.0,
      z: 1.75,
      sway: 0.0024,
      speedMin: 0.05,
      speedMax: 0.18,
      excludeX: 1.35,
      excludeY: 0.95,
      palette: ['#ffe7a3', '#e8c96d', '#c7dfb0'],
    });

    this.particleLayers.push(far, near);
    this.atmosphereLayer.add(far.points);
    this.foregroundLayer.add(near.points);
  }

  private createParticleLayer(config: {
    count: number;
    size: number;
    opacity: number;
    rangeX: number;
    rangeY: number;
    z: number;
    sway: number;
    speedMin: number;
    speedMax: number;
    excludeX: number;
    excludeY: number;
    palette: string[];
  }): ParticleLayer {
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const speeds = new Float32Array(config.count);
    const phases = new Float32Array(config.count);
    const drift = new Float32Array(config.count);
    const palette = config.palette.map((value) => new THREE.Color(value));

    for (let i = 0; i < config.count; i++) {
      const point = this.randomParticlePosition(config);
      const i3 = i * 3;
      positions[i3] = point.x;
      positions[i3 + 1] = point.y;
      positions[i3 + 2] = config.z + Math.random() * 0.2;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      speeds[i] =
        config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      phases[i] = Math.random() * Math.PI * 2;
      drift[i] = Math.random() > 0.5 ? 1 : -1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: config.size * Math.min(window.devicePixelRatio, 2),
      sizeAttenuation: false,
      transparent: true,
      opacity: config.opacity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = config.z > 1.5 ? 7 : 3;

    return {
      points,
      speeds,
      phases,
      drift,
      rangeX: config.rangeX,
      rangeY: config.rangeY,
      sway: config.sway,
    };
  }

  private randomParticlePosition(config: {
    rangeX: number;
    rangeY: number;
    excludeX: number;
    excludeY: number;
  }): { x: number; y: number } {
    let x = 0;
    let y = 0;

    do {
      x = (Math.random() - 0.5) * config.rangeX;
      y = (Math.random() - 0.5) * config.rangeY;
    } while (Math.abs(x) < config.excludeX && Math.abs(y) < config.excludeY);

    return { x, y };
  }

  private tick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();
    const intro = this.easeOutCubic(Math.min(t / 1.35, 1));

    this.animateFrames(dt);
    this.animateParticles(t, dt);
    this.animateIntro(intro);
    this.applyParallax(t);

    this.renderer.render(this.scene, this.camera);
  }

  private animateFrames(dt: number): void {
    if (!this.plantPlane || this.textures.length === 0) return;

    this.frameAcc += dt;
    const interval = 1 / HeroComponent.ANIM_FPS;

    while (this.frameAcc >= interval) {
      this.frameAcc -= interval;
      this.frameIndex =
        (this.frameIndex + 1) % HeroComponent.TOTAL_FRAMES;
    }

    const nextTexture = this.textures[this.frameIndex];
    if (this.plantPlane.material.map !== nextTexture) {
      this.plantPlane.material.map = nextTexture;
      this.plantPlane.material.needsUpdate = true;
    }
  }

  private animateParticles(t: number, dt: number): void {
    for (const layer of this.particleLayers) {
      const attr = layer.points.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const positions = attr.array as Float32Array;
      const count = positions.length / 3;
      const ceiling = layer.rangeY / 2;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += layer.speeds[i] * dt;
        positions[i3] +=
          Math.sin(t * 0.45 + layer.phases[i]) *
          layer.sway *
          layer.drift[i];

        if (positions[i3 + 1] > ceiling) {
          positions[i3 + 1] = -ceiling;
          positions[i3] = (Math.random() - 0.5) * layer.rangeX;
        }
      }

      attr.needsUpdate = true;
    }
  }

  private animateIntro(progress: number): void {
    if (this.plantPlane) {
      this.plantPlane.material.opacity = progress;
      const scale = 0.985 + progress * 0.015;
      this.plantLayer.scale.setScalar(scale);
      this.plantLayer.position.y = (1 - progress) * -0.08;
    }

    if (this.shadowMesh) {
      this.shadowMesh.material.opacity = 0.55 * progress;
    }

    if (this.pedestalMesh) {
      this.pedestalMesh.material.opacity = 0.72 * progress;
    }
  }

  private applyParallax(t: number): void {
    const mx = this.mobile ? 0 : this.mouse.x;
    const my = this.mobile ? 0 : this.mouse.y;

    this.lerpGroupTransform(this.plantLayer, {
      x: mx * 0.08,
      y: -my * 0.055,
      rx: my * 0.012,
      ry: mx * 0.018,
      speed: 0.035,
    });

    this.lerpGroupTransform(this.atmosphereLayer, {
      x: mx * 0.035 + Math.sin(t * 0.16) * 0.012,
      y: -my * 0.02,
      rx: 0,
      ry: 0,
      speed: 0.025,
    });

    this.lerpGroupTransform(this.foregroundLayer, {
      x: -mx * 0.12,
      y: my * 0.055,
      rx: -my * 0.006,
      ry: -mx * 0.012,
      speed: 0.04,
    });

    this.camera.position.x += (mx * 0.035 - this.camera.position.x) * 0.03;
    this.camera.position.y += (-my * 0.025 - this.camera.position.y) * 0.03;
  }

  private lerpGroupTransform(
    group: THREE.Group,
    target: { x: number; y: number; rx: number; ry: number; speed: number }
  ): void {
    group.position.x += (target.x - group.position.x) * target.speed;
    group.position.y += (target.y - group.position.y) * target.speed;
    group.rotation.x += (target.rx - group.rotation.x) * target.speed;
    group.rotation.y += (target.ry - group.rotation.y) * target.speed;
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
  }

  private onResize(): void {
    const { w, h } = this.parentSize();
    if (!w || !h) return;

    const aspect = w / h;
    const half = HeroComponent.FRUSTUM / 2;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.resizeShowcase();

    const wasMobile = this.mobile;
    this.mobile = window.innerWidth < 992;

    if (this.mobile && !wasMobile) {
      window.removeEventListener('mousemove', this.handleMouseMove);
      this.mouse = { x: 0, y: 0 };
    } else if (!this.mobile && wasMobile) {
      window.addEventListener('mousemove', this.handleMouseMove);
    }
  }

  private resizeShowcase(): void {
    if (this.plantPlane) {
      const { pw, ph } = this.planeSize();
      this.plantPlane.geometry.dispose();
      this.plantPlane.geometry = new THREE.PlaneGeometry(pw, ph);
    }

    if (this.glowMesh) {
      const { vw, vh } = this.viewSize();
      this.glowMesh.geometry.dispose();
      this.glowMesh.geometry = new THREE.PlaneGeometry(vw * 0.95, vh * 1.2);
      this.glowMesh.position.set(-vw * 0.22, vh * 0.18, 1.2);
    }
  }

  private planeSize(): { pw: number; ph: number } {
    const { w, h } = this.parentSize();
    const viewAspect = w / h;
    const frameAspect = HeroComponent.FRAME_RATIO;
    const frustum = HeroComponent.FRUSTUM;
    const pad = 1.08;

    if (viewAspect >= frameAspect) {
      const pw = frustum * viewAspect * pad;
      return { pw, ph: pw / frameAspect };
    }

    const ph = frustum * pad;
    return { pw: ph * frameAspect, ph };
  }

  private viewSize(): { vw: number; vh: number } {
    const { w, h } = this.parentSize();
    const aspect = w / h;
    return {
      vw: HeroComponent.FRUSTUM * aspect,
      vh: HeroComponent.FRUSTUM,
    };
  }

  private parentSize(): { w: number; h: number } {
    const el = this.canvasRef.nativeElement;
    const parent = el.parentElement;

    return {
      w: parent?.clientWidth ?? el.clientWidth,
      h: parent?.clientHeight ?? el.clientHeight,
    };
  }

  private createRadialTexture(inner: string, outer: string): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    const gradient = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      0,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.52, inner.replace('0.55', '0.18'));
    gradient.addColorStop(1, outer);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.generatedTextures.push(texture);
    return texture;
  }

  private createPedestalTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    const glow = ctx.createRadialGradient(256, 64, 18, 256, 64, 240);
    glow.addColorStop(0, 'rgba(255, 235, 190, 0.42)');
    glow.addColorStop(0.45, 'rgba(185, 126, 67, 0.18)');
    glow.addColorStop(1, 'rgba(185, 126, 67, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 245, 220, 0.36)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(256, 64, 205, 28, 0, 0, Math.PI * 2);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.generatedTextures.push(texture);
    return texture;
  }

  private easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh<
        THREE.BufferGeometry,
        THREE.Material | THREE.Material[]
      >;

      mesh.geometry?.dispose();

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material.dispose());
      } else {
        mesh.material?.dispose();
      }
    });
  }
}
