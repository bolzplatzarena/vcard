import { Canvas2dFilterBackend, FabricImage, filters, setFilterBackend } from 'fabric';

// Global: applies to every Fabric filter in the app.
// The WebGL backend splits images above its texture size (4096 px) into tiles and phones' limits vary;
// the canvas backend handles every size the canvas itself allows.
setFilterBackend(new Canvas2dFilterBackend());

type ImageFilters = FabricImage['filters'];

export const PHOTO_FILTERS = [
  { id: 'original', name: 'Original', create: (): ImageFilters => [] },
  { id: 'sw', name: 'Schwarz-Weiß', create: (): ImageFilters => [new filters.Grayscale()] },
  { id: 'sepia', name: 'Sepia', create: (): ImageFilters => [new filters.Sepia()] },
  { id: 'vintage', name: 'Vintage', create: (): ImageFilters => [new filters.Vintage()] },
  { id: 'polaroid', name: 'Polaroid', create: (): ImageFilters => [new filters.Polaroid()] },
  // Calms a busy photo so the code stands out.
  { id: 'gedimmt', name: 'Gedimmt', create: (): ImageFilters => [new filters.Brightness({ brightness: -0.25 })] },
  { id: 'pink', name: 'Pink', create: (): ImageFilters => [new filters.Grayscale(), new filters.BlendColor({ color: '#db2777', mode: 'tint', alpha: 0.4 })] },
] as const satisfies readonly { id: string; name: string; create: () => ImageFilters }[];

export type PhotoFilterId = (typeof PHOTO_FILTERS)[number]['id'];

export function applyPhotoFilter(image: FabricImage, id: PhotoFilterId): void {
  image.filters = PHOTO_FILTERS.find(filter => filter.id === id)?.create() ?? [];
  image.applyFilters();
}
