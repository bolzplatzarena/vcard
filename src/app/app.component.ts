import { ChangeDetectionStrategy, Component, ElementRef, ErrorHandler, OnInit, ViewChild, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Canvas as FabricCanvas, FabricImage, Point } from 'fabric';
import QRCodeStyling, { Options } from 'qr-code-styling';
import { debounceTime } from 'rxjs';
import { buildVCard, Contact, toQrData } from './vcard';
import { applyPhotoFilter, PHOTO_FILTERS, PhotoFilterId } from './photo-filters';
import { DEFAULT_QR_STYLE, parseQrStyle, QR_COLORS, QR_SHAPES, QrStyle, toQrOptions } from './qr-style';
import { saveFile } from './save-file';
import { carryOverQrBox, clampQrBox, fitCanvas, placeQrCode, QrPlacement, WALLPAPER_PRESETS } from './wallpaper';

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

  @ViewChild('main', { static: true }) main!: ElementRef<HTMLElement>;
  // A signal query changes only when the banner appears or disappears, not when its message changes.
  protected readonly banner = viewChild<ElementRef<HTMLElement>>('banner');

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
  protected readonly qrShapes = QR_SHAPES;
  protected readonly qrColors = QR_COLORS;
  protected readonly qrStyle = signal<QrStyle>(DEFAULT_QR_STYLE);

  private get qrConfig(): Partial<Options> {
    return {
      // Shown at 200px; 3x keeps it sharp on phone displays and gives the download a usable resolution.
      width: 600,
      height: 600,
      // White with a quiet zone (same 6% as the wallpaper): the saved code stays scannable in dark galleries.
      margin: 36,
      ...toQrOptions(this.qrStyle()),
      backgroundOptions: {
        color: '#ffffff',
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 0,
      },
    };
  }

  protected readonly advancedEnabled = signal(false);
  protected readonly presets = WALLPAPER_PRESETS;
  // A preset id or 'photo' for the user's own picture.
  protected readonly background = signal<string>(WALLPAPER_PRESETS[0].id);
  // While a background loads, further picks wait; two at once would both rebuild the same canvas.
  protected readonly loading = signal(false);
  // Where the user left the QR code, carried over when the background changes.
  private qrBox?: { box: QrPlacement; width: number; height: number };
  protected readonly photoFilters = PHOTO_FILTERS;
  // Stays selected when the background changes, so trying backgrounds keeps the chosen look.
  protected readonly photoFilter = signal<PhotoFilterId>('original');
  private backgroundImage?: FabricImage;

  constructor() {
    // The banner shortens the scroll area from below; scroll along so what was visible there stays visible.
    afterRenderEffect(() => {
      const banner = this.banner();
      if (banner && !this.advancedEnabled()) {
        this.main.nativeElement.scrollTop += banner.nativeElement.offsetHeight;
      }
    });
  }

  ngOnInit(): void {
    try {
      const data: unknown = JSON.parse(localStorage.getItem('data') ?? 'null');
      if (data && typeof data === 'object') {
        this.form.patchValue(data as Partial<Contact>);
      }
    } catch {
      // Corrupt entry or blocked storage: start with an empty form; the next change overwrites the entry.
    }
    try {
      this.qrStyle.set(parseQrStyle(JSON.parse(localStorage.getItem('qrStyle') ?? 'null')));
    } catch {
      // Same as above: keep the default style.
    }
    this.updatePreview();
    this.form.valueChanges.subscribe(value => {
      try {
        localStorage.setItem('data', JSON.stringify(value));
      } catch {
        // Storage full or blocked: the form keeps working, it just isn't remembered.
      }
    });
    // Drawing takes noticeably long on slow phones, so wait for a pause in typing.
    this.form.valueChanges.pipe(debounceTime(150)).subscribe(() => this.updatePreview());
  }

  protected changeQrStyle(change: Partial<QrStyle>): void {
    this.qrStyle.update(style => ({ ...style, ...change }));
    try {
      localStorage.setItem('qrStyle', JSON.stringify(this.qrStyle()));
    } catch {
      // Storage full or blocked: the style applies, it just isn't remembered.
    }
    this.updatePreview();
  }

  // Live preview: the QR code follows the form as soon as all required fields are valid.
  private updatePreview(): void {
    try {
      this.showQrCode();
      this.error.set(undefined);
    } catch (error) {
      this.showError('Der QR-Code konnte nicht erstellt werden. Sind die Angaben vielleicht zu lang?', error);
    }
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
      this.showError(message, error);
    }
  }

  private showError(message: string, error: unknown): void {
    this.errorHandler.handleError(error);
    this.error.set(message);
  }

  private showQrCode(): QRCodeStyling | undefined {
    // First, so that no outdated code stays visible if the new one cannot be created.
    this.canvas.nativeElement.replaceChildren();
    if (this.form.invalid) {
      return undefined;
    }
    const qrCode = this.createQrCode(this.qrConfig);
    qrCode.append(this.canvas.nativeElement);
    return qrCode;
  }

  private createQrCode(config: Partial<Options>): QRCodeStyling {
    return new QRCodeStyling({ ...config, data: toQrData(buildVCard(this.form.getRawValue())) });
  }

  // Opens the wallpaper view with the last chosen preset; own photos are picked from there.
  protected openWallpaper(): Promise<void> {
    const preset = this.presets.find(p => p.id === this.background()) ?? this.presets[0];
    return this.choosePreset(preset.id);
  }

  protected choosePreset(id: string): Promise<void> {
    return this.switchBackground('Das Hintergrundbild konnte nicht geladen werden.', id, async () => {
      const response = await fetch(`assets/wallpapers/${id}.jpg`);
      if (!response.ok) {
        throw new Error(`Preset ${id} could not be loaded: ${response.status}`);
      }
      return response.blob();
    });
  }

  private switchBackground(message: string, selection: string, load: () => Promise<Blob>): Promise<void> {
    if (this.loading()) {
      return Promise.resolve();
    }
    this.loading.set(true);
    return this.report(message, async () => {
      await this.generateAdvanced(await load());
      this.background.set(selection);
    }).finally(() => this.loading.set(false));
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
    return this.switchBackground(
      'Das Hintergrundbild konnte nicht erstellt werden. Bitte versuche ein anderes Bild (JPG oder PNG).',
      'photo',
      () => Promise.resolve(file),
    );
  }

  private async generateAdvanced(backgroundFile: Blob): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const loaded = await this.loadImage(backgroundFile);
    const { width, height, scale: imageScale } = fitCanvas(loaded.width, loaded.height);
    // Filters work on the image at its own resolution, so large photos are shrunk first (iOS canvas limit).
    const background = imageScale < 1 ? new FabricImage(this.createScaledCopy(loaded.getElement(), width, height)) : loaded;
    background.set({ selectable: false, evented: false });
    applyPhotoFilter(background, this.photoFilter());
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
    const { size, left, top } = this.qrBox ? carryOverQrBox(this.qrBox.box, this.qrBox, { width, height }) : placeQrCode(width, height);
    this.qrBox = { box: { size, left, top }, width, height };
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
      this.qrBox = { box, width, height };
    };
    fullCanvas.on('object:moving', clampToImage);
    fullCanvas.on('object:scaling', clampToImage);
    fullCanvas.add(background, qrImage);
    // Selected from the start so the handles show that the code can be moved and resized.
    fullCanvas.setActiveObject(qrImage);
    fullCanvas.renderAll();
    this.fullFabricCanvas = fullCanvas;
    this.backgroundImage = background;
    this.advancedEnabled.set(true);
  }

  private createScaledCopy(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    return canvas;
  }

  protected applyFilter(id: PhotoFilterId): Promise<void> {
    return this.report('Der Filter konnte nicht angewendet werden.', () => {
      this.photoFilter.set(id);
      if (this.backgroundImage && this.fullFabricCanvas) {
        applyPhotoFilter(this.backgroundImage, id);
        this.fullFabricCanvas.requestRenderAll();
      }
    });
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
    this.backgroundImage = undefined;
    // The next visit starts with the default placement again.
    this.qrBox = undefined;
  }
}
