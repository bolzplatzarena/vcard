import { ChangeDetectionStrategy, Component, ElementRef, ErrorHandler, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Canvas as FabricCanvas, FabricImage, Point } from 'fabric';
import QRCodeStyling, { Options } from 'qr-code-styling';
import { buildVCard, Contact, toQrData } from './vcard';
import { saveFile } from './save-file';
import { clampQrBox, fitCanvas, placeQrCode } from './wallpaper';

// pink-600, the accent color of the UI (see styles.css).
const ACCENT_COLOR = '#db2777';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: ['label:has(.ng-invalid.ng-touched) { color: var(--color-red-600); box-shadow: inset 3px 0 var(--color-red-600) }'],
    imports: [ReactiveFormsModule]
})
export class AppComponent implements OnInit {
  // static: the preview is rendered from ngOnInit for restored data, before the first change detection.
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLElement>;
  @ViewChild('fullcanvas', { static: false }) fullCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewArea', { static: false }) previewArea!: ElementRef<HTMLElement>;
  @ViewChild('backgroundInput', { static: false }) backgroundInput!: ElementRef<HTMLInputElement>;

  private fullFabricCanvas?: FabricCanvas;

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly errorHandler = inject(ErrorHandler);

  protected readonly error = signal<string | undefined>(undefined);

  protected readonly form = this.formBuilder.group({
    givenName: ['', [Validators.required]],
    familyName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    mobile: ['', [Validators.required]],
    address: [''],
  });
  protected readonly qrConfig: Partial<Options> = {
    // Shown at 200px; 3x keeps it sharp on phone displays and gives the download a usable resolution.
    width: 600,
    height: 600,
    margin: 0,
    dotsOptions: {
      color: '#1977f3',
      type: 'dots',
    },
    // Finder patterns drawn as separate dots break the 1:1:3:1:1 ratio scanners look for,
    // which fails at high resolutions; solid corners keep the code readable.
    cornersSquareOptions: {
      color: '#1977f3',
      type: 'extra-rounded',
    },
    cornersDotOptions: {
      color: '#1977f3',
      type: 'dot',
    },
    backgroundOptions: {
      color: 'transparent',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 0,
    },
  };

  protected readonly advancedEnabled = signal(false);

  ngOnInit(): void {
    try {
      const data: unknown = JSON.parse(localStorage.getItem('data') ?? 'null');
      if (data && typeof data === 'object') {
        this.form.patchValue(data as Partial<Contact>);
      }
    } catch {
      // Corrupt entry or blocked storage: start with an empty form; the next change overwrites the entry.
    }
    this.updatePreview();
    this.form.valueChanges.subscribe(value => {
      try {
        localStorage.setItem('data', JSON.stringify(value));
      } catch {
        // Storage full or blocked: the form keeps working, it just isn't remembered.
      }
      this.updatePreview();
    });
  }

  // Live preview: the QR code follows the form as soon as all required fields are valid.
  private updatePreview(): void {
    if (this.form.invalid) {
      this.canvas.nativeElement.replaceChildren();
      return;
    }
    void this.report('Der QR-Code konnte nicht erstellt werden. Sind die Angaben vielleicht zu lang?', () => {
      this.showQrCode();
    });
  }

  protected download(): Promise<void> {
    // The button is disabled then anyway; returning early avoids a misleading "could not save" message.
    if (this.form.invalid) {
      return Promise.resolve();
    }
    return this.report('Der QR-Code konnte nicht gespeichert werden.', async () => {
      // getRawData waits for the asynchronous drawing; reading the canvas right away can export a blank image.
      const png = await this.showQrCode()?.getRawData('png');
      if (!(png instanceof Blob)) {
        throw new Error('QR code export returned no image');
      }
      await saveFile(png, 'vcard-qr.png');
    });
  }

  // Shows a readable message to the user and hands the technical error to Angular's ErrorHandler.
  private async report(message: string, action: () => void | Promise<void>): Promise<void> {
    this.error.set(undefined);
    try {
      await action();
    } catch (error) {
      this.errorHandler.handleError(error);
      this.error.set(message);
    }
  }

  private showQrCode(): QRCodeStyling | undefined {
    if (this.form.invalid) {
      return undefined;
    }
    const qrCode = this.createQrCode(this.qrConfig);
    this.canvas.nativeElement.replaceChildren();
    qrCode.append(this.canvas.nativeElement);
    return qrCode;
  }

  private createQrCode(config: Partial<Options>): QRCodeStyling {
    return new QRCodeStyling({ ...config, data: toQrData(buildVCard(this.form.getRawValue())) });
  }

