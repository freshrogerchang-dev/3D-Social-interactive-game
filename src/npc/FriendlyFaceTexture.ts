import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three';

/** 原創程序繪製的臉部貼圖；不連線、不使用人物照片，也不需要 DOM canvas。 */
export function createFriendlyFaceTexture(): DataTexture {
  const width = 512,
    height = 256;
  const data = new Uint8Array(width * height * 4);
  const skin = [238, 182, 148] as const;
  const ellipse = (u: number, v: number, x: number, y: number, rx: number, ry: number): number =>
    ((u - x) / rx) ** 2 + ((v - y) / ry) ** 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1),
        v = y / (height - 1);
      let r: number = skin[0],
        g: number = skin[1],
        b: number = skin[2];
      const blend = (color: readonly [number, number, number], alpha: number): void => {
        r += (color[0] - r) * alpha;
        g += (color[1] - g) * alpha;
        b += (color[2] - b) * alpha;
      };
      // 正面在 sphere UV u=0.25；淡腮紅是表面漸層，沒有凸起圓塊。
      for (const side of [-1, 1]) {
        const cheek = ellipse(u, v, 0.25 + side * 0.081, 0.445, 0.032, 0.038);
        blend([220, 142, 124], 0.38 * Math.exp(-cheek * 2.5));
        const eyeX = 0.25 + side * 0.052;
        const eye = ellipse(u, v, eyeX, 0.533, 0.025, 0.038);
        if (eye < 1) blend([247, 237, 218], 0.98);
        const iris = ellipse(u, v, eyeX, 0.532, 0.017, 0.032);
        if (iris < 1) blend([86, 64, 48], 1);
        if (ellipse(u, v, eyeX, 0.53, 0.009, 0.024) < 1) blend([43, 35, 29], 1);
        if (ellipse(u, v, eyeX - 0.006, 0.546, 0.0045, 0.0065) < 1) blend([250, 243, 229], 0.95);
        const browX = (u - eyeX) / 0.028;
        const browY = 0.604 - 0.012 * browX ** 2;
        if (Math.abs(browX) < 1 && Math.abs(v - browY) < 0.0045) blend([91, 66, 46], 0.95);
        const lidX = (u - eyeX) / 0.025;
        const lidY = 0.533 + 0.038 * Math.sqrt(Math.max(0, 1 - lidX ** 2));
        if (Math.abs(lidX) < 1 && Math.abs(v - lidY) < 0.0025) blend([110, 75, 53], 0.65);
      }
      // 小鼻翼陰影與向上嘴角，避免蒼白唇形／無表情細線。
      const nose = ellipse(u, v, 0.25, 0.46, 0.016, 0.013);
      blend([187, 124, 94], Math.exp(-nose * 2.5) * 0.22);
      const smileX = (u - 0.25) / 0.038;
      const smileY = 0.393 + 0.026 * smileX ** 2;
      if (Math.abs(smileX) < 1 && Math.abs(v - smileY) < 0.006) blend([123, 66, 55], 0.96);
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(r);
      data[offset + 1] = Math.round(g);
      data[offset + 2] = Math.round(b);
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.name = 'original-friendly-face';
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
