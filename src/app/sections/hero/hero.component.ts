import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { TranslateModule } from '@ngx-translate/core';

/* ─── Particles Shaders ─── */

const PARTICLE_VERTEX = `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = color;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (220.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const PARTICLE_FRAGMENT = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Soft circular gradient for gold pollen look
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float soft = 1.0 - smoothstep(0.15, 0.5, d);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

/* ─── Types ─── */

type ParticleLayer = {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  speeds: Float32Array;
  phases: Float32Array;
  drift: Float32Array;
  rangeX: number;
  rangeY: number;
  sway: number;
};

type FloatingObject = {
  mesh: THREE.Mesh;
  initialX: number;
  initialY: number;
  z: number;
  speed: number;
  phase: number;
  amplitude: number;
  rotSpeed: { x: number; y: number; z: number };
  parallaxFactor: number;
};

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  @ViewChild('heroPanel', { static: true })
  private heroPanelRef!: ElementRef<HTMLElement>;

  @ViewChild('bgVideo', { static: false })
  private bgVideoRef!: ElementRef<HTMLVideoElement>;

  private static readonly FRUSTUM = 5;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;

  private atmosphereLayer = new THREE.Group();
  private foregroundLayer = new THREE.Group();

  private particleLayers: ParticleLayer[] = [];
  private floatingObjects: FloatingObject[] = [];

  private rafId = 0;
  private clock = new THREE.Clock();
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

    this.disposeObject(this.scene);
    this.renderer?.dispose();
  }

  /* ══════════════════════════════════════════════════════════
     Bootstrap
     ══════════════════════════════════════════════════════════ */

  private bootstrap(): void {
    this.initRenderer();
    this.initCamera();
    this.initSceneLayers();
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
    this.foregroundLayer.renderOrder = 2;

    this.scene.add(this.atmosphereLayer);
    this.scene.add(this.foregroundLayer);
  }

  /* ══════════════════════════════════════════════════════════
     Showcase Builder
     ══════════════════════════════════════════════════════════ */

  private buildShowcase(): void {
    // this.buildParticleLayers();
    this.buildFloatingObjects();
  }

  private buildFloatingObjects(): void {
    // 3D Geometry for river stones (Dodecahedron) and wooden blocks (Box)
    const stoneGeom = new THREE.DodecahedronGeometry(0.18, 1);
    const woodGeom = new THREE.BoxGeometry(0.24, 0.14, 0.11);

    // Warm, earthy and organic colors to match the palette
    const stoneMat = new THREE.MeshBasicMaterial({
      color: 0xa8a6a0,
      transparent: true,
      opacity: 0.9,
    });

    const woodMat = new THREE.MeshBasicMaterial({
      color: 0x8a765d,
      transparent: true,
      opacity: 0.85,
    });

    // Positions framing the central panel (x: left/right sides, y: various levels)
    const configs = [
      { geom: stoneGeom, mat: stoneMat, x: -2.3, y: 1.2, z: 2.0, parallax: 0.2 },
      { geom: woodGeom, mat: woodMat, x: -2.6, y: -1.3, z: 2.2, parallax: 0.35 },
      { geom: stoneGeom, mat: stoneMat, x: 2.4, y: 0.9, z: 1.8, parallax: 0.18 },
      { geom: woodGeom, mat: woodMat, x: 2.1, y: -1.1, z: 2.3, parallax: 0.4 },
      { geom: stoneGeom, mat: stoneMat, x: -2.1, y: 0.2, z: 1.9, parallax: 0.15 },
      { geom: woodGeom, mat: woodMat, x: 2.6, y: -1.8, z: 2.1, parallax: 0.25 },
    ];

    for (let i = 0; i < configs.length; i++) {
      const c = configs[i];
      const mesh = new THREE.Mesh(c.geom, c.mat);
      mesh.position.set(c.x, c.y, c.z);
      
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.foregroundLayer.add(mesh);

      this.floatingObjects.push({
        mesh,
        initialX: c.x,
        initialY: c.y,
        z: c.z,
        speed: 0.35 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.08 + Math.random() * 0.08,
        rotSpeed: {
          x: 0.08 + Math.random() * 0.2,
          y: 0.08 + Math.random() * 0.2,
          z: 0.08 + Math.random() * 0.2,
        },
        parallaxFactor: c.parallax,
      });
    }
  }

  private buildParticleLayers(): void {
    const countFar = this.mobile ? 20 : 65;
    const countNear = this.mobile ? 6 : 18;

    const far = this.createParticleLayer({
      count: countFar,
      sizeMin: 0.005,
      sizeMax: 0.015,
      opacityMin: 0.08,
      opacityMax: 0.22,
      rangeX: 6.8,
      rangeY: 5.2,
      z: 1.35,
      sway: 0.0008,
      speedMin: 0.012,
      speedMax: 0.045,
      palette: ['#ffd45b', '#f4d068', '#ffe596', '#9fc992'],
    });

    const near = this.createParticleLayer({
      count: countNear,
      sizeMin: 0.015,
      sizeMax: 0.028,
      opacityMin: 0.12,
      opacityMax: 0.28,
      rangeX: 6.2,
      rangeY: 4.8,
      z: 1.75,
      sway: 0.0016,
      speedMin: 0.02,
      speedMax: 0.065,
      palette: ['#ffe294', '#ffd97d', '#c7dfb0'],
    });

    this.particleLayers.push(far, near);
    this.atmosphereLayer.add(far.points);
    this.foregroundLayer.add(near.points);
  }

  private createParticleLayer(config: {
    count: number;
    sizeMin: number;
    sizeMax: number;
    opacityMin: number;
    opacityMax: number;
    rangeX: number;
    rangeY: number;
    z: number;
    sway: number;
    speedMin: number;
    speedMax: number;
    palette: string[];
  }): ParticleLayer {
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);
    const alphas = new Float32Array(config.count);
    const speeds = new Float32Array(config.count);
    const phases = new Float32Array(config.count);
    const drift = new Float32Array(config.count);
    const palette = config.palette.map((value) => new THREE.Color(value));

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3;
      
      positions[i3] = (Math.random() - 0.5) * config.rangeX;
      positions[i3 + 1] = (Math.random() - 0.5) * config.rangeY;
      positions[i3 + 2] = config.z + Math.random() * 0.15;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
      alphas[i] = config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin);
      speeds[i] = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      phases[i] = Math.random() * Math.PI * 2;
      drift[i] = Math.random() > 0.5 ? 1 : -1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
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

  /* ══════════════════════════════════════════════════════════
     Animation loop & triggers
     ══════════════════════════════════════════════════════════ */

  private tick(): void {
    this.rafId = requestAnimationFrame(() => this.tick());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();

    this.animateFloatingObjects(t, dt);
    this.animateParticles(t, dt);
    this.updatePanelTilt();

    this.renderer.render(this.scene, this.camera);
  }

  private animateFloatingObjects(t: number, dt: number): void {
    const mx = this.mobile ? 0 : this.mouse.x;
    const my = this.mobile ? 0 : this.mouse.y;

    for (const obj of this.floatingObjects) {
      // Gentle sine-wave vertical float
      const floatY = Math.sin(t * obj.speed + obj.phase) * obj.amplitude;
      
      // Auto rotation over time
      obj.mesh.rotation.x += obj.rotSpeed.x * dt;
      obj.mesh.rotation.y += obj.rotSpeed.y * dt;
      obj.mesh.rotation.z += obj.rotSpeed.z * dt;

      // Mouse parallax position targets
      const targetX = obj.initialX + mx * obj.parallaxFactor * 1.5;
      const targetY = obj.initialY - my * obj.parallaxFactor * 1.5 + floatY;

      // Easing / Lerping to targets
      obj.mesh.position.x += (targetX - obj.mesh.position.x) * 0.05;
      obj.mesh.position.y += (targetY - obj.mesh.position.y) * 0.05;
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
        // Float upwards
        positions[i3 + 1] += layer.speeds[i] * dt;
        
        // Horizontal drift sway
        positions[i3] +=
          Math.sin(t * 0.35 + layer.phases[i]) *
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

  private updatePanelTilt(): void {
    if (!this.heroPanelRef || this.mobile) return;

    const mx = this.mouse.x; // range [-1, 1]
    const my = this.mouse.y; // range [-1, 1]

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

  private parentSize(): { w: number; h: number } {
    const el = this.canvasRef.nativeElement;
    const parent = el.parentElement;

    return {
      w: parent?.clientWidth ?? el.clientWidth,
      h: parent?.clientHeight ?? el.clientHeight,
    };
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
