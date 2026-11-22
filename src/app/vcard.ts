export interface Contact {
  givenName: string;
  familyName: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
}

// RFC 2426 §5: backslash, comma, semicolon and newlines must be escaped in text values.
function escapeValue(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

export function buildVCard(contact: Contact): string {
  const c: Contact = {
    givenName: escapeValue(contact.givenName),
    familyName: escapeValue(contact.familyName),
    email: escapeValue(contact.email),
    phone: escapeValue(contact.phone),
    mobile: escapeValue(contact.mobile),
    address: escapeValue(contact.address),
  };

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${c.familyName};${c.givenName};;;`,
    `FN:${[c.givenName, c.familyName].filter(Boolean).join(' ')}`,
  ];
  if (c.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  }
  if (c.phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${c.phone}`);
  }
  if (c.mobile) {
    lines.push(`TEL;TYPE=CELL:${c.mobile}`);
  }
  if (c.address) {
    // ADR: post-office-box;extended-address;street-address;locality;region;postal-code;country-name
    lines.push(`ADR;TYPE=HOME:;;${c.address};;;;`);
  }
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
