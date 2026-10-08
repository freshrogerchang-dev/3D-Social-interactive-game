import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 核心生命週期測試在 node 環境執行；renderer 與 RAF 以替身注入，不代表真實 GPU 或瀏覽器已驗證。
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
