import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { fabric } from 'fabric';
import { NgxQrcodeStylingService, Options } from 'ngx-qrcode-styling';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.ng-invalid.ng-touched { border-color: red }'],
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fullcanvas', { static: false }) fullCanvas!: ElementRef<HTMLCanvasElement>;
  readonly form = this.formBuilder.nonNullable.group({
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

  advancedEnabled = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly qrcode: NgxQrcodeStylingService,
  ) {
  }

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
    //await this.generate();
    //this.qrcode.download(this.canvas.nativeElement, 'vcard.png').subscribe();
  }

  advanced(): void {
    void this.generate();
    this.advancedEnabled = !this.advancedEnabled;

    const fullCanvas = new fabric.Canvas(this.fullCanvas.nativeElement, {
      width: screen.width,
      height: screen.height,
      fill: '#ffffff',
    });
    window.setTimeout(() => {
      fabric.Image.fromURL((this.canvas.nativeElement.firstChild as HTMLCanvasElement).toDataURL(), (img) => {
        fullCanvas.add(img);
      });
    }, 60);
  }
}
