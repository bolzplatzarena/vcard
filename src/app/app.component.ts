import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgxQrcodeStylingService, Options } from 'ngx-qrcode-styling';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.ng-invalid.ng-touched { border-color: red }']
})
export class AppComponent {
  @ViewChild("canvas", { static: false }) canvas!: ElementRef;
  readonly form = this.formBuilder.nonNullable.group({
    givenName: ['', [Validators.required]],
    familyName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    mobile: ['', [Validators.required]],
    address: [''],
  });
  readonly qrConfig: Options = {
    width: 300,
    height: 300,
    margin: 50,
    dotsOptions: {
      color: "#1977f3",
      type: "dots"
    },
    backgroundOptions: {
      color: "#ffffff",
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 0
    }
  };
  qrData?: string;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly qrcode: NgxQrcodeStylingService,
  ) {}

  generate(): void {
    if(this.form.invalid) {
      return;
    }

    this.qrData = undefined;
    const person = this.form.getRawValue();

    const vcard = `BEGIN:VCARD
VERSION:3.0
N:${person.familyName};${person.givenName}
FN:${person.givenName} ${person.familyName}
END:VCARD`;

    this.qrcode.create({
        ...this.qrConfig,
        data: vcard,
        width: this.canvas.nativeElement.clientWidth
      },
      this.canvas.nativeElement
    ).subscribe();
    this.qrData = vcard;
   }

   close(): void {
     this.qrData = undefined;
   }
}
