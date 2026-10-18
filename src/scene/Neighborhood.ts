import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Material, Vector3 } from 'three';
import { ParkCharacter } from '../npc/SeatedNPC';
import type { MovementObstacle } from '../input/FirstPersonController';

export const PLACES = [
  { id: 'crossing', label: '路口練習', short: '路口', start: 'road-start', x: 18, z: -4.5 },
  { id: 'dining', label: '用餐練習', short: '餐館', start: 'dining-start', x: 28, z: -5.5 },
  { id: 'toilet', label: '廁所練習', short: '廁所', start: 'toilet-start', x: 26.8, z: 3.5 },
  { id: 'sensory', label: '安靜休息', short: '休息角', start: 'sensory-start', x: 18, z: 6 },
  { id: 'boundary', label: '親友見面', short: '見面處', start: 'boundary-start', x: 28, z: 9 },
  { id: 'changes', label: '看公告牌', short: '公告牌', start: 'change-start', x: 25.8, z: -10 },
] as const;
export type Place = (typeof PLACES)[number];
export type PlaceId = Place['id'];
export const NEIGHBORHOOD_BOUNDS = { minX: -8, maxX: 34, minZ: -11, maxZ: 11 } as const;
export interface WorldSnapshot {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly place: Place | null;
  readonly travelReady: boolean;
}
type Box = { size: readonly [number, number, number]; position: readonly [number, number, number] };

/** 一次載入、同一場景中的小街區。只有步道連接公園；馬路只在斑馬線開放。 */
export class Neighborhood {
  readonly root = new Group();
  readonly companion = new ParkCharacter({
    id: 'street-mom',
    x: 18.6,
    z: -5.7,
    pose: 'standing',
    rotationY: -Math.PI / 2,
    look: {
      adult: true,
      hair: 'ponytail',
      shirt: 0x97b089,
      bottom: 'long-skirt',
      bottomColor: 0x535b6e,
    },
  });
  readonly host = new ParkCharacter({
    id: 'street-family',
    x: 30,
    z: 9,
    pose: 'standing',
    rotationY: -Math.PI / 2,
    look: { adult: true, hair: 'short', shirt: 0xa7b6c4, bottom: 'shorts', bottomColor: 0x6a6458 },
  });
  readonly residents = [this.companion, this.host] as const;
  readonly obstacles: readonly MovementObstacle[] = [
    { minX: 29, minZ: -6.4, maxX: 31, maxZ: -4.6 },
    { minX: 32.2, minZ: -7.5, maxX: 33.2, maxZ: -2.5 },
    { minX: 27, minZ: -8.3, maxX: 34, maxZ: -7.9 },
    { minX: 27, minZ: -2.1, maxX: 34, maxZ: -1.7 },
    { minX: 33.5, minZ: -8.3, maxX: 34, maxZ: -1.7 },
    { minX: 28, minZ: 0.5, maxX: 34, maxZ: 7 },
    { minX: 16.4, minZ: 6.7, maxX: 19.6, maxZ: 7.5 },
    { minX: 25.2, minZ: -11, maxX: 26.8, maxZ: -10.7 },
    { x: 30, z: 9, radius: 0.8 },
  ];
  crossingOpen = false;
  private disposed = false;
  private readonly geometries: BufferGeometry[] = [];
  private readonly owned: Material[] = [];
  private readonly textures: CanvasTexture[] = [];
  private readonly batches = new Map<MeshStandardMaterial, Box[]>();
  private readonly instances: InstancedMesh[] = [];
  private readonly box = new BoxGeometry(1, 1, 1);
  private readonly sphere = new SphereGeometry(0.12, 12, 8);
  private readonly cylinder = new CylinderGeometry(0.045, 0.045, 1, 8);
  private readonly red: MeshStandardMaterial;
  private readonly green: MeshStandardMaterial;
  private readonly door: Mesh;
  private readonly sold: Group;
  private readonly rain: Group;
  private readonly repairs: Group;

