import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { BufferGeometry, Vector3Like } from 'three';
import type { CircularObstacle } from '../input/FirstPersonController';

/** 單一坐姿工程人形；僅明確互動觸發單次動作，不追人或追蹤視線。 */
export class SeatedNPC {
  readonly root = new Group();
  readonly obstacle: CircularObstacle = { x: 0, z: -2, radius: 1.2 };
  readonly materials = [
    new MeshStandardMaterial({ color: new Color().setHSL(28 / 360, 0.42, 0.69), roughness: 0.9 }),
    new MeshStandardMaterial({ color: new Color().setHSL(155 / 360, 0.24, 0.61), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(215 / 360, 0.18, 0.37), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(25 / 360, 0.32, 0.16), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.3, 0.45), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(30 / 360, 0.2, 0.94), roughness: 0.9 }),
    new MeshStandardMaterial({ color: new Color().setHSL(25 / 360, 0.25, 0.17), roughness: 0.8 }),
    new MeshStandardMaterial({ color: new Color().setHSL(8 / 360, 0.48, 0.64), roughness: 0.95 }),
    new MeshStandardMaterial({ color: new Color().setHSL(40 / 360, 0.4, 0.64), roughness: 0.95 }),
  ] as const;
  private readonly geometries: BufferGeometry[] = [];
  private disposed = false;
  private gesture: 'wave' | 'nod' | null = null;
  private gestureTime = 0;
  private motionEnabled = true;
  private readonly headPivot = new Group();
  private readonly armPivot = new Group();

  constructor() {
    this.root.name = 'park-friend';
    this.root.position.set(this.obstacle.x, 0, this.obstacle.z);
    const [skin, shirt, trousers, hair, wood, ivory, eyes, blush, accent] = this.materials;
    for (let slat = 0; slat < 4; slat += 1) {
      this.addPart(
        'bench-seat',
        new BoxGeometry(1.8, 0.065, 0.105),
        wood,
        0,
        0.45,
        -0.18 + slat * 0.12,
      );
      this.addPart(
        'bench-back',
        new BoxGeometry(1.8, 0.1, 0.065),
        wood,
        0,
        0.61 + slat * 0.13,
        -0.25,
      );
    }
    for (const x of [-0.82, 0.82]) {
      this.addPart('bench-arm', new BoxGeometry(0.08, 0.06, 0.46), wood, x, 0.65, 0);
      this.addPart('bench-arm-support', new BoxGeometry(0.06, 0.2, 0.06), wood, x, 0.54, 0.12);
    }
    for (const x of [-0.7, 0.7]) {
      for (const z of [-0.15, 0.15])
        this.addPart('bench-leg', new BoxGeometry(0.09, 0.4, 0.09), hair, x, 0.2, z);
    }
    const body = this.addPart('body', new CapsuleGeometry(0.15, 0.18, 6, 16), shirt, 0, 0.71, 0);
    body.scale.set(1.1, 1, 0.88);
    this.addPart('neck', new CapsuleGeometry(0.045, 0.055, 4, 12), skin, 0, 0.93, 0);
    const collar = this.addPart(
      'collar',
      new TorusGeometry(0.06, 0.013, 6, 20),
      ivory,
      0,
      0.916,
      0,
    );
    collar.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const badge = this.addPart(
        'leaf-badge',
        new SphereGeometry(0.016, 8, 6),
        accent,
        0.065 + side * 0.008,
        0.76,
        0.139,
      );
      badge.scale.set(0.65, 1.5, 0.3);
      badge.rotation.z = side * 0.5;
    }
    this.headPivot.position.set(0, 0.94, 0);
    this.headPivot.name = 'head-pivot';
    this.root.add(this.headPivot);
    const face = (
      name: string,
      geometry: BufferGeometry,
      material: MeshStandardMaterial,
      x: number,
      y: number,
      z: number,
    ): Mesh => {
      const part = this.addPart(name, geometry, material, x, y, z);
      this.headPivot.attach(part);
      return part;
    };
    const head = face('head', new SphereGeometry(0.17, 24, 16), skin, 0, 1.075, 0);
    head.scale.set(1.05, 1.12, 0.95);
    const cap = face(
      'hair',
      new SphereGeometry(0.176, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      hair,
      0,
      1.12,
      -0.008,
    );
    cap.scale.set(1.05, 0.9, 1);
    // 圓潤、非照片級臉部；眼睛朝向固定，不追蹤玩家或要求對視。
    for (const side of [-1, 1]) {
      const ear = face('ear', new SphereGeometry(0.036, 12, 8), skin, side * 0.17, 1.064, -0.008);
      ear.scale.set(0.65, 1, 0.8);
      const white = face(
        'eye-white',
        new SphereGeometry(0.032, 16, 10),
        ivory,
        side * 0.063,
        1.09,
        0.146,
      );
      white.scale.set(0.9, 1.05, 0.3);
      const pupil = face('eye', new SphereGeometry(0.023, 16, 10), eyes, side * 0.063, 1.09, 0.156);
      pupil.scale.set(0.85, 1.04, 0.35);
      face('eye-glint', new SphereGeometry(0.007, 8, 6), ivory, side * 0.063 - 0.005, 1.099, 0.166);
      const brow = face(
        'eyebrow',
        new TorusGeometry(0.033, 0.004, 5, 12, Math.PI),
        hair,
        side * 0.065,
        1.129,
        0.142,
      );
      brow.scale.y = 0.35;
      const cheek = face(
        'cheek',
        new SphereGeometry(0.029, 12, 8),
        blush,
        side * 0.105,
        1.045,
        0.133,
      );
      cheek.scale.set(1, 0.48, 0.22);
    }
    const nose = face('nose', new SphereGeometry(0.023, 12, 8), skin, 0, 1.046, 0.162);
    nose.scale.set(0.75, 0.8, 1);
    const smile = face(
      'smile',
      new TorusGeometry(0.035, 0.0045, 6, 16, Math.PI),
      eyes,
      0,
      1.016,
      0.154,
    );
    smile.rotation.z = Math.PI;
    smile.scale.y = 0.48;
    for (let tuft = 0; tuft < 5; tuft++) {
      const lock = face(
        'hair-lock',
        new SphereGeometry(0.048, 12, 8),
        hair,
        -0.108 + tuft * 0.051,
        1.175 + tuft * 0.008,
        0.104,
      );
      lock.scale.set(1.05, 0.58 + (4 - tuft) * 0.025, 0.7);
      lock.rotation.z = -0.25;
    }
    this.armPivot.position.set(-0.2, 0.83, 0.02);
    this.root.add(this.armPivot);
    const hips = this.addPart(
      'hips',
      new CapsuleGeometry(0.1, 0.12, 4, 12),
      trousers,
      0,
      0.51,
      0.04,
    );
    hips.rotation.z = Math.PI / 2;
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
      this.addPart('knee', new SphereGeometry(0.062, 12, 8), trousers, side * 0.09, 0.408, 0.32);
      this.addPart(
        'shin',
        new CapsuleGeometry(0.055, 0.25, 4, 10),
        trousers,
        side * 0.09,
        0.24,
        0.32,
      );
      this.addPart(
        'sock',
        new CapsuleGeometry(0.058, 0.035, 4, 10),
        ivory,
        side * 0.09,
        0.11,
        0.32,
      );
      const shoe = this.addPart(
        'shoe',
        new CapsuleGeometry(0.066, 0.075, 4, 12),
        ivory,
        side * 0.09,
        0.065,
        0.38,
      );
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.z = 0.7;
      const sole = this.addPart(
        'shoe-sole',
        new CapsuleGeometry(0.064, 0.074, 4, 12),
        trousers,
        side * 0.09,
        0.024,
        0.38,
      );
      sole.rotation.x = Math.PI / 2;
      sole.scale.z = 0.22;
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
      const hand = this.addPart(
        'hand',
        new SphereGeometry(0.05, 12, 8),
        skin,
        side * 0.2,
        0.54,
        0.25,
      );
      hand.scale.set(0.85, 0.6, 1.08);
      this.addPart('thumb', new SphereGeometry(0.02, 8, 6), skin, side * 0.167, 0.553, 0.258);
    }
    for (const part of [...this.root.children]) {
      if (part.position.x < 0 && ['upper-arm', 'forearm', 'hand', 'thumb'].includes(part.name))
        this.armPivot.attach(part);
    }
  }

  setMotionEnabled(enabled: boolean): void {
    this.motionEnabled = enabled;
    if (!enabled) this.resetGesture();
  }

  playGesture(gesture: 'wave' | 'nod' | null): void {
    this.resetGesture();
    if (!this.disposed && this.motionEnabled) this.gesture = gesture;
  }

  /** 共用引擎模擬 delta，僅單次柔和動作；暫停不更新，不自動循環。 */
  update(delta: number): void {
    if (this.disposed || !this.gesture || !Number.isFinite(delta) || delta <= 0) return;
    this.gestureTime = Math.min(1.6, this.gestureTime + Math.min(delta, 0.05));
    const envelope = Math.sin((Math.PI * this.gestureTime) / 1.6) ** 2;
    if (this.gesture === 'nod') this.headPivot.rotation.x = 0.16 * envelope;
    else this.armPivot.rotation.z = -2 * envelope;
    if (this.gestureTime >= 1.6) this.resetGesture();
  }

  private resetGesture(): void {
    this.gesture = null;
    this.gestureTime = 0;
    this.headPivot.rotation.x = 0;
    this.armPivot.rotation.z = 0;
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
    this.resetGesture();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.headPivot.clear();
    this.armPivot.clear();
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
