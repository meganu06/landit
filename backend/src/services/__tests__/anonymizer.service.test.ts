// anonymizer.service.test.ts
// Tests for the anonymize() function.
// No mocking needed — this is pure string transformation.

import { anonymize } from '../anonymizer.service';

// ─────────────────────────────────────────────────────────────────────────────
// SSN
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — SSN', () => {
  it('replaces a standard SSN (dashes)', () => {
    const result = anonymize('My SSN is 123-45-6789.');
    expect(result).not.toContain('123-45-6789');
    expect(result).toContain('<SSN>');
  });

  it('replaces a SSN with dots', () => {
    const result = anonymize('SSN: 123.45.6789');
    expect(result).not.toContain('123.45.6789');
    expect(result).toContain('<SSN>');
  });

  it('does not replace a random number that is not SSN format', () => {
    const result = anonymize('I scored 12345 points.');
    expect(result).not.toContain('<SSN>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NI NUMBER
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — NI Number', () => {
  it('replaces a valid UK NI number', () => {
    const result = anonymize('My NI number is AB123456C.');
    expect(result).not.toContain('AB123456C');
    expect(result).toContain('<NI_NUMBER>');
  });

  it('is case-insensitive for NI number', () => {
    const result = anonymize('NI: ab123456c');
    expect(result).not.toContain('ab123456c');
    expect(result).toContain('<NI_NUMBER>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// URLs
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — URLs', () => {
  it('replaces an http URL', () => {
    const result = anonymize('Visit http://mysite.com for more info.');
    expect(result).not.toContain('http://mysite.com');
    expect(result).toContain('<URL>');
  });

  it('replaces an https URL', () => {
    const result = anonymize('Portfolio: https://melissa.dev/projects');
    expect(result).not.toContain('https://melissa.dev/projects');
    expect(result).toContain('<URL>');
  });

  it('replaces a LinkedIn URL', () => {
    const result = anonymize('LinkedIn: https://linkedin.com/in/johndoe');
    expect(result).not.toContain('https://linkedin.com/in/johndoe');
    expect(result).toContain('<URL>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHONE NUMBERS
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — phone numbers', () => {
  it('replaces a UK mobile number', () => {
    const result = anonymize('Call me on 07911 123456.');
    expect(result).not.toContain('07911 123456');
    expect(result).toContain('<PHONE>');
  });

  it('replaces an international number with country code', () => {
    const result = anonymize('Phone: +44 7911 123456');
    expect(result).not.toContain('+44 7911 123456');
    expect(result).toContain('<PHONE>');
  });

  it('does not replace a short number with fewer than 10 digits', () => {
    const result = anonymize('Code: 12345');
    expect(result).not.toContain('<PHONE>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NAMED ENTITIES (compromise NLP)
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — named entities', () => {
  it('UT-009: anonymize() strips email before OpenAI — replaces email address', () => {
    const result = anonymize('Contact me at john.doe@example.com');
    expect(result).not.toContain('john.doe@example.com');
    expect(result).toContain('<EMAIL>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED / EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────
describe('anonymize — combined and edge cases', () => {
  it('handles an empty string without throwing', () => {
    expect(() => anonymize('')).not.toThrow();
    expect(anonymize('')).toBe('');
  });

  it('UT-009: anonymize() strips PII — replaces multiple sensitive items in one string', () => {
    const result = anonymize(
      'SSN: 123-45-6789, email: jane@example.com, site: https://jane.dev'
    );
    expect(result).toContain('<SSN>');
    expect(result).toMatch(/<EMAIL/);
    expect(result).toContain('<URL>');
  });

  it('UT-009: anonymize() strips PII — leaves non-sensitive text unchanged', () => {
    const input = 'I have experience with React, TypeScript, and Node.js.';
    const result = anonymize(input);
    expect(result).toContain('React');
    expect(result).toContain('TypeScript');
  });

  it('replaces all occurrences of a URL in one string', () => {
    const result = anonymize(
      'See https://site1.com and https://site2.com for details.'
    );
    expect(result).not.toContain('https://site1.com');
    expect(result).not.toContain('https://site2.com');
  });
});