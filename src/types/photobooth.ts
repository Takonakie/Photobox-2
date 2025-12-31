// src/types/photobooth.ts

export type PhotoData = {
  id: string;
  src: string;       // Foto Asli (Base64)
  aiSrc?: string;    // Foto AI (Base64) - Nanti diisi di Stage 3
  filter: string;    // CSS Filter
  useAI: boolean;
};

export type LayoutConfig = {
  id: string;
  name: string;
  type: 'strip' | 'grid' | 'wide';
  slots: number;       // Jumlah foto yang harus dipotret (3 atau 4)
  aspectRatio: string; // 'aspect-[3/4]' atau 'aspect-square'
  cssClass?: string;   // Custom styling
};

export const LAYOUTS: LayoutConfig[] = [
  { id: 'strip-3', name: 'Classic Strip', type: 'strip', slots: 3, aspectRatio: 'aspect-[4/3]' },
  { id: 'grid-4', name: '4-Cut Grid', type: 'grid', slots: 4, aspectRatio: 'aspect-[4/3]' },
  { id: 'wide-4', name: 'Wide Story', type: 'wide', slots: 4, aspectRatio: 'aspect-video' },
];