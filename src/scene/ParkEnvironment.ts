import {
  BoxGeometry,
  DataTexture,
  MeshBasicMaterial,
  RGBAFormat,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import { ParkDetails } from './ParkDetails';

/** 靜態背景與本地 CC0 貼圖；只有本場景持有資源，不使用 RAF 或全域快取。 */
export class ParkEnvironment {
  readonly root = new Group();
  readonly materials = [
    new MeshStandardMaterial({ color: new Color().setHSL(38 / 360, 0.12, 0.72), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.18, 0.56), roughness: 0.85 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.12, 0.58), roughness: 1 }),
    new MeshStandardMaterial({
      color: new Color().setHSL(95 / 360, 0.12, 0.92),
      roughness: 1,
      side: DoubleSide,
      alphaTest: 0.5,
    }),
  ] as const;
  private readonly geometries: BufferGeometry[] = [];
  private readonly textures = new Set<Texture>();
  private readonly instances: InstancedMesh[] = [];
  /** 樹籬、花圃、遊具、路燈與遠景。 */
  readonly details: ParkDetails;
  private disposed = false;
  private readonly shadowMaterial = new MeshBasicMaterial({
    color: new Color().setHSL(75 / 360, 0.1, 0.12),
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  private seed = 314159;
  private readonly surfaceMaterials: readonly MeshStandardMaterial[];
  private readonly loaded = new Set<string>();
  private readonly failed = new Set<string>();

  constructor(
    ground: MeshStandardMaterial,
    bench: MeshStandardMaterial,
    loadTextures = false,
    horizon = new Color(0xd6e2ea),
  ) {
    this.surfaceMaterials = [ground, bench, ...this.materials];
    this.root.name = 'park-environment';
    const [stone, wood, bark, leaves] = this.materials;
    const path = this.mesh(new PlaneGeometry(3.6, 60), stone, 'park-path');
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0.004;
    const crossPath = this.mesh(new PlaneGeometry(48, 2.4), stone, 'park-cross-path');
    crossPath.rotation.x = -Math.PI / 2;
    crossPath.position.set(0, 0.006, -4.5);
    const crossUV = crossPath.geometry.getAttribute('uv');
    for (let i = 0; i < crossUV.count; i += 1)
      crossUV.setXY(i, (crossUV.getX(i) * 48) / 3.6, (crossUV.getY(i) * 2.4) / 60);
    const curb = this.mesh(new BoxGeometry(0.12, 0.08, 60), stone, 'path-edge-left');
    curb.position.set(-1.86, -0.025, 0);
    const otherCurb = this.mesh(new BoxGeometry(0.12, 0.08, 60), stone, 'path-edge-right');
    otherCurb.position.set(1.86, -0.025, 0);

    const positions = [
      [-10, -2],
      [10, -3],
      [-12, -12],
      [11, -13],
      [-3.8, -11],
      [4.2, -12],
      [-16, -21],
      [16, -22],
      [-12, 12],
      [37, 12],
      [-21, 1],
      [37, 2],
    ] as const;
    const trunkGeometry = new CylinderGeometry(0.18, 0.31, 4.8, 12, 3);
    const branchGeometry = new CylinderGeometry(0.025, 0.13, 1, 8);
    const leafGeometry = new PlaneGeometry(0.48, 0.68);
    const uv = leafGeometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * 0.45);
    this.geometries.push(trunkGeometry, branchGeometry, leafGeometry);
    const trunks = new InstancedMesh(trunkGeometry, bark, positions.length);
    trunks.name = 'park-tree-trunks';
    const branches = new InstancedMesh(branchGeometry, bark, positions.length * 7);
    branches.name = 'park-tree-branches';
    this.instances.push(trunks, branches);
    let treeIndex = 0;
    let branchIndex = 0;
    const foliage = new InstancedMesh(leafGeometry, leaves, positions.length * 650);
    foliage.name = 'park-leaves';
    this.instances.push(foliage);
    const transform = new Object3D();

    for (const [x, z] of positions) {
      const height = 0.9 + this.random() * 0.35;
      transform.position.set(x, 2.4 * height, z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, height, 1);
      transform.updateMatrix();
      trunks.setMatrixAt(treeIndex, transform.matrix);
      treeIndex += 1;
      for (let branch = 0; branch < 7; branch += 1) {
        const angle = (branch / 7) * Math.PI * 2 + this.random() * 0.3;
        const start = new Vector3(x, (2.2 + branch * 0.26) * height, z);
        const end = new Vector3(
          x + Math.cos(angle) * 1.9,
          (4.4 + this.random()) * height,
          z + Math.sin(angle) * 1.9,
        );
        transform.position.copy(start).add(end).multiplyScalar(0.5);
        transform.quaternion.setFromUnitVectors(
          new Vector3(0, 1, 0),
          end.clone().sub(start).normalize(),
        );
        transform.scale.set(1, start.distanceTo(end), 1);
        transform.updateMatrix();
        branches.setMatrixAt(branchIndex, transform.matrix);
        branchIndex += 1;
      }
      for (let leaf = 0; leaf < 650; leaf += 1) {
        const angle = this.random() * Math.PI * 2;
        const radius = Math.sqrt(this.random()) * 2.65;
        transform.position.set(
          x + Math.cos(angle) * radius,
          (4.5 + (this.random() - 0.5) * 2.8) * height,
          z + Math.sin(angle) * radius,
        );
        transform.rotation.set(
          this.random() * Math.PI,
          this.random() * Math.PI * 2,
          this.random() * Math.PI,
        );
        const size = 0.8 + this.random() * 0.7;
        transform.scale.setScalar(size);
        transform.updateMatrix();
        const instance = leaf * positions.length + treeIndex - 1;
        foliage.setMatrixAt(instance, transform.matrix);
        foliage.setColorAt(
          instance,
          new Color().setHSL((88 + this.random() * 20) / 360, 0.1, 0.87 + this.random() * 0.1),
        );
      }
    }
    foliage.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
    foliage.computeBoundingSphere();
    trunks.computeBoundingSphere();
    branches.computeBoundingSphere();
    this.root.add(trunks, branches, foliage);
    // 靜態接觸陰影，不開即時 shadow map，也沒有時間變化。
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        const index = (y * 64 + x) * 4;
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
        pixels[index + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 255);
      }
    }
    const shadowTexture = new DataTexture(pixels, 64, 64, RGBAFormat);
    shadowTexture.needsUpdate = true;
    this.textures.add(shadowTexture);
    this.shadowMaterial.map = shadowTexture;
    const shadowGeometry = new PlaneGeometry(1, 1);
    this.geometries.push(shadowGeometry);
    const shadows = new InstancedMesh(shadowGeometry, this.shadowMaterial, positions.length + 1);
    shadows.name = 'park-contact-shadows';
    transform.rotation.set(-Math.PI / 2, 0, 0);
    positions.forEach(([x, z], index) => {
      transform.position.set(x, 0.008, z);
      transform.scale.set(6, 5, 1);
      transform.updateMatrix();
      shadows.setMatrixAt(index, transform.matrix);
    });
    transform.position.set(0, 0.009, -2);
    transform.scale.set(2.5, 1.5, 1);
    transform.updateMatrix();
    shadows.setMatrixAt(positions.length, transform.matrix);
    shadows.computeBoundingSphere();
    this.instances.push(shadows);
    this.root.add(shadows);
    this.details = new ParkDetails(wood, leaves, bark, horizon);
    this.root.add(this.details.root);

    // 貼圖非阻塞載入；缺檔保留材質底色，安全 UI 與場景不等候網路。
    if (loadTextures) {
      this.surface('grass_ground', ground, new Vector2(80, 80));
      this.surface('concrete_pavement', stone, new Vector2(3, 36));
      this.surface('wood_planks', wood, new Vector2(1, 1));
      bench.color.setHSL(30 / 360, 0.12, 0.7);
      bench.map = wood.map;
      bench.normalMap = wood.normalMap;
      bench.normalScale.setScalar(0.15);
      this.surface('bark_willow', bark, new Vector2(1, 2));
      leaves.map = this.texture('leaves-color.jpg', true, new Vector2(1, 1));
      leaves.alphaMap = this.texture('leaves-alpha.jpg', false, new Vector2(1, 1));
    }
  }

  setDetailLevel(level: 'low' | 'standard'): void {
    const foliage = this.instances.find((mesh) => mesh.name === 'park-leaves');
    if (foliage) foliage.count = level === 'low' ? 3000 : 7800;
    this.details.setDetailLevel(level);
  }

  get assetStatus(): { loaded: number; failed: number } {
    return { loaded: this.loaded.size, failed: this.failed.size };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.details.dispose();
    for (const instance of this.instances) instance.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.shadowMaterial.dispose();
    for (const texture of this.textures) texture.dispose();
    this.textures.clear();
    this.root.clear();
    this.root.removeFromParent();
  }

  private surface(asset: string, material: MeshStandardMaterial, repeat: Vector2): void {
    material.map = this.texture(`${asset}-color.jpg`, true, repeat);
    material.normalMap = this.texture(`${asset}-normal.jpg`, false, repeat);
    material.normalScale.setScalar(0.18);
  }

  private texture(file: string, color: boolean, repeat: Vector2): Texture {
    const texture = new TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/park/${file}`,
      () => {
        if (!this.disposed) this.loaded.add(file);
      },
      undefined,
      () => {
        if (this.disposed) return;
        this.failed.add(file);
        for (const material of this.surfaceMaterials) {
          if (material.map === texture) material.map = null;
          if (material.normalMap === texture) material.normalMap = null;
          if (material.alphaMap === texture) material.alphaMap = null;
          material.needsUpdate = true;
        }
      },
    );
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.copy(repeat);
    texture.anisotropy = 2;
    if (color) texture.colorSpace = SRGBColorSpace;
    this.textures.add(texture);
    return texture;
  }

  private mesh(geometry: BufferGeometry, material: MeshStandardMaterial, name: string): Mesh {
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    this.root.add(mesh);
    return mesh;
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
