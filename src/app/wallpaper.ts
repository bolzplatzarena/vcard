export interface QrPlacement {
  size: number;
  left: number;
  top: number;
}

// iOS Safari refuses canvases above 16,777,216 pixels (export then yields null),
// and current phone cameras shoot well beyond that.
export const MAX_CANVAS_PIXELS = 16_777_216;

export function fitCanvas(width: number, height: number): { width: number; height: number; scale: number } {
  const scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
  return { width: Math.floor(width * scale), height: Math.floor(height * scale), scale };
}

// Lock screens show the clock at the top and notifications in the middle,
// so the QR code sits centered horizontally in the lower third.
export function placeQrCode(width: number, height: number): QrPlacement {
  const size = Math.round(Math.min(width, height) * 0.4);
  const centerY = height * 0.72;
  return {
    size,
    left: Math.round((width - size) / 2),
    top: Math.round(Math.min(centerY - size / 2, height - size)),
  };
}
