import { importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NgxQrcodeStylingModule } from 'ngx-qrcode-styling';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter([]),
    importProvidersFrom(NgxQrcodeStylingModule),
  ],
// eslint-disable-next-line no-console
}).catch(err => console.error(err));
