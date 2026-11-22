import { fitCanvas, MAX_CANVAS_PIXELS, placeQrCode } from './wallpaper';

describe('fitCanvas', () => {
  it('keeps images below the canvas limit unchanged', () => {
    expect(fitCanvas(1170, 2532)).toEqual({ width: 1170, height: 2532, scale: 1 });
  });

  it('scales a 48 MP photo below the limit and keeps the aspect ratio', () => {
    const { width, height, scale } = fitCanvas(6048, 8064);
    expect(width * height).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
    expect(scale).toBeLessThan(1);
    expect(width / height).toBeCloseTo(6048 / 8064, 2);
  });
});

describe('placeQrCode', () => {
  it('scales with a portrait photo and sits in the lower third', () => {
    const { size, left, top } = placeQrCode(3000, 4000);
    expect(size).toBe(1200);
    expect(left).toBe(900);
    expect(top).toBeGreaterThan(4000 / 2);
    expect(top + size).toBeLessThanOrEqual(4000);
  });

  it('stays inside a landscape image', () => {
    const { size, left, top } = placeQrCode(4000, 1000);
    expect(size).toBe(400);
    expect(left).toBe(1800);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + size).toBeLessThanOrEqual(1000);
  });
});
