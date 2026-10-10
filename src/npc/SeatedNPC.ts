import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three';
import type { BufferGeometry, Vector3Like } from 'three';
import type { CircularObstacle } from '../input/FirstPersonController';

/** 單一靜止坐姿工程人形；不追人、不轉頭、不開口，也沒有排程或動畫。 */
export class SeatedNPC {
  readonly root = new Group();
  readonly obstacle: CircularObstacle = { x: 0, z: -2, radius: 1.2 };
  readonly materials = [
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.3, 0.72), roughness: 0.9 }),
    new MeshStandardMaterial({ color: new Color().setHSL(205 / 360, 0.25, 0.5), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(215 / 360, 0.15, 0.3), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.18, 0.25), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.3, 0.45), roughness: 0.95 }),
  ] as const;
  private readonly geometries: BufferGeometry[] = [];
  private disposed = false;

  constructor() {
    this.root.name = 'park-friend';
    this.root.position.set(this.obstacle.x, 0, this.obstacle.z);
    const [skin, shirt, trousers, hair, wood] = this.materials;
    this.addPart('bench-seat', new BoxGeometry(1.8, 0.1, 0.46), wood, 0, 0.45, 0);
    this.addPart('bench-back', new BoxGeometry(1.8, 0.5, 0.08), wood, 0, 0.75, -0.25);
    for (const x of [-0.7, 0.7]) {
      for (const z of [-0.15, 0.15])
        this.addPart('bench-leg', new BoxGeometry(0.09, 0.4, 0.09), wood, x, 0.2, z);
    }
    this.addPart('body', new CapsuleGeometry(0.15, 0.2, 4, 12), shirt, 0, 0.72, 0);
    this.addPart('head', new SphereGeometry(0.15, 16, 12), skin, 0, 1.06, 0);
    const cap = this.addPart(
      'hair',
      new SphereGeometry(0.152, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
      0,
      1.08,
      0,
    );
    cap.rotation.z = 0.05;
    this.addPart('hips', new BoxGeometry(0.32, 0.12, 0.22), trousers, 0, 0.51, 0.04);
    for (const side of [-1, 1]) {
      const thigh = this.addPart(
        'thigh',
        new CapsuleGeometry(0.065, 0.2, 4, 10),
        trousers,
        side * 0.09,
        0.49,
        0.18,
      );
      thigh.rotation.x = Math.PI / 2;
      this.addPart(
        'shin',
        new CapsuleGeometry(0.055, 0.25, 4, 10),
        trousers,
        side * 0.09,
        0.24,
        0.32,
      );
      this.addPart('shoe', new BoxGeometry(0.13, 0.08, 0.22), hair, side * 0.09, 0.06, 0.38);
      this.addPart(
        'upper-arm',
        new CapsuleGeometry(0.045, 0.2, 4, 10),
        shirt,
        side * 0.2,
        0.69,
        0.02,
      );
      const arm = this.addPart(
        'forearm',
        new CapsuleGeometry(0.04, 0.15, 4, 10),
        skin,
        side * 0.2,
        0.54,
        0.14,
      );
      arm.rotation.x = Math.PI / 2;
      this.addPart('hand', new SphereGeometry(0.05, 10, 8), skin, side * 0.2, 0.54, 0.25);
    }
  }

  distanceTo(position: Vector3Like): number {
    return Math.hypot(position.x - this.obstacle.x, position.z - this.obstacle.z);
  }

  /** 接近／離開採不同門檻，避免邊界反覆改字；不偵測眼神或鏡頭朝向。 */
  isNear(position: Vector3Like, wasNear: boolean): boolean {
    return this.distanceTo(position) <= (wasNear ? 3.2 : 2.8);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }

  private addPart(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial,
    x: number,
    y: number,
    z: number,
  ): Mesh {
    this.geometries.push(geometry);
    const part = new Mesh(geometry, material);
    part.name = name;
    part.position.set(x, y, z);
    this.root.add(part);
    return part;
  }
}
