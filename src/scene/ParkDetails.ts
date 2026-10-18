import {
  BackSide,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
  SphereGeometry,
  Float32BufferAttribute,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Vec3 = readonly [number, number, number];
interface Item {
  readonly p: Vec3;
  readonly r?: Vec3;
  readonly s?: Vec3;
  readonly c?: Color;
}

/** 公園外圍的樹籬、花圃、遊具、路燈與遠景；全部靜態，不會動、不發光、不閃爍。 */
const HEDGES: readonly (readonly [number, number, number, number])[] = [
  // [x1, z1, x2, z2]：外圍一圈，留出入口、後方步道與東西向步道的開口。
  [-13, -9.6, -13, -6],
  [-13, -3, -13, 11],
  [13, -9.6, 13, -6],
  [13, -3, 13, -1.4],
  [13, 1.4, 13, 11],
  [-13, 11, -2.3, 11],
  [2.3, 11, 13, 11],
  [-13, -9.6, -2.9, -9.6],
  [2.9, -9.6, 13, -9.6],
];
const FLOWER_COLORS = [
  new Color().setHSL(350 / 360, 0.5, 0.78),
  new Color().setHSL(46 / 360, 0.55, 0.7),
  new Color().setHSL(0, 0, 0.93),
  new Color().setHSL(265 / 360, 0.3, 0.74),
  new Color().setHSL(20 / 360, 0.5, 0.74),
] as const;

export class ParkDetails {
  readonly root = new Group();
  readonly materials: readonly Material[];
  private readonly geometries: BufferGeometry[] = [];
  private readonly instances: InstancedMesh[] = [];
  private readonly textures: DataTexture[] = [];
  private readonly ownMaterials: Material[];
  private readonly tufts: InstancedMesh;
  private disposed = false;
  private seed = 271828;

  private readonly metal = new MeshStandardMaterial({
    color: new Color().setHSL(160 / 360, 0.12, 0.32),
    roughness: 0.55,
    metalness: 0.5,
  });
  private readonly hedgeCore = new MeshStandardMaterial({
    color: new Color().setHSL(105 / 360, 0.32, 0.26),
    roughness: 1,
  });
  private readonly soil = new MeshStandardMaterial({
    color: new Color().setHSL(28 / 360, 0.25, 0.3),
    roughness: 1,
  });
  private readonly plant = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  private readonly sand = new MeshStandardMaterial({
    color: new Color().setHSL(42 / 360, 0.3, 0.78),
    roughness: 1,
  });
  private readonly rubber = new MeshStandardMaterial({
    color: new Color().setHSL(200 / 360, 0.2, 0.3),
    roughness: 0.8,
  });
  private readonly lampGlass = new MeshStandardMaterial({
    color: new Color().setHSL(45 / 360, 0.3, 0.9),
    roughness: 0.4,
  });
  private readonly grass = new MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    side: DoubleSide,
    alphaTest: 0.5,
  });
  private readonly patch = new MeshBasicMaterial({
    color: new Color().setHSL(85 / 360, 0.3, 0.35),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  private readonly distant = new MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  private readonly cloud = new MeshStandardMaterial({
    color: new Color().setHSL(210 / 360, 0.2, 0.97),
    emissive: new Color().setHSL(210 / 360, 0.2, 0.35),
    roughness: 1,
    fog: false,
  });
  private readonly sky = new MeshBasicMaterial({
    vertexColors: true,
    side: BackSide,
    fog: false,
    depthWrite: false,
  });

  constructor(
    private readonly wood: MeshStandardMaterial,
    private readonly leaves: MeshStandardMaterial,
    private readonly bark: MeshStandardMaterial,
    horizon: Color,
  ) {
    this.root.name = 'park-details';
    this.ownMaterials = [
      this.metal,
      this.hedgeCore,
      this.soil,
      this.plant,
      this.sand,
      this.rubber,
      this.lampGlass,
      this.grass,
      this.patch,
      this.distant,
      this.cloud,
      this.sky,
    ];
    this.materials = this.ownMaterials;
    this.buildSky(horizon);
    this.buildHedges();
    this.buildFlowerBeds();
    this.buildPlayground();
    this.buildFurniture();
    this.buildDistance();
    this.buildGroundPatches();
    this.tufts = this.buildTufts();
  }

  /** 低細節只減少草叢數量；樹籬、花圃等形狀不變。 */
  setDetailLevel(level: 'low' | 'standard'): void {
    this.tufts.count = level === 'low' ? 600 : 1600;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const instance of this.instances) instance.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.ownMaterials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }

  /** 天空：地平線與霧同色，往上漸漸變藍；不使用後製。 */
  private buildSky(horizon: Color): void {
    const dome = this.geometry(new SphereGeometry(240, 32, 16));
    const top = new Color().setHSL(210 / 360, 0.45, 0.66);
    const position = dome.getAttribute('position');
    const colors: number[] = [];
    const color = new Color();
    for (let i = 0; i < position.count; i += 1) {
      const t = Math.max(0, position.getY(i) / 240) ** 0.6;
      color.copy(horizon).lerp(top, t);
      colors.push(color.r, color.g, color.b);
    }
    dome.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const domeMesh = new InstancedMesh(dome, this.sky, 1);
    domeMesh.name = 'park-sky';
    domeMesh.setMatrixAt(0, new Object3D().matrix);
    domeMesh.renderOrder = -1;
    this.add(domeMesh);

    const blobs: Item[] = [];
    for (let cloud = 0; cloud < 8; cloud += 1) {
      const angle = (cloud / 8) * Math.PI * 2 + this.random() * 0.5;
      const distance = 150 + this.random() * 50;
      const cx = Math.cos(angle) * distance;
      const cz = Math.sin(angle) * distance;
      const cy = 38 + this.random() * 30;
      const parts = 4 + Math.floor(this.random() * 3);
      for (let part = 0; part < parts; part += 1) {
        const size = 6 + this.random() * 6;
        blobs.push({
          p: [
            cx + (part - parts / 2) * 7 + this.random() * 3,
            cy + this.random() * 3,
            cz + this.random() * 5,
          ],
          s: [size * 1.4, size * 0.55, size],
        });
      }
    }
    this.instanced('park-clouds', new IcosahedronGeometry(1, 2), this.cloud, blobs);
  }

  /** 外圍樹籬：深綠底塊外面貼上葉片，與樹共用葉子貼圖。 */
  private buildHedges(): void {
    const cores: Item[] = [];
    const leaves: Item[] = [];
    const leafColor = (): Color =>
      new Color().setHSL((95 + this.random() * 20) / 360, 0.3, 0.4 + this.random() * 0.14);
    for (const [x1, z1, x2, z2] of HEDGES) {
      const length = Math.hypot(x2 - x1, z2 - z1);
      const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      cores.push({ p: [cx, 0.42, cz], s: alongX ? [length, 0.84, 0.72] : [0.72, 0.84, length] });
      const count = Math.round(length * 34);
      for (let i = 0; i < count; i += 1) {
        const t = this.random() - 0.5;
        const face = this.random();
        const side = this.random() < 0.5 ? -1 : 1;
        // 頂面約 40%，兩側各 30%；略往外凸，邊緣看起來蓬鬆。
        const y = face < 0.4 ? 0.86 + this.random() * 0.06 : 0.1 + this.random() * 0.78;
        const out = face < 0.4 ? (this.random() - 0.5) * 0.7 : side * (0.38 + this.random() * 0.06);
        leaves.push({
          p: alongX ? [cx + t * length, y, cz + out] : [cx + out, y, cz + t * length],
          r: [this.random() * Math.PI, this.random() * Math.PI * 2, this.random() * Math.PI],
          s: this.uniform(0.55 + this.random() * 0.4),
          c: leafColor(),
        });
      }
    }
    // 圓形灌木點綴在入口兩側與角落。
    const bushes: Vec3[] = [
      [-3.6, 0, -9.0],
      [3.6, 0, -9.0],
      [-11.8, 0, 9.8],
      [11.8, 0, 9.8],
      [-11.9, 0, -2.2],
      [11.9, 0, -2.2],
      [-3.4, 0, 10.2],
      [3.4, 0, 10.2],
    ];
    for (const [bx, , bz] of bushes) {
      const radius = 0.5 + this.random() * 0.2;
      cores.push({ p: [bx, radius * 0.75, bz], s: [radius * 1.9, radius * 1.5, radius * 1.9] });
      for (let i = 0; i < 80; i += 1) {
        const theta = this.random() * Math.PI * 2;
        const phi = Math.acos(this.random() * 1.1 - 0.1);
        leaves.push({
          p: [
            bx + Math.sin(phi) * Math.cos(theta) * radius,
            radius * 0.75 + Math.cos(phi) * radius * 0.8,
            bz + Math.sin(phi) * Math.sin(theta) * radius,
          ],
          r: [this.random() * Math.PI, this.random() * Math.PI * 2, this.random() * Math.PI],
          s: this.uniform(0.5 + this.random() * 0.35),
          c: leafColor(),
        });
      }
    }
    const coreBox = new BoxGeometry(1, 1, 1);
    this.instanced('park-hedge-cores', coreBox, this.hedgeCore, cores.slice(0, HEDGES.length));
    this.instanced(
      'park-bush-cores',
      new IcosahedronGeometry(0.5, 1),
      this.hedgeCore,
      cores.slice(HEDGES.length),
    );
    const leaf = new PlaneGeometry(0.48, 0.68);
    const uv = leaf.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * 0.45);
    this.instanced('park-hedge-leaves', leaf, this.leaves, leaves);
  }

  /** 樹籬內側的花圃：泥土、低矮葉叢與柔和顏色的花（同色成群，不是彩虹點點）。 */
  private buildFlowerBeds(): void {
    const beds: Item[] = [];
    const stems: Item[] = [];
    const heads: Item[] = [];
    const clumps: Item[] = [];
    const stemColor = new Color().setHSL(100 / 360, 0.35, 0.38);
    for (const [x1, z1, x2, z2] of HEDGES) {
      const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
      // 花圃在樹籬朝公園中心那一側。
      const inward = alongX ? -Math.sign(z1) * 0.95 : -Math.sign(x1) * 0.95;
      const length = Math.hypot(x2 - x1, z2 - z1) - 0.6;
      const cx = (x1 + x2) / 2 + (alongX ? 0 : inward);
      const cz = (z1 + z2) / 2 + (alongX ? inward : 0);
      beds.push({ p: [cx, 0.035, cz], s: alongX ? [length, 0.07, 0.9] : [0.9, 0.07, length] });
      let color = FLOWER_COLORS[0];
      for (let d = -length / 2; d < length / 2; d += 0.12) {
        if (this.random() < 0.09)
          color = FLOWER_COLORS[Math.floor(this.random() * FLOWER_COLORS.length)] ?? color;
        const across = (this.random() - 0.5) * 0.7;
        const x = alongX ? cx + d : cx + across;
        const z = alongX ? cz + across : cz + d;
        if (this.random() < 0.3) {
          clumps.push({
            p: [x, 0.08, z],
            s: [0.16 + this.random() * 0.08, 0.1, 0.16 + this.random() * 0.08],
            c: new Color().setHSL(105 / 360, 0.35, 0.3 + this.random() * 0.08),
          });
          continue;
        }
        const height = 0.22 + this.random() * 0.2;
        stems.push({ p: [x, height / 2, z], s: [1, height, 1], c: stemColor });
        const shade = color.clone().offsetHSL(0, 0, (this.random() - 0.5) * 0.06);
        heads.push({
          p: [x, height + 0.02, z],
          r: [0, this.random() * Math.PI, 0],
          s: [1, 0.55, 1],
          c: shade,
        });
      }
    }
    this.instanced('park-flower-beds', new BoxGeometry(1, 1, 1), this.soil, beds);
    this.instanced('park-flower-clumps', new IcosahedronGeometry(1, 1), this.plant, clumps);
    this.instanced('park-flower-stems', new CylinderGeometry(0.007, 0.01, 1, 5), this.plant, stems);
    this.instanced('park-flowers', new IcosahedronGeometry(0.045, 1), this.plant, heads);
  }

  /** 鞦韆（靜止）與沙坑，放在可走範圍外，只當背景。 */
  private buildPlayground(): void {
    const metalBars: Item[] = [];
    const woodBoxes: Item[] = [];
    const seats: Item[] = [];
    // 鞦韆：x -10.6，橫桿沿 z；A 字形支架，兩個座椅面向公園中央（+x）。
    const sx = -10.6;
    const sz = -7.6;
    const bar = (a: Vec3, b: Vec3, radius = 1): void => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      const length = Math.hypot(dx, dy, dz);
      const helper = new Object3D();
      helper.lookAt(dx, dy, dz);
      helper.rotateX(Math.PI / 2);
      metalBars.push({
        p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
        r: [helper.rotation.x, helper.rotation.y, helper.rotation.z],
        s: [radius, length, radius],
      });
    };
    bar([sx, 2.25, sz - 1.5], [sx, 2.25, sz + 1.5], 1.2);
    for (const end of [-1.4, 1.4])
      for (const leg of [-0.85, 0.85]) bar([sx, 2.25, sz + end], [sx + leg, 0, sz + end * 1.08]);
    for (const offset of [-0.65, 0.65]) {
      for (const chain of [-0.2, 0.2])
        bar([sx, 2.25, sz + offset + chain], [sx, 0.5, sz + offset + chain], 0.35);
      seats.push({ p: [sx, 0.48, sz + offset], s: [0.2, 0.04, 0.48] });
    }
    // 沙坑：木框與沙。
    const bx = 10.4;
    const bz = -7.6;
    woodBoxes.push(
      { p: [bx, 0.1, bz - 1.05], s: [2.3, 0.2, 0.12] },
      { p: [bx, 0.1, bz + 1.05], s: [2.3, 0.2, 0.12] },
      { p: [bx - 1.1, 0.1, bz], s: [0.12, 0.2, 2.1] },
      { p: [bx + 1.1, 0.1, bz], s: [0.12, 0.2, 2.1] },
    );
    this.instanced('park-sandbox-sand', new BoxGeometry(2.1, 0.12, 2), this.sand, [
      { p: [bx, 0.06, bz] },
    ]);
    // 第二張長椅（右側，面向公園中央）與野餐桌（左側）。
    const benchX = 10.7;
    const benchZ = 2.6;
    for (const dz of [-0.1, 0.05, 0.2])
      woodBoxes.push({ p: [benchX + dz, 0.46, benchZ], s: [0.12, 0.04, 1.7] });
    for (const dy of [0.62, 0.78])
      woodBoxes.push({ p: [benchX + 0.3, dy, benchZ], r: [0, 0, 0.12], s: [0.04, 0.12, 1.7] });
    for (const dz of [-0.7, 0.7]) {
      metalBars.push({ p: [benchX + 0.05, 0.22, benchZ + dz], s: [0.7, 0.44, 0.7] });
      metalBars.push({ p: [benchX + 0.3, 0.6, benchZ + dz], s: [0.6, 0.4, 0.6] });
    }
    const tx = -10.6;
    const tz = 2.2;
    for (const dx of [-0.3, -0.1, 0.1, 0.3])
      woodBoxes.push({ p: [tx + dx, 0.75, tz], s: [0.18, 0.05, 1.8] });
    for (const dx of [-0.65, 0.65]) woodBoxes.push({ p: [tx + dx, 0.45, tz], s: [0.3, 0.05, 1.8] });
    for (const dz of [-0.7, 0.7]) {
      woodBoxes.push({ p: [tx, 0.37, tz + dz], s: [1.5, 0.06, 0.08] });
      woodBoxes.push({ p: [tx - 0.25, 0.37, tz + dz], r: [0, 0, 0.5], s: [0.07, 0.8, 0.08] });
      woodBoxes.push({ p: [tx + 0.25, 0.37, tz + dz], r: [0, 0, -0.5], s: [0.07, 0.8, 0.08] });
    }
    this.instanced('park-wood-props', new BoxGeometry(1, 1, 1), this.wood, woodBoxes);
    this.instanced('park-swing-seats', new BoxGeometry(1, 1, 1), this.rubber, seats);
    this.instanced(
      'park-metal-bars',
      new CylinderGeometry(0.035, 0.035, 1, 8),
      this.metal,
      metalBars,
    );
  }

  /** 路燈（不發光）、垃圾桶、入口柱頂與招牌、幾顆石頭。 */
  private buildFurniture(): void {
    const lamps: Vec3[] = [
      [-2.7, 0, -9.0],
      [2.7, 0, -9.0],
      [-2.7, 0, 9.8],
      [2.7, 0, 9.8],
      [-9.2, 0, -2.9],
      [9.2, 0, -2.9],
    ];
    const poles: Item[] = [];
    const bases: Item[] = [];
    const glass: Item[] = [];
    const caps: Item[] = [];
    for (const [x, , z] of lamps) {
      poles.push({ p: [x, 1.6, z], s: [1, 3.2, 1] });
      bases.push({ p: [x, 0.15, z], s: [2.2, 0.3, 2.2] });
      glass.push({ p: [x, 3.32, z] });
      caps.push({ p: [x, 3.55, z] });
    }
    // 垃圾桶與入口柱頂。
    bases.push(
      { p: [3.3, 0.4, -8.8], s: [5.5, 0.8, 5.5] },
      { p: [-9.3, 0.4, 4.2], s: [5.5, 0.8, 5.5] },
    );
    caps.push(
      { p: [-2.2, 2.42, -9.6], s: [1.2, 0.6, 1.2] },
      { p: [2.2, 2.42, -9.6], s: [1.2, 0.6, 1.2] },
    );
    this.instanced('park-lamp-poles', new CylinderGeometry(0.045, 0.06, 1, 10), this.metal, poles);
    this.instanced('park-metal-bases', new CylinderGeometry(0.05, 0.05, 1, 14), this.metal, bases);
    this.instanced(
      'park-lamp-glass',
      new CylinderGeometry(0.11, 0.13, 0.3, 12),
      this.lampGlass,
      glass,
    );
    this.instanced('park-lamp-caps', new ConeGeometry(0.2, 0.18, 12), this.metal, caps);
    // 入口橫梁上的空白木牌（不放文字）。
    this.instanced('park-gate-sign', new BoxGeometry(1.6, 0.42, 0.07), this.wood, [
      { p: [0, 2.55, -9.6] },
    ]);
    const rocks: Item[] = [];
    const rockSpots: readonly (readonly [number, number])[] = [
      [-10.6, -1.4],
      [9.4, -2.1],
      [-11.4, 7.5],
      [11.2, 7.9],
      [-4.4, -8.8],
      [5.0, 9.4],
      [12, -6.8],
      [-12.1, 5.2],
    ];
    for (const [x, z] of rockSpots) {
      const size = 0.18 + this.random() * 0.22;
      rocks.push({
        p: [x, size * 0.35, z],
        r: [this.random(), this.random() * Math.PI, this.random()],
        s: [size * 1.3, size * 0.8, size],
        c: new Color().setHSL(40 / 360, 0.06, 0.55 + this.random() * 0.1),
      });
    }
    this.instanced('park-rocks', new DodecahedronGeometry(1, 0), this.plant, rocks);
  }

  /** 遠景：一圈樹與淡淡的建築輪廓，交給霧變淡，讓地平線不再空白。 */
  private buildDistance(): void {
    const trunks: Item[] = [];
    const crowns: Item[] = [];
    for (let i = 0; i < 60; i += 1) {
      const angle = this.random() * Math.PI * 2;
      const distance = 45 + this.random() * 30;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const height = 3 + this.random() * 2.5;
      trunks.push({ p: [x, height / 2, z], s: [1, height, 1] });
      // 樹冠由多個小團組成，輪廓比單一圓球自然。
      const hue = 95 + this.random() * 25;
      const crown = 2.2 + this.random() * 0.8;
      for (let part = 0; part < 7; part += 1) {
        const angle = this.random() * Math.PI * 2;
        const spread = this.random() * crown * 0.75;
        const size = crown * (0.45 + this.random() * 0.25);
        crowns.push({
          p: [
            x + Math.cos(angle) * spread,
            height + crown * 0.5 + (this.random() - 0.3) * crown * 0.9,
            z + Math.sin(angle) * spread,
          ],
          s: [size, size * 0.85, size],
          c: new Color().setHSL(
            (hue + (this.random() - 0.5) * 8) / 360,
            0.28,
            0.3 + this.random() * 0.1,
          ),
        });
      }
    }
    this.instanced('park-distant-trunks', new CylinderGeometry(0.2, 0.3, 1, 8), this.bark, trunks);
    const buildings: Item[] = [];
    for (let i = 0; i < 22; i += 1) {
      const angle = (i / 22) * Math.PI * 2 + this.random() * 0.15;
      const distance = 72 + this.random() * 16;
      const width = 9 + this.random() * 12;
      const height = 8 + this.random() * 16;
      buildings.push({
        p: [Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance],
        r: [0, -angle, 0],
        s: [8 + this.random() * 6, height, width],
        c: new Color().setHSL(
          (25 + this.random() * 190) / 360,
          0.05 + this.random() * 0.08,
          0.76 + this.random() * 0.12,
        ),
      });
    }
    // 樹冠與建築共用同一個材質，顏色放在 instance 上。
    this.instanced('park-distant-crowns', new IcosahedronGeometry(1, 2), this.distant, crowns);
    this.instanced('park-buildings', new BoxGeometry(1, 1, 1), this.distant, buildings);
  }

  /** 草地上淡淡的深色區塊，打破貼圖重複感。 */
  private buildGroundPatches(): void {
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y += 1)
      for (let x = 0; x < 64; x += 1) {
        const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        const index = (y * 64 + x) * 4;
        pixels.fill(255, index, index + 3);
        pixels[index + 3] = Math.round(Math.max(0, 1 - radius) ** 1.5 * 255);
      }
    this.patch.map = this.texture(pixels, 64);
    const patches: Item[] = [];
    for (let i = 0; i < 46; i += 1) {
      const x = (this.random() - 0.5) * 40;
      const z = (this.random() - 0.5) * 40;
      if (Math.abs(x) < 2.4) continue;
      const size = 3 + this.random() * 5;
      patches.push({
        p: [x, 0.003, z],
        r: [-Math.PI / 2, 0, this.random() * Math.PI],
        s: [size * 1.4, size, 1],
      });
    }
    this.instanced('park-grass-patches', new PlaneGeometry(1, 1), this.patch, patches);
  }

  /** 草叢：兩片交叉的草葉貼圖；避開步道、溜滑梯與沙坑。 */
  private buildTufts(): InstancedMesh {
    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    for (let blade = 0; blade < 11; blade += 1) {
      const base = 6 + this.random() * 52;
      const lean = (this.random() - 0.5) * 22;
      const height = (0.45 + this.random() * 0.55) * size;
      const width = 2 + this.random() * 1.5;
      for (let y = 0; y < height; y += 1) {
        const t = y / height;
        const center = base + lean * t * t;
        const half = width * (1 - t);
        for (let x = Math.floor(center - half); x <= Math.ceil(center + half); x += 1) {
          if (x < 0 || x >= size) continue;
          const index = (y * size + x) * 4;
          pixels[index] = 255;
          pixels[index + 1] = 255;
          pixels[index + 2] = 255;
          pixels[index + 3] = 255;
        }
      }
    }
    this.grass.alphaMap = this.texture(pixels, size);
    const planeA = new PlaneGeometry(0.3, 0.16).translate(0, 0.08, 0);
    const planeB = planeA.clone().rotateY(Math.PI / 2);
    const tuft = mergeGeometries([planeA, planeB]);
    planeA.dispose();
    planeB.dispose();
    const items: Item[] = [];
    while (items.length < 1600) {
      const x = (this.random() - 0.5) * 25;
      const z = (this.random() - 0.5) * 25;
      if (Math.abs(x) < 2.1 || Math.abs(z + 4.5) < 1.45) continue;
      if (x > 7.5 && Math.abs(z) < 1.5) continue;
      if (x > 5.7 && x < 7.3 && z > -7.6 && z < -4.1) continue;
      if (Math.abs(x - 10.4) < 1.3 && Math.abs(z + 7.6) < 1.2) continue;
      const scale = 0.6 + this.random() * 0.5;
      items.push({
        p: [x, 0, z],
        r: [0, this.random() * Math.PI, 0],
        s: [scale, scale * (0.8 + this.random() * 0.5), scale],
        c: new Color().setHSL((85 + this.random() * 18) / 360, 0.4, 0.26 + this.random() * 0.08),
      });
    }
    return this.instanced('park-grass-tufts', tuft, this.grass, items);
  }

  private texture(pixels: Uint8Array, size: number): DataTexture {
    const texture = new DataTexture(pixels, size, size, RGBAFormat);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.textures.push(texture);
    return texture;
  }

  private instanced(
    name: string,
    geometry: BufferGeometry,
    material: Material,
    items: readonly Item[],
  ): InstancedMesh {
    this.geometry(geometry);
    const mesh = new InstancedMesh(geometry, material, items.length);
    mesh.name = name;
    const transform = new Object3D();
    items.forEach((item, index) => {
      transform.position.set(...item.p);
      transform.rotation.set(...(item.r ?? [0, 0, 0]));
      transform.scale.set(...(item.s ?? [1, 1, 1]));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      if (item.c) mesh.setColorAt(index, item.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    this.add(mesh);
    return mesh;
  }

  private add(mesh: InstancedMesh): void {
    this.instances.push(mesh);
    this.root.add(mesh);
  }

  private geometry<T extends BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry);
    return geometry;
  }

  private uniform(size: number): Vec3 {
    return [size, size, size];
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}