  constructor() {
    this.root.name = 'neighborhood';
    this.geometries.push(this.box, this.sphere, this.cylinder);
    const material = (h: number, s: number, l: number) => {
      const m = new MeshStandardMaterial({
        color: new Color().setHSL(h / 360, s, l),
        roughness: 0.9,
      });
      this.owned.push(m);
      return m;
    };
    const paving = material(40, 0.12, 0.73),
      road = material(210, 0.08, 0.31),
      white = material(40, 0.2, 0.9),
      wood = material(32, 0.25, 0.46),
      wall = material(35, 0.18, 0.8),
      blue = material(200, 0.22, 0.58),
      green = material(115, 0.19, 0.47),
      dark = material(170, 0.1, 0.27);
    this.red = material(10, 0.35, 0.5);
    this.green = material(135, 0.3, 0.32);
    this.add(paving, [10, 0.03, 2.6], [13, 0.02, -4.5]);
    this.add(paving, [10, 0.03, 2.6], [13, 0.02, 0]);
    this.add(paving, [4, 0.06, 22], [18, 0.03, 0]);
    this.add(paving, [10, 0.06, 22], [29, 0.03, 0]);
    this.add(road, [4, 0.04, 22], [22, 0.025, 0]);
    for (let x = 20.25; x < 24; x += 0.6) this.add(white, [0.3, 0.02, 1.8], [x, 0.06, -4.5]);
    for (const x of [19.8, 24.2])
      for (const z of [-8, 0, 8]) this.add(white, [0.08, 0.03, 1], [x, 0.065, z]);
    // 餐館正面朝西、完全開放，地面與人行道平接；桌子、櫃台與牆壁都有碰撞。
    this.add(wall, [7, 0.12, 6], [30.5, 0.08, -5]);
    this.add(wall, [0.25, 2.8, 6.6], [33.8, 1.4, -5]);
    for (const z of [-8.1, -1.9]) this.add(wall, [7, 2.6, 0.25], [30.5, 1.3, z]);
    this.add(blue, [7.5, 0.2, 6.6], [30.3, 2.9, -5]);
    this.add(wood, [2, 0.12, 1.6], [30, 0.78, -5.5]);
    for (const x of [29.2, 30.8])
      for (const z of [-6.1, -4.9]) this.add(wood, [0.12, 0.72, 0.12], [x, 0.36, z]);
    this.add(wood, [1, 1, 5], [32.7, 0.5, -5]);
    for (const z of [-6.4, -4.5]) {
      this.add(blue, [0.7, 0.12, 0.7], [28.4, 0.44, z]);
      this.add(blue, [0.1, 0.9, 0.7], [28.1, 0.55, z]);
    }
    for (const z of [-5.8, -5.2]) {
      this.add(white, [0.45, 0.03, 0.45], [30, 0.86, z]);
      this.add(blue, [0.12, 0.18, 0.12], [29.7, 0.95, z]);
    }
    // 廁所保留外觀及有隱私的入口；不展示如廁身體畫面。
    this.add(wall, [6, 2.8, 6.5], [31, 1.4, 3.75]);
    this.add(green, [6.4, 0.2, 7], [31, 2.9, 3.75]);
    this.door = new Mesh(this.box, blue);
    this.door.name = 'restroom-door';
    this.door.scale.set(0.06, 2, 1.1);
    this.door.position.set(27.85, 1, 3.5);
    this.root.add(this.door);
    this.add(white, [0.1, 1.6, 2.5], [27.78, 1.1, 1.7]);
    // 休息角與見面平台，全部靜態、無聲音／閃動。
    this.add(wood, [3.2, 0.18, 0.8], [18, 0.48, 7.1]);
    this.add(wood, [3.2, 0.65, 0.12], [18, 0.83, 7.5]);
    for (const x of [16.4, 19.6]) this.add(wood, [0.12, 2.5, 0.12], [x, 1.25, 7.5]);
    this.add(green, [4, 0.12, 2.2], [18, 2.55, 7]);
    this.add(paving, [6, 0.06, 3], [29, 0.08, 9]);
    this.add(blue, [0.14, 1.7, 1.4], [26, 1, -10.85]);
    // 示意用停妥車輛，遠離斑馬線；沒有自動車流、碰撞或倒數。
    this.add(blue, [1.6, 0.65, 3], [22, 0.45, 5]);
    this.add(wall, [1.4, 0.5, 1.4], [22, 1.02, 4.8]);
    for (const x of [21.2, 22.8])
      for (const z of [4, 6]) this.add(dark, [0.15, 0.35, 0.55], [x, 0.25, z]);
    for (const x of [19.5, 24.5]) {
      const pole = new Mesh(this.cylinder, dark);
      pole.scale.y = 2.1;
      pole.position.set(x, 1.05, -5.7);
      this.root.add(pole);
      for (const [y, m] of [
        [1.8, this.red],
        [1.48, this.green],
      ] as const) {
        const light = new Mesh(this.sphere, m);
        light.position.set(x, y, -5.7);
        light.name = y === 1.8 ? 'pedestrian-red' : 'pedestrian-green';
        this.root.add(light);
      }
    }
    this.sold = new Group();
    this.sold.name = 'sold-out-sign';
    this.root.add(this.sold);
    this.rain = new Group();
    this.rain.name = 'plan-rain-cloud';
    this.root.add(this.rain);
    const cloud = new Mesh(this.box, white);
    cloud.scale.set(4, 0.5, 2);
    cloud.position.set(28, 5, -10);
    this.rain.add(cloud);
    this.repairs = new Group();
    this.repairs.name = 'plan-repair-barrier';
    this.root.add(this.repairs);
    for (const z of [-10.7, -9.3]) {
      const m = new Mesh(this.box, wood);
      m.scale.set(2, 0.7, 0.1);
      m.position.set(32, 0.6, z);
      this.repairs.add(m);
    }
    this.sign('餐點售完', 31, 1.8, -2.12, Math.PI, this.sold);
    this.sign('公園 ←　街區 →', 10.8, 1.7, -1.3, 0);
    this.sign('餐館', 27, 2.45, -5, -Math.PI / 2);
    this.sign('公共廁所', 27.7, 2.4, 3.5, -Math.PI / 2);
    this.sign('安靜休息角', 18, 2.25, 7.55, 0);
    this.sign('親友見面處', 29, 1.9, 10.6, 0);
    this.sign('今日公告', 25.88, 1.8, -10.8, -Math.PI / 2);
    this.sign('過馬路練習', 18.8, 1.7, -6.15, 0);
    // 六個固定地點標記不旋轉、不脈動；靠近仍須明確按下開始。
    for (const place of PLACES) {
      this.add(blue, [0.9, 0.025, 0.9], [place.x, 0.09, place.z]);
    }
    this.flush();
    this.root.add(...this.residents.map((p) => p.root));
    this.reset();
  }
  get materials(): readonly Material[] {
    return this.owned;
  }
  private add(m: MeshStandardMaterial, size: Box['size'], position: Box['position']): void {
    const batch = this.batches.get(m) ?? [];
    batch.push({ size, position });
    this.batches.set(m, batch);
  }
  private flush(): void {
    const transform = new Object3D();
    for (const [m, boxes] of this.batches) {
      const mesh = new InstancedMesh(this.box, m, boxes.length);
      mesh.name = 'neighborhood-static';
      boxes.forEach((b, i) => {
        transform.position.set(...b.position);
        transform.scale.set(...b.size);
        transform.updateMatrix();
        mesh.setMatrixAt(i, transform.matrix);
      });
      mesh.computeBoundingSphere();
      this.instances.push(mesh);
      this.root.add(mesh);
    }
    this.batches.clear();
  }
  private sign(
    text: string,
    x: number,
    y: number,
    z: number,
    rotation: number,
    parent = this.root,
  ): void {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    if (typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 768;
    canvas.height = 160;
    ctx.fillStyle = '#f5f2e9';
    ctx.fillRect(0, 0, 768, 160);
    ctx.fillStyle = '#34433e';
    ctx.font = '600 60px "Noto Sans CJK TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 80, 720);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);
    const mat = new MeshBasicMaterial({ map: texture });
    this.owned.push(mat);
    const mesh = new Mesh(this.box, mat);
    mesh.scale.set(2.8, 0.58, 0.035);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    parent.add(mesh);
  }
  distanceTo(place: Place, position: Pick<Vector3, 'x' | 'z'>): number {
    const west = Math.hypot(position.x - place.x, position.z - place.z);
    return place.id === 'crossing'
      ? Math.min(west, Math.hypot(position.x - 25.5, position.z + 4.5))
      : west;
  }
  nearest(position: Pick<Vector3, 'x' | 'z'>, previous?: PlaceId | null): Place | null {
    let nearest: Place | null = null;
    let distance = Infinity;
    for (const p of PLACES) {
      const d = this.distanceTo(p, position);
      if (d < (p.id === previous ? 2.6 : 2.2) && d < distance) {
        nearest = p;
        distance = d;
      }
    }
    return nearest;
  }
  canWalk(x: number, z: number): boolean {
    const park = x >= -8 && x <= 8 && z >= -8 && z <= 8;
    const path = x >= 8 && x <= 18 && ((z >= -5.7 && z <= -3.3) || Math.abs(z) <= 1.2);
    const west = x >= 16 && x <= 20 && z >= -11 && z <= 11;
    const east = x >= 24 && x <= 34 && z >= -11 && z <= 11;
    const crossing = this.crossingOpen && x >= 20 && x <= 24 && z >= -5.35 && z <= -3.65;
    return park || path || west || east || crossing;
  }
  applyNode(node: string | null): void {
    const green =
      this.crossingOpen ||
      ['road-check', 'road-traffic', 'road-cross', 'road-walk', 'road-end'].includes(node ?? '');
    this.red.color.setHSL(10 / 360, 0.3, green ? 0.2 : 0.55);
    this.green.color.setHSL(135 / 360, 0.3, green ? 0.55 : 0.2);
    this.door.rotation.y = node === 'toilet-ready' ? Math.PI / 2 : 0;
    this.sold.visible = node === 'change-sold';
    this.rain.visible = node === 'change-rain';
    this.repairs.visible = node === 'change-repair';
  }
  follow(position: Pick<Vector3, 'x' | 'z'>, east = true): void {
    this.companion.root.rotation.y = east ? -Math.PI / 2 : Math.PI / 2;
    this.companion.root.position.set(position.x + (east ? -0.65 : 0.65), 0, position.z - 0.6);
  }
  reset(): void {
    this.crossingOpen = false;
    this.companion.root.position.set(18.6, 0, -5.7);
    this.applyNode(null);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const i of this.instances) i.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.owned) m.dispose();
    for (const t of this.textures) t.dispose();
    for (const p of this.residents) p.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }
}
