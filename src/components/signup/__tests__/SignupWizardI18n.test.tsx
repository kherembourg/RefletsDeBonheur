import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountStep, type AccountData } from '../steps/AccountStep';
import { WeddingStep, type WeddingData } from '../steps/WeddingStep';
import { ThemeStep, type ThemeData } from '../steps/ThemeStep';

const defaultAccount: AccountData = {
  email: '',
  password: '',
  confirmPassword: '',
};

const defaultWedding: WeddingData = {
  partner1Name: '',
  partner2Name: '',
  weddingDate: '',
};

const defaultTheme: ThemeData = {
  themeId: 'classic',
};

describe('SignupWizard i18n - French (fr)', () => {
  it('AccountStep renders French title and subtitle', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByText('Créez Votre Compte')).toBeInTheDocument();
    expect(screen.getByText(/essai gratuit/i)).toBeInTheDocument();
  });

  it('AccountStep renders French field labels', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
  });

  it('AccountStep renders French continue button', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument();
  });

  it('AccountStep renders French sign-in link text', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByText(/vous avez déjà un compte/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('WeddingStep renders French title and subtitle', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByText('Parlez-nous de Votre Mariage')).toBeInTheDocument();
    expect(screen.getByText(/heureux mariés/i)).toBeInTheDocument();
  });

  it('WeddingStep renders French field labels', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByLabelText(/partenaire 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/partenaire 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date du mariage/i)).toBeInTheDocument();
  });

  it('WeddingStep renders French navigation buttons', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument();
  });

  it('ThemeStep renders French title and subtitle', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByText('Choisissez Votre Thème')).toBeInTheDocument();
    expect(screen.getByText(/personnaliser plus tard/i)).toBeInTheDocument();
  });

  it('ThemeStep renders French submit button', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByRole('button', { name: /continuer/i })).toBeInTheDocument();
  });

  it('ThemeStep renders French terms text', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="fr"
      />
    );

    expect(screen.getByText(/en créant un compte/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /politique de confidentialité/i })).toBeInTheDocument();
  });
});

describe('SignupWizard i18n - Spanish (es)', () => {
  it('AccountStep renders Spanish title and subtitle', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByText('Crea Tu Cuenta')).toBeInTheDocument();
    expect(screen.getByText(/prueba gratuita/i)).toBeInTheDocument();
  });

  it('AccountStep renders Spanish field labels', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  it('AccountStep renders Spanish continue button', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('AccountStep renders Spanish sign-in link text', () => {
    render(
      <AccountStep
        data={defaultAccount}
        onChange={vi.fn()}
        onNext={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByText(/¿ya tienes una cuenta\?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('WeddingStep renders Spanish title and subtitle', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByText('Cuéntanos Sobre Tu Boda')).toBeInTheDocument();
    expect(screen.getByText(/feliz pareja/i)).toBeInTheDocument();
  });

  it('WeddingStep renders Spanish field labels', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByLabelText(/pareja 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pareja 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de la boda/i)).toBeInTheDocument();
  });

  it('WeddingStep renders Spanish navigation buttons', () => {
    render(
      <WeddingStep
        data={defaultWedding}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByRole('button', { name: /atrás/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('ThemeStep renders Spanish title and subtitle', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByText('Elige Tu Tema')).toBeInTheDocument();
    expect(screen.getByText(/personalizarlo después/i)).toBeInTheDocument();
  });

  it('ThemeStep renders Spanish submit button', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('ThemeStep renders Spanish terms text', () => {
    render(
      <ThemeStep
        data={defaultTheme}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        lang="es"
      />
    );

    expect(screen.getByText(/al crear una cuenta/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /términos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política de privacidad/i })).toBeInTheDocument();
  });
});

describe('SignupWizard i18n - translation keys completeness', () => {
  it('signup translations exist for all three languages', async () => {
    const { translations } = await import('../../../i18n/translations');

    const signupKeys = [
      'title', 'subtitle', 'tagline',
      'steps', 'account', 'wedding', 'slug', 'theme', 'payment',
      'success', 'navigation', 'features', 'errors',
    ];

    for (const lang of ['en', 'fr', 'es'] as const) {
      for (const key of signupKeys) {
        expect(translations[lang].signup).toHaveProperty(key);
      }
    }
  });

  it('all signup error keys exist in FR and ES', async () => {
    const { translations } = await import('../../../i18n/translations');

    const errorKeys = Object.keys(translations.en.signup.errors);

    for (const lang of ['fr', 'es'] as const) {
      for (const key of errorKeys) {
        expect(translations[lang].signup.errors).toHaveProperty(key);
      }
    }
  });

  it('all signup navigation keys exist in FR and ES', async () => {
    const { translations } = await import('../../../i18n/translations');

    const navKeys = Object.keys(translations.en.signup.navigation);

    for (const lang of ['fr', 'es'] as const) {
      for (const key of navKeys) {
        expect(translations[lang].signup.navigation).toHaveProperty(key);
      }
    }
  });
});
