import {
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';

/**
 * 吹出來的泡泡：從泡泡棒慢慢飄上去、稍微變大，最後縮小消失（不突然閃現或爆開）。
 * 由人物的 update 驅動；停用動作時全部隱藏。
 */
export class Bubbles {
  readonly mesh: InstancedMesh;
  readonly material = new MeshStandardMaterial({
    color: new Color().setHSL(200 / 360, 0.35, 0.9),
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  private readonly geometry = new SphereGeometry(1, 16, 12);
  private readonly ages: number[];
  private readonly lives: number[];
  private readonly drift: Vector3[];
  private readonly transform = new Object3D();
  private seed: number;
  private enabled = true;

  constructor(
    private readonly origin: Vector3,
    count = 14,
    seed = 7,
  ) {
    this.seed = seed;
    this.mesh = new InstancedMesh(this.geometry, this.material, count);
    this.mesh.name = 'bubbles';
    this.mesh.frustumCulled = false;
    this.ages = [];
    this.lives = [];
    this.drift = [];
    for (let i = 0; i < count; i += 1) {
      this.lives.push(4 + this.random() * 2.5);
      // 錯開出生時間：一開始就有幾顆在空中。
      this.ages.push(-i * 0.45 + 2.5);
      this.drift.push(this.direction());
    }
    this.place();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.mesh.visible = enabled;
  }

  update(delta: number): void {
    if (!this.enabled || !Number.isFinite(delta) || delta <= 0) return;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < this.ages.length; i += 1) {
      const age = (this.ages[i] ?? 0) + dt;
      const life = this.lives[i] ?? 5;
      if (age > life) {
        this.ages[i] = 0;
        this.lives[i] = 4 + this.random() * 2.5;
        this.drift[i] = this.direction();
      } else {
        this.ages[i] = age;
      }
    }
    this.place();
  }

  /** 材質由持有泡泡的人物一起釋放（放在人物的 materials 裡）。 */
  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.mesh.removeFromParent();
  }

  private place(): void {
    for (let i = 0; i < this.ages.length; i += 1) {
      const age = this.ages[i] ?? 0;
      const life = this.lives[i] ?? 5;
      const drift = this.drift[i] ?? new Vector3();
      // 還沒出生：縮成 0 藏在泡泡棒裡。
      const grow = Math.max(0, Math.min(1, age / 0.6));
      const fade = Math.max(0, Math.min(1, (life - age) / 0.6));
      const size = age < 0 ? 0 : (0.03 + 0.035 * Math.min(1, age / 2)) * grow * fade;
      const t = Math.max(0, age);
      this.transform.position
        .copy(this.origin)
        .addScaledVector(drift, t)
        .add(new Vector3(0.03 * Math.sin(t * 1.7 + i), 0, 0.03 * Math.cos(t * 1.3 + i)));
      this.transform.scale.setScalar(size);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** 往前、往上慢慢飄（每秒約 0.1–0.2 公尺）。 */
  private direction(): Vector3 {
    return new Vector3(
      (this.random() - 0.5) * 0.12,
      0.14 + this.random() * 0.1,
      0.08 + this.random() * 0.1,
    );
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
