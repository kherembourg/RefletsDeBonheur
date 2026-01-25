import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const repoRoot = resolve(__dirname, '../..');

const readPage = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf-8');

describe('Public marketing copy', () => {
  it('includes updated hero messaging for each language', () => {
    const en = readPage('pages/index.astro');
    const fr = readPage('pages/fr/index.astro');
    const es = readPage('pages/es/index.astro');

    expect(en).toContain('A private gallery');
    expect(en).toContain('Create my private space');

    expect(fr).toContain('Un écrin privé');
    expect(fr).toContain('Créer mon espace privé');

    expect(es).toContain('Un espacio privado');
    expect(es).toContain('Ver precios');
  });

  it('reflects premium positioning on pricing pages', () => {
    const enPricing = readPage('pages/pricing.astro');
    const frPricing = readPage('pages/fr/tarification.astro');
    const esPricing = readPage('pages/es/precios.astro');

    expect(enPricing).toContain('Premium pricing, no surprises');
    expect(frPricing).toContain('Une offre premium, sans surprises');
    expect(esPricing).toContain('Precios premium, sin sorpresas');
  });
});
