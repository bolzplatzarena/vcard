import { buildVCard, Contact, toQrData } from './vcard';

describe('toQrData', () => {
  it('keeps ASCII unchanged', () => {
    expect(toQrData('BEGIN:VCARD')).toBe('BEGIN:VCARD');
  });

  it('encodes umlauts as UTF-8 bytes', () => {
    expect(toQrData('ü')).toBe('\xc3\xbc');
    expect(toQrData('€')).toBe('\xe2\x82\xac');
  });
});

const contact: Contact = {
  givenName: 'Max',
  familyName: 'Mustermann',
  email: 'max@example.com',
  phone: '',
  mobile: '+49 170 1234567',
  address: '',
};

describe('buildVCard', () => {
  it('builds a minimal vCard 3.0 with CRLF line endings', () => {
    expect(buildVCard(contact)).toBe([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Mustermann;Max;;;',
      'FN:Max Mustermann',
      'EMAIL;TYPE=INTERNET:max@example.com',
      'TEL;TYPE=CELL:+49 170 1234567',
      'END:VCARD',
    ].join('\r\n'));
  });

  it('adds optional work phone and address', () => {
    const vcard = buildVCard({ ...contact, phone: '030 123', address: 'Hauptstr. 1' });
    expect(vcard).toContain('\r\nTEL;TYPE=WORK,VOICE:030 123\r\n');
    expect(vcard).toContain('\r\nADR;TYPE=HOME:;;Hauptstr. 1;;;;\r\n');
  });

  it('escapes commas, semicolons, backslashes and newlines', () => {
    const vcard = buildVCard({
      ...contact,
      familyName: 'Müller;Schmidt',
      address: 'Hauptstr. 1, 12345 Berlin\nc\\o Firma',
    });
    expect(vcard).toContain('\r\nN:Müller\\;Schmidt;Max;;;\r\n');
    expect(vcard).toContain('\r\nADR;TYPE=HOME:;;Hauptstr. 1\\, 12345 Berlin\\nc\\\\o Firma;;;;\r\n');
  });

  it('trims surrounding whitespace', () => {
    expect(buildVCard({ ...contact, givenName: '  Max ' })).toContain('\r\nFN:Max Mustermann\r\n');
  });
});
