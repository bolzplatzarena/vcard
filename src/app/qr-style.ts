import { Options } from 'qr-code-styling';

// Finder patterns (the three corners) stay solid in every shape: scanners look for their 1:1:3:1:1 ratio.
export const QR_SHAPES = [
  { id: 'punkte', name: 'Punkte', dots: 'dots', corners: 'extra-rounded', cornerDots: 'dot' },
  { id: 'eckig', name: 'Eckig', dots: 'square', corners: 'square', cornerDots: 'square' },
  { id: 'rund', name: 'Rund', dots: 'rounded', corners: 'extra-rounded', cornerDots: 'dot' },
  { id: 'elegant', name: 'Elegant', dots: 'classy-rounded', corners: 'extra-rounded', cornerDots: 'square' },
] as const;

// Dark enough on the white quiet zone for phone cameras.
export const QR_COLORS = [
  { id: 'blau', name: 'Blau', value: '#1977f3' },
  { id: 'schwarz', name: 'Schwarz', value: '#111827' },
  { id: 'pink', name: 'Pink', value: '#db2777' },
  { id: 'gruen', name: 'Grün', value: '#047857' },
] as const;

export type QrShapeId = (typeof QR_SHAPES)[number]['id'];
export type QrColorId = (typeof QR_COLORS)[number]['id'];

export interface QrStyle {
  shape: QrShapeId;
  color: QrColorId;
}

export const DEFAULT_QR_STYLE: QrStyle = { shape: 'punkte', color: 'blau' };

// Accepts anything read from storage and falls back to the default for unknown values.
export function parseQrStyle(value: unknown): QrStyle {
  const stored = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    shape: QR_SHAPES.find(shape => shape.id === stored['shape'])?.id ?? DEFAULT_QR_STYLE.shape,
    color: QR_COLORS.find(color => color.id === stored['color'])?.id ?? DEFAULT_QR_STYLE.color,
  };
}

export function toQrOptions(style: QrStyle): Pick<Options, 'dotsOptions' | 'cornersSquareOptions' | 'cornersDotOptions'> {
  const shape = QR_SHAPES.find(s => s.id === style.shape) ?? QR_SHAPES[0];
  const color = (QR_COLORS.find(c => c.id === style.color) ?? QR_COLORS[0]).value;
  return {
    dotsOptions: { color, type: shape.dots },
    cornersSquareOptions: { color, type: shape.corners },
    cornersDotOptions: { color, type: shape.cornerDots },
  };
}
