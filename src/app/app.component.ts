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
    standalone: true,
    imports: [ReactiveFormsModule]
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fullcanvas', { static: false }) fullCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly qrcode = inject(NgxQrcodeStylingService);

  readonly form = this.formBuilder.group({
    givenName: ['', [Validators.required]],
    familyName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    mobile: ['', [Validators.required]],
    address: [''],
  });
  readonly qrConfig: Options = {
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

  readonly advancedEnabled = signal(false);

  ngOnInit(): void {
    const data = localStorage.getItem('data');
    if (data) {
      this.form.patchValue(JSON.parse(data));
    }
    this.form.valueChanges.subscribe(value => {
      localStorage.setItem('data', JSON.stringify(value));
    });
  }

  generate(): Promise<void> {
    if (this.form.invalid) {
      return Promise.reject();
    }

    const person = this.form.getRawValue();

    const vcard = `BEGIN:VCARD
VERSION:3.0
N:${person.familyName};${person.givenName}
FN:${person.givenName} ${person.familyName}
END:VCARD`;

    return firstValueFrom(this.qrcode.create({
        ...this.qrConfig,
        data: vcard,
      },
      this.canvas.nativeElement,
    ));
  }

  async download(): Promise<void> {
    await this.generate();
  }

  generateAdvanced(): void {
    void this.generate();
    this.advancedEnabled.update(v => !v);

    const fullCanvas = new FabricCanvas(this.fullCanvas.nativeElement, {
      width: screen.width,
      height: screen.height,
      backgroundColor: '#ffffff',
    });
    window.setTimeout(() => {
      const dataUrl = (this.canvas.nativeElement.firstChild as HTMLCanvasElement).toDataURL();
      void FabricImage.fromURL(dataUrl).then(img => {
        fullCanvas.add(img);
      });
    }, 60);
  }
}
