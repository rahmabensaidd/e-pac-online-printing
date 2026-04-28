import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  BookPreviewFamily,
  computeFamilyFromBindingTypeAndCoverColor,
  normalizePreviewDimensions,
  resolveBindingGroup,
  resolveGlbPathFromFamilyAndBindingType
} from './book-preview-3d-utils';
import { BookSemanticTextureMap } from './book-preview-semantic-textures';

@Component({
  selector: 'app-book-preview-3d-floating',
  standalone: true,
  imports: [CommonModule, CdkDrag, CdkDragHandle],
  templateUrl: './book-preview-3d-floating.html',
  styleUrl: './book-preview-3d-floating.css',
  host: {
    '[class.embedded]': 'embedded',
  },
})
export class BookPreview3dFloatingComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() bindingType: string | null = null;
  @Input() coverColor: string | null = null;
  @Input() bookWidth: number | string | null = null;
  @Input() bookHeight: number | string | null = null;
  @Input() bookThickness: number | string | null = null;
  @Input() textures: BookSemanticTextureMap | null = null;
  @Input() dragBoundarySelector = 'body';
  @Input() embedded = false;

  @ViewChild('canvasHost', { static: true }) private readonly canvasHostRef!: ElementRef<HTMLDivElement>;

  isCollapsed = false;
  isLoadingModel = false;
  loadingMessage = 'Loading 3D preview...';
  loadErrorMessage = '';
  previewWidth = 320;
  previewHeight = 220;

  private readonly minPreviewWidth = 260;
  private readonly maxPreviewWidth = 720;
  private readonly minPreviewHeight = 180;
  private readonly maxPreviewHeight = 560;
  private resizeCleanup: (() => void) | null = null;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
  private readonly gltfLoader = new GLTFLoader();
  private readonly modelRoot = new THREE.Group();
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  private readonly keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  private readonly fillLight = new THREE.DirectionalLight(0xffffff, 0.45);

  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame: number | null = null;
  private activeGltfScene: THREE.Object3D | null = null;
  private activeModelPath = '';
  private loadRequestId = 0;
  private textureRevision = -1;
  private fallbackModelActive = false;

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      this.initializeThree();
      if (!this.renderer) {
        return;
      }
      void this.rebuildModelIfNeeded(true);
      this.startRenderLoop();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.renderer) {
      return;
    }

    const geometryInputsChanged =
      !!changes['bindingType'] ||
      !!changes['coverColor'] ||
      !!changes['bookWidth'] ||
      !!changes['bookHeight'] ||
      !!changes['bookThickness'];

    if (geometryInputsChanged) {
      void this.rebuildModelIfNeeded(false);
      return;
    }

    if (!!changes['textures'] && this.activeGltfScene) {
      this.applyPreviewTexturesToMeshes();
    }
  }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
    if (!this.isCollapsed) {
      requestAnimationFrame(() => this.handleResize());
    }
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (typeof window === 'undefined') {
      return;
    }

    this.resizeCleanup?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialWidth = this.previewWidth;
    const initialHeight = this.previewHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = initialWidth + (moveEvent.clientX - startX);
      const nextHeight = initialHeight + (moveEvent.clientY - startY);
      this.previewWidth = Math.min(this.maxPreviewWidth, Math.max(this.minPreviewWidth, Math.round(nextWidth)));
      this.previewHeight = Math.min(this.maxPreviewHeight, Math.max(this.minPreviewHeight, Math.round(nextHeight)));
      this.handleResize();
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.resizeCleanup = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.resizeCleanup = onMouseUp;
  }

  ngOnDestroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.controls?.dispose();
    this.controls = null;
    this.resizeCleanup?.();
    this.resizeCleanup = null;

    this.disposeCurrentModel();
    this.renderer?.dispose();
    this.renderer = null;
  }

  private initializeThree(): void {
    const host = this.canvasHostRef?.nativeElement;
    if (!host) {
      this.loadErrorMessage = 'Preview host is not ready.';
      return;
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf6f8fc, 1);
    host.appendChild(this.renderer.domElement);

    this.scene.add(this.modelRoot);
    this.scene.add(this.ambientLight);
    this.scene.add(this.keyLight);
    this.scene.add(this.fillLight);

    this.keyLight.position.set(2.3, 3.2, 3.4);
    this.fillLight.position.set(-2.1, 1.6, -2.6);

    this.camera.position.set(0, 0.9, 2.3);
    this.scene.background = new THREE.Color(0xf6f8fc);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(host);
    this.handleResize();
  }

  private async rebuildModelIfNeeded(forceReload: boolean): Promise<void> {
    const family = computeFamilyFromBindingTypeAndCoverColor(this.bindingType, this.coverColor);
    const modelPath = resolveGlbPathFromFamilyAndBindingType(family, this.bindingType);

    if (!forceReload && this.activeModelPath === modelPath && this.activeGltfScene) {
      this.applyDimensionScale(family);
      this.applyPreviewTexturesToMeshes();
      this.fitCameraToModel();
      return;
    }

    this.isLoadingModel = true;
    this.loadErrorMessage = '';
    this.loadingMessage = 'Loading 3D preview...';
    const requestId = ++this.loadRequestId;
    const candidatePaths = this.resolveModelCandidatePaths(modelPath);

    try {
      const gltf = await this.loadModelWithFallback(candidatePaths);
      if (requestId !== this.loadRequestId) {
        this.disposeGltfScene(gltf.scene);
        return;
      }

      this.disposeCurrentModel();
      this.activeGltfScene = gltf.scene;
      this.activeModelPath = modelPath;
      this.modelRoot.add(gltf.scene);
      this.textureRevision = -1;
      this.fallbackModelActive = false;

      this.applyDimensionScale(family);
      this.applyPreviewTexturesToMeshes();
      this.fitCameraToModel();
      this.isLoadingModel = false;
    } catch (error) {
      console.error('3D preview model loading failed:', error);
      if (requestId === this.loadRequestId) {
        this.disposeCurrentModel();
        this.activeModelPath = `fallback:${family}`;
        this.activeGltfScene = this.createFallbackModel(family);
        this.modelRoot.add(this.activeGltfScene);
        this.fallbackModelActive = true;
        this.applyDimensionScale(family);
        this.fitCameraToModel();
        this.isLoadingModel = false;
        this.loadErrorMessage = `GLB not loaded. Fallback model shown.`;
      }
    }
  }

  private resolveModelCandidatePaths(primaryPath: string): string[] {
    const normalizedPrimary = primaryPath.startsWith('/') ? primaryPath : `/${primaryPath}`;
    const fileName = normalizedPrimary.split('/').pop() ?? '';
    const candidates = new Set<string>([
      normalizedPrimary,
      normalizedPrimary.replace('/assets/', '/'),
      `assets/3d/books/${fileName}`,
      `/assets/3d/books/${fileName}`,
      `/3d/books/${fileName}`
    ]);
    return Array.from(candidates).filter((entry) => !!entry && entry.endsWith('.glb'));
  }

  private async loadModelWithFallback(paths: string[]) {
    let lastError: unknown = null;

    for (const path of paths) {
      try {
        return await this.gltfLoader.loadAsync(path);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Unable to load GLB model from configured paths.');
  }

  private applyDimensionScale(family: BookPreviewFamily): void {
    if (!this.activeGltfScene) {
      return;
    }

    const dims = normalizePreviewDimensions(this.bookWidth, this.bookHeight, this.bookThickness);
    const sourceBox = new THREE.Box3().setFromObject(this.activeGltfScene);
    const sourceSize = sourceBox.getSize(new THREE.Vector3());
    if (sourceSize.x <= 0 || sourceSize.y <= 0 || sourceSize.z <= 0) {
      return;
    }

    const bindingGroup = resolveBindingGroup(this.bindingType);
    const targetWidth = family === 'WRAP_1P' || family === 'WRAP_2P' ? dims.coverSpreadWidth : dims.trimWidth;
    const targetHeight = dims.trimHeight;
    const targetDepth =
      bindingGroup === 'SADDLESTITCH' ? Math.max(dims.pageBlockDepth * 0.45, 1) : Math.max(dims.pageBlockDepth, 1);

    this.activeGltfScene.scale.set(
      targetWidth / sourceSize.x,
      targetHeight / sourceSize.y,
      targetDepth / sourceSize.z
    );
  }

  private applyPreviewTexturesToMeshes(): void {
    if (!this.activeGltfScene || !this.renderer) {
      return;
    }

    const revision = this.textures?.revision ?? -1;
    if (revision === this.textureRevision && revision !== -1) {
      return;
    }

    this.textureRevision = revision;
    const family = this.textures?.family ?? computeFamilyFromBindingTypeAndCoverColor(this.bindingType, this.coverColor);
    const { frontUrl, backUrl, spineUrl } = this.resolveSemanticMeshTextureUrls(family, this.textures);

    if (this.fallbackModelActive) {
      this.applyTexturesOnFallback(frontUrl, backUrl, spineUrl);
      return;
    }

    this.activeGltfScene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }

      const meshName = node.name.trim().toLowerCase();
      this.disposeOwnedMaterial(node.material);
      let replacedMaterial = false;

      if (meshName === 'frontcover') {
        node.material = this.createCoverMaterial(frontUrl);
        replacedMaterial = true;
      } else if (meshName === 'backcover') {
        node.material = this.createCoverMaterial(backUrl);
        replacedMaterial = true;
      } else if (meshName === 'spine') {
        node.material = this.createCoverMaterial(spineUrl);
        replacedMaterial = true;
      } else if (meshName === 'pages') {
        node.material = new THREE.MeshStandardMaterial({
          color: 0xf4f4f1,
          roughness: 1,
          metalness: 0
        });
        replacedMaterial = true;
      } else if (meshName === 'spiral' || meshName === 'staplesmetal' || meshName === 'metalrings' || meshName === 'metalrail') {
        node.material = new THREE.MeshStandardMaterial({
          color: 0xbac3cf,
          roughness: 0.22,
          metalness: 0.88
        });
        replacedMaterial = true;
      }

      if (replacedMaterial) {
        this.tagOwnedMaterial(node.material);
      }
    });
  }

  private resolveSemanticMeshTextureUrls(
    family: BookPreviewFamily,
    map: BookSemanticTextureMap | null
  ): { frontUrl?: string; backUrl?: string; spineUrl?: string } {
    const rawFallback = map?.rawPageUrls?.[0] ?? undefined;
    const frontDefault = map?.outsideFront ?? map?.flatPage1 ?? rawFallback;

    if (family === 'WRAP_1P' || family === 'WRAP_2P') {
      return {
        frontUrl: frontDefault ?? undefined,
        backUrl: (map?.outsideBack ?? rawFallback ?? frontDefault) ?? undefined,
        spineUrl: (map?.outsideSpine ?? frontDefault ?? rawFallback) ?? undefined
      };
    }

    if (family === 'FLAT_4P') {
      return {
        frontUrl: (map?.flatPage1 ?? map?.outsideFront ?? rawFallback) ?? undefined,
        backUrl: (map?.flatPage4 ?? map?.outsideBack ?? map?.flatPage2 ?? rawFallback) ?? undefined,
        spineUrl: undefined
      };
    }

    if (family === 'FLAT_2P') {
      return {
        frontUrl: (map?.flatPage1 ?? map?.outsideFront ?? rawFallback) ?? undefined,
        backUrl: (map?.flatPage2 ?? map?.outsideBack ?? rawFallback) ?? undefined,
        spineUrl: undefined
      };
    }

    if (family === 'SADDLESTITCH') {
      return {
        frontUrl: (map?.flatPage1 ?? map?.outsideFront ?? rawFallback) ?? undefined,
        backUrl: (map?.flatPage2 ?? map?.outsideBack ?? rawFallback) ?? undefined,
        spineUrl: undefined
      };
    }

    return {
      frontUrl: frontDefault ?? undefined,
      backUrl: (map?.outsideBack ?? map?.flatPage2 ?? rawFallback ?? frontDefault) ?? undefined,
      spineUrl: (map?.outsideSpine ?? frontDefault ?? rawFallback) ?? undefined
    };
  }

  private createCoverMaterial(url: string | undefined): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02
    });

    if (!url || !this.renderer) {
      return material;
    }

    const texture = new THREE.TextureLoader().load(url);
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    material.map = texture;
    material.needsUpdate = true;
    return material;
  }

  private fitCameraToModel(): void {
    if (!this.activeGltfScene || !this.controls) {
      return;
    }

    const box = new THREE.Box3().setFromObject(this.activeGltfScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    if (maxSize <= 0) {
      return;
    }

    const distance = (maxSize * 0.7) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    this.camera.near = Math.max(distance / 120, 0.01);
    this.camera.far = Math.max(distance * 50, 100);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(center.x + distance * 0.92, center.y + distance * 0.62, center.z + distance * 0.92);

    this.controls.target.copy(center);
    this.controls.minDistance = Math.max(distance * 0.5, 0.2);
    this.controls.maxDistance = distance * 2.2;
    this.controls.update();
  }

  private createFallbackModel(family: BookPreviewFamily): THREE.Group {
    const group = new THREE.Group();
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x9fb8e8,
      roughness: 0.7,
      metalness: 0.04
    });
    const pagesMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f1,
      roughness: 1,
      metalness: 0
    });

    const core = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.22), pagesMat);
    core.name = 'Pages';
    group.add(core);

    const front = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.04), coverMat.clone());
    front.position.z = 0.13;
    front.name = 'FrontCover';
    group.add(front);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.04), coverMat.clone());
    back.position.z = -0.13;
    back.name = 'BackCover';
    group.add(back);

    if (family === 'WRAP_1P' || family === 'WRAP_2P') {
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.24), coverMat.clone());
      spine.position.x = -0.94;
      spine.name = 'Spine';
      group.add(spine);
    }

    this.tagOwnedMaterial(core.material);
    this.tagOwnedMaterial(front.material);
    this.tagOwnedMaterial(back.material);
    return group;
  }

  private applyTexturesOnFallback(frontUrl?: string, backUrl?: string, spineUrl?: string): void {
    if (!this.activeGltfScene) {
      return;
    }

    this.activeGltfScene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const meshName = node.name.trim().toLowerCase();
      this.disposeOwnedMaterial(node.material);

      if (meshName === 'frontcover') {
        node.material = this.createCoverMaterial(frontUrl);
        this.tagOwnedMaterial(node.material);
      } else if (meshName === 'backcover') {
        node.material = this.createCoverMaterial(backUrl);
        this.tagOwnedMaterial(node.material);
      } else if (meshName === 'spine') {
        node.material = this.createCoverMaterial(spineUrl);
        this.tagOwnedMaterial(node.material);
      } else if (meshName === 'pages') {
        node.material = new THREE.MeshStandardMaterial({
          color: 0xf4f4f1,
          roughness: 1,
          metalness: 0
        });
        this.tagOwnedMaterial(node.material);
      }
    });
  }

  private handleResize(): void {
    if (!this.renderer || this.isCollapsed) {
      return;
    }

    const host = this.canvasHostRef.nativeElement;
    const width = Math.max(host.clientWidth, 120);
    const height = Math.max(host.clientHeight, 120);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private startRenderLoop(): void {
    const render = () => {
      this.animationFrame = requestAnimationFrame(render);
      if (!this.renderer || this.isCollapsed) {
        return;
      }

      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  private disposeCurrentModel(): void {
    if (!this.activeGltfScene) {
      return;
    }

    this.modelRoot.remove(this.activeGltfScene);
    this.disposeGltfScene(this.activeGltfScene);
    this.activeGltfScene = null;
    this.activeModelPath = '';
  }

  private disposeGltfScene(root: THREE.Object3D): void {
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        this.disposeOwnedMaterial(node.material);
      }
    });
  }

  private disposeOwnedMaterial(material: THREE.Material | THREE.Material[] | null | undefined): void {
    if (!material) {
      return;
    }

    if (Array.isArray(material)) {
      material.forEach((entry) => this.disposeOwnedMaterial(entry));
      return;
    }

    if (!material.userData['bookPreviewOwned']) {
      return;
    }

    const map = (material as THREE.MeshStandardMaterial).map;
    if (map) {
      map.dispose();
    }
    material.dispose();
  }

  private tagOwnedMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach((entry) => this.tagOwnedMaterial(entry));
      return;
    }
    material.userData['bookPreviewOwned'] = true;
  }
}
