import { DEFAULT_QR_STYLE, parseQrStyle, toQrOptions } from './qr-style';

describe('parseQrStyle', () => {
  it('keeps a valid stored style', () => {
    expect(parseQrStyle({ shape: 'elegant', color: 'gruen' })).toEqual({ shape: 'elegant', color: 'gruen' });
  });

  it.each([null, 42, 'eckig', {}, { shape: 'herz', color: '#ff0000' }])('falls back to the default for %j', value => {
    expect(parseQrStyle(value)).toEqual(DEFAULT_QR_STYLE);
  });

  it('replaces only the unknown part', () => {
    expect(parseQrStyle({ shape: 'eckig', color: 'lila' })).toEqual({ shape: 'eckig', color: 'blau' });
  });
});

describe('toQrOptions', () => {
  it('uses one color for dots and corners', () => {
    expect(toQrOptions({ shape: 'eckig', color: 'schwarz' })).toEqual({
      dotsOptions: { color: '#111827', type: 'square' },
      cornersSquareOptions: { color: '#111827', type: 'square' },
      cornersDotOptions: { color: '#111827', type: 'square' },
    });
  });
});
