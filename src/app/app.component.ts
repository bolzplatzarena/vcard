import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgxQrcodeStylingService, Options } from 'ngx-qrcode-styling';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.ng-invalid.ng-touched { border-color: red }'],
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: false }) canvas!: ElementRef;
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
      color: '#1977f3',
      type: 'dots',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 0,
    },
  };

  readonly qrDownloadConfig: Options = {
    width: screen.width,
    height: screen.height,
    margin: 50,
    dotsOptions: {
      color: '#1977f3',
      type: 'dots',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 0,
    },
  };

  qrData?: string;

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

  generate(preview = true): Promise<void> {
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
        ...(preview ? this.qrConfig : this.qrDownloadConfig),
        data: vcard,
        width: this.canvas.nativeElement.clientWidth,
      },
      this.canvas.nativeElement,
    ));
  }

  async download(): Promise<void> {
    await this.generate(false);
    this.qrcode.download('vcard.png', this.canvas.nativeElement).subscribe();
  }
}
