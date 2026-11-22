import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import QRCodeStyling, { Options } from 'qr-code-styling';
import { buildVCard, toQrData } from './vcard';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: ['.ng-invalid.ng-touched { border-color: red }'],
    imports: [ReactiveFormsModule]
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLElement>;
  @ViewChild('fullcanvas', { static: false }) fullCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('backgroundInput', { static: false }) backgroundInput!: ElementRef<HTMLInputElement>;

  private fullFabricCanvas?: FabricCanvas;

  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    givenName: ['', [Validators.required]],
    familyName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    mobile: ['', [Validators.required]],
    address: [''],
  });
  protected readonly qrConfig: Partial<Options> = {
    width: 200,
    height: 200,
    margin: 0,
    dotsOptions: {
      color: '#1977f3',
      type: 'dots',
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
    const data = localStorage.getItem('data');
    if (data) {
      this.form.patchValue(JSON.parse(data));
    }
    this.form.valueChanges.subscribe(value => {
      localStorage.setItem('data', JSON.stringify(value));
    });
  }

  protected generate(): QRCodeStyling | undefined {
    if (this.form.invalid) {
      return undefined;
    }
    const qrCode = this.createQrCode(this.qrConfig);
    this.canvas.nativeElement.replaceChildren();
    qrCode.append(this.canvas.nativeElement);
    return qrCode;
  }

  protected async download(): Promise<void> {
    // getRawData waits for the asynchronous drawing; reading the canvas right away can export a blank image.
    const png = await this.generate()?.getRawData('png');
    if (png instanceof Blob) {
      this.saveFile(URL.createObjectURL(png), 'vcard-qr.png');
    }
  }

  private createQrCode(config: Partial<Options>): QRCodeStyling {
    return new QRCodeStyling({ ...config, data: toQrData(buildVCard(this.form.getRawValue())) });
  }

  private saveFile(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  protected openBackgroundPicker(): void {
    if (this.form.invalid) {
      return;
    }
    this.backgroundInput.nativeElement.click();
  }

  protected async onBackgroundSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      input.value = '';
      return;
    }

    await this.generateAdvanced(file);
    input.value = '';
  }

  protected async generateAdvanced(backgroundFile: File): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    const png = await this.generate()?.getRawData('png');

    const backgroundDataUrl = await this.readFileAsDataUrl(backgroundFile);
    const background = await FabricImage.fromURL(backgroundDataUrl);
    const width = background.width;
    const height = background.height;

    const fullCanvas = new FabricCanvas(this.fullCanvas.nativeElement, {
      width,
      height,
      backgroundColor: '#ffffff',
    });
    void this.fullFabricCanvas?.dispose();
    this.advancedEnabled.set(true);

    background.set({
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
    });
    fullCanvas.add(background);

    if (png instanceof Blob) {
      const qrUrl = URL.createObjectURL(png);
      const qrImage = await FabricImage.fromURL(qrUrl);
      URL.revokeObjectURL(qrUrl);
      qrImage.set({
        left: (width - qrImage.width) / 2,
        top: (height - qrImage.height) / 2,
      });
      fullCanvas.add(qrImage);
      fullCanvas.renderAll();
    }
    this.fullFabricCanvas = fullCanvas;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Datei konnte nicht gelesen werden.'));
      };
      reader.onerror = (): void => reject(new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });
  }

  protected downloadAdvanced(): void {
    if (this.fullFabricCanvas) {
      this.saveFile(this.fullFabricCanvas.toDataURL({ format: 'png', multiplier: 1 }), 'vcard-wallpaper.png');
    }
  }

  protected closeAdvanced(): void {
    this.advancedEnabled.set(false);
    void this.fullFabricCanvas?.dispose();
    this.fullFabricCanvas = undefined;
  }
}
