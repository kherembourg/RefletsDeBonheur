import { describe, it, expect, vi, afterEach } from 'vitest';

describe('Email Templates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe('generateWelcomeEmail', () => {
    it('generates HTML with correct subject in French', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Alice & Bob',
        email: 'alice@example.com',
        slug: 'alice-bob',
        magicLink: 'https://example.com/magic-link',
        guestCode: 'ABC123',
        lang: 'fr',
      });

      expect(result.subject).toBe('Bienvenue sur Reflets de Bonheur ! 🎉');
      expect(result.html).toContain('Alice & Bob');
      expect(result.html).toContain('https://example.com/magic-link');
      expect(result.html).toContain('ABC123');
      expect(result.html).toContain('https://refletsdebonheur.com/alice-bob');
      expect(result.html).toContain('lang="fr"');
    });

    it('generates HTML with correct subject in English', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'John & Jane',
        email: 'john@example.com',
        slug: 'john-jane',
        magicLink: 'https://example.com/magic',
        guestCode: 'XYZ789',
        lang: 'en',
      });

      expect(result.subject).toBe('Welcome to Reflets de Bonheur! 🎉');
      expect(result.html).toContain('Dear John & Jane');
      expect(result.html).toContain('https://example.com/magic');
      expect(result.html).toContain('XYZ789');
      expect(result.html).toContain('lang="en"');
    });

    it('generates HTML with correct subject in Spanish', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Carlos & Maria',
        email: 'carlos@example.com',
        slug: 'carlos-maria',
        magicLink: 'https://example.com/magic-es',
        guestCode: 'ESP456',
        lang: 'es',
      });

      expect(result.subject).toBe('¡Bienvenido/a a Reflets de Bonheur! 🎉');
      expect(result.html).toContain('Queridos Carlos & Maria');
      expect(result.html).toContain('lang="es"');
    });

    it('falls back to English for unknown language', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        magicLink: 'https://example.com/magic',
        guestCode: 'TST000',
        lang: 'de' as any, // Unsupported language
      });

      // Should fall back to English
      expect(result.subject).toBe('Welcome to Reflets de Bonheur! 🎉');
    });

    it('includes proper HTML structure with DOCTYPE', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        magicLink: 'https://example.com/magic',
        guestCode: 'TST000',
        lang: 'en',
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<meta charset="utf-8">');
      expect(result.html).toContain('Reflets de Bonheur');
    });

    it('includes magic link as a clickable button', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const magicLink = 'https://example.com/special-magic-link';
      const result = generateWelcomeEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        magicLink,
        guestCode: 'TST000',
        lang: 'en',
      });

      expect(result.html).toContain(`href="${magicLink}"`);
    });

    it('uses localhost fallback when PUBLIC_SITE_URL is not set', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', '');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        magicLink: 'https://example.com/magic',
        guestCode: 'TST000',
        lang: 'en',
      });

      expect(result.html).toContain('http://localhost:4321/test-user');
    });

    it('includes all next steps in the email', async () => {
      vi.stubEnv('PUBLIC_SITE_URL', 'https://refletsdebonheur.com');
      const { generateWelcomeEmail } = await import('../templates');

      const result = generateWelcomeEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        magicLink: 'https://example.com/magic',
        guestCode: 'TST000',
        lang: 'fr',
      });

      // Verify all 4 French next steps are present
      expect(result.html).toContain('mot de passe');
      expect(result.html).toContain('Personnalisez');
      expect(result.html).toContain('code invité');
      expect(result.html).toContain('souvenirs');
    });
  });

  describe('generatePaymentConfirmationEmail', () => {
    it('generates payment confirmation HTML in French', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'Alice & Bob',
        email: 'alice@example.com',
        slug: 'alice-bob',
        amount: '€199.00',
        lang: 'fr',
      });

      expect(result.subject).toBe('Confirmation de paiement - Reflets de Bonheur');
      expect(result.html).toContain('Alice & Bob');
      expect(result.html).toContain('€199.00');
      expect(result.html).toContain('Payé');
      expect(result.html).toContain('lang="fr"');
    });

    it('generates payment confirmation HTML in English', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'John & Jane',
        email: 'john@example.com',
        slug: 'john-jane',
        amount: '€199.00',
        lang: 'en',
      });

      expect(result.subject).toBe('Payment Confirmation - Reflets de Bonheur');
      expect(result.html).toContain('Dear John & Jane');
      expect(result.html).toContain('€199.00');
      expect(result.html).toContain('Paid');
    });

    it('generates payment confirmation HTML in Spanish', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'Carlos & Maria',
        email: 'carlos@example.com',
        slug: 'carlos-maria',
        amount: '€199.00',
        lang: 'es',
      });

      expect(result.subject).toBe('Confirmación de pago - Reflets de Bonheur');
      expect(result.html).toContain('Pagado');
    });

    it('includes product name in payment details', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        amount: '€199.00',
        lang: 'en',
      });

      expect(result.html).toContain('Wedding Package');
      expect(result.html).toContain('2 years');
    });

    it('includes current date in locale-appropriate format', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        amount: '€199.00',
        lang: 'en',
      });

      // Should contain a date string (at least the year)
      expect(result.html).toContain('2026');
    });

    it('has proper HTML structure', async () => {
      const { generatePaymentConfirmationEmail } = await import('../templates');

      const result = generatePaymentConfirmationEmail({
        coupleNames: 'Test & User',
        email: 'test@example.com',
        slug: 'test-user',
        amount: '€199.00',
        lang: 'en',
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<meta charset="utf-8">');
      expect(result.html).toContain('</html>');
    });
  });
});
