export interface QrPlacement {
  size: number;
  left: number;
  top: number;
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
