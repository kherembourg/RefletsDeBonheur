import { describe, it, expect } from 'vitest';
import { detectLanguageFromRequest } from '../lang';

describe('detectLanguageFromRequest', () => {
  function createRequest(acceptLanguage: string): Request {
    return new Request('http://localhost:4321/api/test', {
      headers: { 'Accept-Language': acceptLanguage },
    });
  }

  it('detects French from fr-FR header', () => {
    const request = createRequest('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(detectLanguageFromRequest(request)).toBe('fr');
  });

  it('detects English from en-US header', () => {
    const request = createRequest('en-US,en;q=0.9');
    expect(detectLanguageFromRequest(request)).toBe('en');
  });

  it('detects Spanish from es header', () => {
    const request = createRequest('es-ES,es;q=0.9,en;q=0.5');
    expect(detectLanguageFromRequest(request)).toBe('es');
  });

  it('picks highest quality language that is supported', () => {
    // German (unsupported) is preferred, but English is next
    const request = createRequest('de-DE;q=1.0,en;q=0.8,fr;q=0.5');
    expect(detectLanguageFromRequest(request)).toBe('en');
  });

  it('defaults to French when no Accept-Language header', () => {
    const request = new Request('http://localhost:4321/api/test');
    expect(detectLanguageFromRequest(request)).toBe('fr');
  });

  it('defaults to French when Accept-Language is empty', () => {
    const request = createRequest('');
    expect(detectLanguageFromRequest(request)).toBe('fr');
  });

  it('defaults to French for unsupported languages only', () => {
    const request = createRequest('zh-CN,zh;q=0.9,ja;q=0.8');
    expect(detectLanguageFromRequest(request)).toBe('fr');
  });

  it('handles malformed Accept-Language header gracefully', () => {
    const request = createRequest(';;;,,,');
    expect(detectLanguageFromRequest(request)).toBe('fr');
  });

  it('handles language with no quality value (defaults to 1.0)', () => {
    const request = createRequest('es');
    expect(detectLanguageFromRequest(request)).toBe('es');
  });

  it('respects quality values for ordering', () => {
    // English is higher quality than French
    const request = createRequest('fr;q=0.5,en;q=0.9');
    expect(detectLanguageFromRequest(request)).toBe('en');
  });

  it('handles region variants correctly', () => {
    const request = createRequest('es-MX,es;q=0.9');
    expect(detectLanguageFromRequest(request)).toBe('es');
  });
});