  protected openBackgroundPicker(): void {
    if (this.form.invalid) {
      return;
    }
    this.backgroundInput.nativeElement.click();
  }

  protected onBackgroundSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset right away so picking the same file again triggers another change event.
    input.value = '';
    if (!file) {
      return Promise.resolve();
    }
    if (!file.type.startsWith('image/')) {
      this.error.set('Bitte wähle eine Bilddatei aus.');
      return Promise.resolve();
    }
    return this.report(
      'Das Hintergrundbild konnte nicht erstellt werden. Bitte versuche ein anderes Bild (JPG oder PNG).',
      () => this.generateAdvanced(file),
    );
  }

  private async generateAdvanced(backgroundFile: File): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const background = await this.loadImage(backgroundFile);
    const { width, height, scale: imageScale } = fitCanvas(background.width, background.height);
    background.set({ scaleX: imageScale, scaleY: imageScale, selectable: false, evented: false });
    // Fabric 7 positions objects by their center by default; anchor at the top-left corner instead.
    background.setPositionByOrigin(new Point(0, 0), 'left', 'top');

    // Rendered once at the largest allowed size and shown scaled down, so resizing never upscales (blurs) the code.
    const maxSize = Math.min(width, height);
    const png = await this.createQrCode({
      ...this.qrConfig,
      width: maxSize,
      height: maxSize,
      margin: Math.round(maxSize * 0.06),
      // A white quiet zone keeps the code scannable on dark or busy photos.
      backgroundOptions: { color: '#ffffff' },
    }).getRawData('png');
    if (!(png instanceof Blob)) {
      return;
    }
    const qrImage = await this.loadImage(png);

    // Export keeps the full resolution; the preview is only scaled down via CSS to fit the screen.
    // Fit the area between hint and bottom bar, so the bar never covers part of the image.
    const area = this.previewArea.nativeElement;
    const previewScale = Math.min(area.clientWidth / width, area.clientHeight / height, 1);
    // Handles and border are drawn in image pixels, so convert them to a finger-friendly on-screen size.
    // Small visible handles, but a finger-sized touch target.
    const handleSize = 18 / previewScale;
    qrImage.set({
      lockRotation: true,
      lockScalingFlip: true,
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerColor: '#ffffff',
      cornerStrokeColor: ACCENT_COLOR,
      borderColor: ACCENT_COLOR,
      cornerSize: handleSize,
      touchCornerSize: 44 / previewScale,
      borderScaleFactor: 2 / previewScale,
    });
    // Only the corners: they scale proportionally, side handles would distort the code.
    qrImage.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false });
    const { size, left, top } = placeQrCode(width, height);
    qrImage.scale(size / maxSize);
    qrImage.setPositionByOrigin(new Point(left, top), 'left', 'top');

    await this.fullFabricCanvas?.dispose();
    const fullCanvas = new FabricCanvas(this.fullCanvas.nativeElement, { width, height, selection: false });
    fullCanvas.setDimensions({ width: `${width * previewScale}px`, height: `${height * previewScale}px` }, { cssOnly: true });
    const clampToImage = (): void => {
      const topLeft = qrImage.getPointByOrigin('left', 'top');
      const box = clampQrBox({ size: qrImage.getScaledWidth(), left: topLeft.x, top: topLeft.y }, width, height);
      qrImage.scale(box.size / maxSize);
      qrImage.setPositionByOrigin(new Point(box.left, box.top), 'left', 'top');
      qrImage.setCoords();
    };
    fullCanvas.on('object:moving', clampToImage);
    fullCanvas.on('object:scaling', clampToImage);
    fullCanvas.add(background, qrImage);
    // Selected from the start so the handles show that the code can be moved and resized.
    fullCanvas.setActiveObject(qrImage);
    fullCanvas.renderAll();
    this.fullFabricCanvas = fullCanvas;
    this.advancedEnabled.set(true);
  }

  private async loadImage(blob: Blob): Promise<FabricImage> {
    const url = URL.createObjectURL(blob);
    try {
      return await FabricImage.fromURL(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  protected downloadAdvanced(): Promise<void> {
    return this.report('Das Hintergrundbild konnte nicht gespeichert werden.', async () => {
      if (!this.fullFabricCanvas) {
        return;
      }
      const png = await this.fullFabricCanvas.toBlob({ format: 'png', multiplier: 1 });
      if (!png) {
        throw new Error('Wallpaper export returned no image');
      }
      await saveFile(png, 'vcard-wallpaper.png');
    });
  }

  protected closeAdvanced(): void {
    this.advancedEnabled.set(false);
    void this.fullFabricCanvas?.dispose();
    this.fullFabricCanvas = undefined;
  }
}
