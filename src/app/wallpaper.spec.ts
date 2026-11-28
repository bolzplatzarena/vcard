import { carryOverQrBox, clampQrBox, fitCanvas, MAX_CANVAS_PIXELS, placeQrCode } from './wallpaper';

describe('carryOverQrBox', () => {
  it('keeps the relative position and size on a background with another resolution', () => {
    expect(carryOverQrBox({ size: 400, left: 100, top: 1000 }, { width: 1000, height: 2000 }, { width: 2000, height: 4000 }))
      .toEqual({ size: 800, left: 200, top: 2000 });
  });

  it('keeps the code on a background with another aspect ratio', () => {
    const box = carryOverQrBox({ size: 1000, left: 0, top: 1000 }, { width: 1000, height: 2000 }, { width: 2000, height: 1000 });
    expect(box.size).toBe(1000);
    expect(box.top + box.size).toBeLessThanOrEqual(1000);
    expect(box.left).toBe(500);
  });
});

describe('clampQrBox', () => {
  it('leaves a box inside the image unchanged', () => {
    expect(clampQrBox({ size: 400, left: 100, top: 200 }, 1000, 2000)).toEqual({ size: 400, left: 100, top: 200 });
  });

  it('pushes a box that was dragged out of the image back inside', () => {
    expect(clampQrBox({ size: 400, left: -50, top: 1900 }, 1000, 2000)).toEqual({ size: 400, left: 0, top: 1600 });
    expect(clampQrBox({ size: 400, left: 900, top: -10 }, 1000, 2000)).toEqual({ size: 400, left: 600, top: 0 });
  });

  it('keeps the size between the scannable minimum and the shorter image side', () => {
    expect(clampQrBox({ size: 10, left: 0, top: 0 }, 1000, 2000).size).toBe(150);
    expect(clampQrBox({ size: 5000, left: 0, top: 0 }, 1000, 2000)).toEqual({ size: 1000, left: 0, top: 0 });
  });
});

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
