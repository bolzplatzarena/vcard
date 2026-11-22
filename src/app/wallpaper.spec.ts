import { placeQrCode } from './wallpaper';

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
