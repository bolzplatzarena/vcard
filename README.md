# vCard

Eine Angular-Webanwendung zur Erstellung von vCards als Bilder, die als Smartphone-Sperrbildschirm-Foto verwendet werden können. Das generierte Bild enthält einen QR-Code mit allen Visitenkarten-Informationen, sodass Kontaktdaten einfach über das Sperrbildschirmfoto geteilt werden können.

## Technologien

- [Angular](https://angular.dev/) 22.x
- [Tailwind CSS](https://tailwindcss.com/) 3.x
- [Capacitor](https://capacitorjs.com/) 8.x (Android & iOS)
- [Fabric.js](https://fabricjs.com/) 7.x – Canvas-Rendering für das Bild
- [qr-code-styling](https://www.npmjs.com/package/qr-code-styling) – QR-Code-Generierung

## Funktionsweise

1. Visitenkarten-Daten (Name, Telefon, E-Mail, Adresse usw.) eingeben
2. Ein Bild wird generiert, das einen QR-Code mit allen vCard-Informationen enthält
3. Das Bild kann als Smartphone-Sperrbildschirm-Foto gesetzt werden
4. Andere Personen können den QR-Code direkt vom Sperrbildschirm scannen und den Kontakt speichern

## Entwicklung

Voraussetzung: Node.js ^22.22 oder ^24.15.

- `npm start` – Dev-Server auf http://localhost:4200/
- `npm run build` – Produktions-Build nach `dist/vcard/browser`
- `npm test` – Unit-Tests mit [Vitest](https://vitest.dev/)
- `npm run lint` – ESLint

## Mobile Apps

```
npm run build
npx cap sync
npx cap open android   # benötigt Android Studio und JDK 21
npx cap open ios       # benötigt Xcode (macOS)
```
