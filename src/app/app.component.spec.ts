import { ErrorHandler } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FabricImage } from 'fabric';
import QRCodeStyling from 'qr-code-styling';
import { AppComponent } from './app.component';

const validContact = JSON.stringify({
  givenName: 'Max', familyName: 'Mustermann', email: 'max@example.com', phone: '', mobile: '0170 1', address: '',
});

describe('AppComponent error handling', () => {
  let handleError: ReturnType<typeof vi.fn>;

  async function createComponent(): Promise<ComponentFixture<AppComponent>> {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  async function selectFile(fixture: ComponentFixture<AppComponent>, file: File): Promise<void> {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function enterText(fixture: ComponentFixture<AppComponent>, id: string, text: string): Promise<void> {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`#${id}`);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    // Longer than the preview's debounce.
    await new Promise(resolve => setTimeout(resolve, 200));
    fixture.detectChanges();
  }

  function getAlert(fixture: ComponentFixture<AppComponent>): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role=alert]');
  }

  beforeEach(() => {
    localStorage.clear();
    handleError = vi.fn();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: ErrorHandler, useValue: { handleError } }],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['{broken', 'null', '42'])('starts with an empty form when the stored data is %s', async stored => {
    localStorage.setItem('data', stored);
    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('#givenname').value).toBe('');
  });

  it('restores valid stored data', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();
    expect(fixture.nativeElement.querySelector('#givenname').value).toBe('Max');
  });

  it('shows a live QR preview while the required fields are valid', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();
    const preview = (): HTMLElement => fixture.nativeElement.querySelector('section[aria-label=Vorschau]');
    expect(preview().classList).not.toContain('hidden');
    expect(preview().querySelector('canvas')).not.toBeNull();

    await enterText(fixture, 'givenname', '');

    expect(preview().classList).toContain('hidden');
    expect(preview().querySelector('canvas')).toBeNull();
  });

  it('removes the outdated QR code and shows a message when the data is too long', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();

    await enterText(fixture, 'address', 'x'.repeat(3000));

    expect(fixture.nativeElement.querySelector('section canvas')).toBeNull();
    expect(getAlert(fixture)?.textContent).toContain('Der QR-Code konnte nicht erstellt werden.');

    await enterText(fixture, 'address', 'Hauptstr. 1');
    expect(fixture.nativeElement.querySelector('section canvas')).not.toBeNull();
    expect(getAlert(fixture)).toBeNull();
  });

  it('removes the message about too long data when the form becomes invalid', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();

    await enterText(fixture, 'address', 'x'.repeat(3000));
    expect(getAlert(fixture)).not.toBeNull();

    await enterText(fixture, 'givenname', '');
    expect(getAlert(fixture)).toBeNull();
  });

  it('redraws the preview only once while typing', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();
    const append = vi.spyOn(QRCodeStyling.prototype, 'append');

    void enterText(fixture, 'address', 'H');
    void enterText(fixture, 'address', 'Ha');
    await enterText(fixture, 'address', 'Hau');

    // The constructor also calls append, but without a container.
    expect(append.mock.calls.filter(([container]) => container)).toHaveLength(1);
  });

  it('offers the preset backgrounds and an own photo, the first preset preselected', async () => {
    const fixture = await createComponent();
    const choices = [...fixture.nativeElement.querySelectorAll('[aria-label="Hintergrund wählen"] button')] as HTMLButtonElement[];
    expect(choices.map(b => b.getAttribute('aria-label'))).toEqual([
      'Nacht', 'Abendrot', 'Salbei', 'Dünen', 'Lagune', 'Aurora', 'Bauhaus', 'Orbit', 'Pastell', 'Eigenes Foto',
    ]);
    expect(choices.map(b => b.getAttribute('aria-pressed'))).toEqual(['true', ...Array<string>(9).fill('false')]);
  });

  it('opens the wallpaper view with the preset and shows a message when it cannot be loaded', async () => {
    localStorage.setItem('data', validContact);
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const fixture = await createComponent();

    const open = [...fixture.nativeElement.querySelectorAll('nav button')] as HTMLButtonElement[];
    open.find(b => b.textContent.includes('Hintergrundbild'))?.click();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();

    expect(fetch).toHaveBeenCalledWith('assets/wallpapers/nacht.jpg');
    expect(getAlert(fixture)?.textContent).toContain('Das Hintergrundbild konnte nicht geladen werden.');
  });

  it('shows no error when download is triggered with missing required fields', async () => {
    const fixture = await createComponent();

    await (fixture.componentInstance as unknown as { download(): Promise<void> }).download();
    fixture.detectChanges();

    expect(getAlert(fixture)).toBeNull();
    expect(handleError).not.toHaveBeenCalled();
  });

  it('asks for an image when another file type is picked', async () => {
    localStorage.setItem('data', validContact);
    const fixture = await createComponent();

    await selectFile(fixture, new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(getAlert(fixture)?.textContent).toContain('Bitte wähle eine Bilddatei aus.');
  });

  it('shows a message when the background image cannot be loaded and lets the user dismiss it', async () => {
    localStorage.setItem('data', validContact);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(FabricImage, 'fromURL').mockRejectedValue(new Error('decode failed'));
    const fixture = await createComponent();

    await selectFile(fixture, new File(['x'], 'photo.heic', { type: 'image/heic' }));

    expect(getAlert(fixture)?.textContent).toContain('Das Hintergrundbild konnte nicht erstellt werden.');
    expect(handleError).toHaveBeenCalledWith(new Error('decode failed'));

    getAlert(fixture)?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(getAlert(fixture)).toBeNull();
  });
});
