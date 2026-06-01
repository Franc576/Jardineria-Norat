import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

/* ─── Custom Shaders ─── */

const PLANT_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLANT_FRAGMENT = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(uMap, vUv);
    
    // Chroma Key distance from light grey #dcdcdc
    vec3 keyColor = vec3(0.8627, 0.8627, 0.8627); // #dcdcdc
    float dist = distance(color.rgb, keyColor);
    
    // Radial protective mask to prevent clipping light pot colors in the center
    vec2 center = vec2(0.5, 0.5);
    float distToCenter = distance(vUv, center);
    
    // Soft thresholds: increase tolerance toward the edges, protect the center
    float baseTolerance = 0.17;
    float tolerance = baseTolerance + smoothstep(0.18, 0.55, distToCenter) * 0.28;
    float feather = 0.09;
    
    float alpha = smoothstep(tolerance, tolerance + feather, dist);
    
    // Vignette mask to smoothly hide the absolute boundaries of the 16:9 plane
    float vignette = smoothstep(0.48, 0.32, abs(vUv.x - 0.5)) * 
                     smoothstep(0.48, 0.32, abs(vUv.y - 0.5));
    
    gl_FragColor = vec4(color.rgb, color.a * alpha * vignette * uOpacity);
  }
`;

// Soft, glowing circular micro-particle shader for gold pollen
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

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent implements OnInit, OnDestroy {
  @ViewChild('rendererCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private static readonly TOTAL_FRAMES = 52;
  private static readonly ANIM_FPS = 12;
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

  private plantPlane?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private glowMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private shadowMesh?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private rafId = 0;
  private clock = new THREE.Clock();
  private frameIndex = 0;
  private frameAcc = 0;
  private mouse = { x: 0, y: 0 };
  private mobile = false;

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

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);

    for (const texture of this.textures) texture.dispose();
    for (const texture of this.generatedTextures) texture.dispose();

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

  /* ══════════════════════════════════════════════════════════
     Showcase Builder (Chroma Key & Particle pollen)
     ══════════════════════════════════════════════════════════ */

  private buildShowcase(): void {
    this.buildPlantPlane();
    this.buildLightWash();
    this.buildGroundingShadow();
    this.buildParticleLayers();
  }

  private buildPlantPlane(): void {
    const { pw, ph } = this.planeSize();
    const geometry = new THREE.PlaneGeometry(pw, ph);
    
    // ShaderMaterial for dinamyc Chroma Keying transparency and Vignette removal
    const material = new THREE.ShaderMaterial({
      vertexShader: PLANT_VERTEX,
      fragmentShader: PLANT_FRAGMENT,
      uniforms: {
        uMap: { value: this.textures[0] },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.plantPlane = new THREE.Mesh(geometry, material);
    this.plantPlane.renderOrder = 2;
    this.plantLayer.add(this.plantPlane);
  }

  private buildLightWash(): void {
    const texture = this.createRadialTexture(
      'rgba(255, 245, 212, 0.45)', // Warm golden glow
      'rgba(255, 245, 212, 0)'
    );
    const { vw, vh } = this.viewSize();
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.45,
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
    // Sutil elliptical shadow under the pot to ground it cleanly
    const texture = this.createRadialTexture(
      'rgba(52, 34, 18, 0.28)',
      'rgba(52, 34, 18, 0)'
    );
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });

    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.58),
      material
    );
    this.shadowMesh.position.set(0, -1.82, 1.25);
    this.shadowMesh.renderOrder = 5;
    this.foregroundLayer.add(this.shadowMesh);
  }

  /* ══════════════════════════════════════════════════════════
     Mini Golden Pollen Particles
     ══════════════════════════════════════════════════════════ */

  private buildParticleLayers(): void {
    const countFar = this.mobile ? 20 : 65;
    const countNear = this.mobile ? 6 : 18;

    // Finer, smaller and more subtle golden pollen particles
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
    if (this.plantPlane.material.uniforms['uMap'].value !== nextTexture) {
      this.plantPlane.material.uniforms['uMap'].value = nextTexture;
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

  private animateIntro(progress: number): void {
    if (this.plantPlane) {
      this.plantPlane.material.uniforms['uOpacity'].value = progress;
      const scale = 0.985 + progress * 0.015;
      this.plantLayer.scale.setScalar(scale);
      this.plantLayer.position.y = (1 - progress) * -0.08;
    }

    if (this.shadowMesh) {
      this.shadowMesh.material.opacity = 0.48 * progress;
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
