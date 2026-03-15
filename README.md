# vCard

Eine Angular-Webanwendung zur Erstellung von vCards als Bilder, die als Smartphone-Sperrbildschirm-Foto verwendet werden können. Das generierte Bild enthält einen QR-Code mit allen Visitenkarten-Informationen, sodass Kontaktdaten einfach über das Sperrbildschirmfoto geteilt werden können.

## Technologien

- [Angular](https://angular.io/) 21.x
- [Tailwind CSS](https://tailwindcss.com/) 3.x
- [Capacitor](https://capacitorjs.com/) 7.x (Android & iOS)
- [Fabric.js](http://fabricjs.com/) 7.x – Canvas-Rendering für das Bild
- [ngx-qrcode-styling](https://www.npmjs.com/package/ngx-qrcode-styling) – QR-Code-Generierung

## Funktionsweise

1. Visitenkarten-Daten (Name, Telefon, E-Mail, Adresse usw.) eingeben
2. Ein Bild wird generiert, das einen QR-Code mit allen vCard-Informationen enthält
3. Das Bild kann als Smartphone-Sperrbildschirm-Foto gesetzt werden
4. Andere Personen können den QR-Code direkt vom Sperrbildschirm scannen und den Kontakt speichern

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
