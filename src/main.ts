import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import { NgxQrcodeStylingModule } from 'ngx-qrcode-styling';
import { AppRoutingModule } from './app/app-routing.module';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      ReactiveFormsModule,
      NgxQrcodeStylingModule,
    ),
  ],
// eslint-disable-next-line no-console
}).catch(err => console.error(err));
