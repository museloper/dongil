import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // 로고 배경이 이미 꽉 찬 사각형이므로 여백 없이 사용
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#3182F6' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#3182F6' } },
  },
  images: ['public/logo.svg'],
});
