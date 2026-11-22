import { ErrorHandler } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FabricImage } from 'fabric';
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
