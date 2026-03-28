import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { NgxQrcodeStylingService, Options } from 'ngx-qrcode-styling';
import { firstValueFrom } from 'rxjs';

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
  private readonly qrcode = inject(NgxQrcodeStylingService);

  protected readonly form = this.formBuilder.group({
    givenName: ['', [Validators.required]],
    familyName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    mobile: ['', [Validators.required]],
    address: [''],
  });
  protected readonly qrConfig: Options = {
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

  protected generate(): Promise<void> {
    if (this.form.invalid) {
      return Promise.reject();
    }

    const person = this.form.getRawValue();

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${person.familyName};${person.givenName}`,
      `FN:${person.givenName} ${person.familyName}`,
    ];
    if (person.email) {
      lines.push(`EMAIL:${person.email}`);
    }
    if (person.phone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${person.phone}`);
    }
    if (person.mobile) {
      lines.push(`TEL;TYPE=CELL:${person.mobile}`);
    }
    if (person.address) {
      // ADR format: post-office-box;extended-address;street-address;locality;region;postal-code;country-name
      lines.push(`ADR;TYPE=HOME:;;${person.address};;;;`);
    }
    lines.push('END:VCARD');
    const vcard = lines.join('\r\n');

    return firstValueFrom(this.qrcode.create({
        ...this.qrConfig,
        data: vcard,
      },
      this.canvas.nativeElement,
    ));
  }

  protected async download(): Promise<void> {
    await this.generate();
    const canvasEl = this.canvas.nativeElement.firstChild;
    if (canvasEl instanceof HTMLCanvasElement) {
      const dataUrl = canvasEl.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'vcard-qr.png';
      link.click();
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
    await this.generate();

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

    const canvasEl = this.canvas.nativeElement.firstChild;
    if (canvasEl instanceof HTMLCanvasElement) {
      const dataUrl = canvasEl.toDataURL();
      const qrImage = await FabricImage.fromURL(dataUrl);
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
      const dataUrl = this.fullFabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'vcard-wallpaper.png';
      link.click();
    }
  }

  protected closeAdvanced(): void {
    this.advancedEnabled.set(false);
    void this.fullFabricCanvas?.dispose();
    this.fullFabricCanvas = undefined;
  }
}
