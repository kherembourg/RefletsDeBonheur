import type { Language } from '../../i18n/translations';

/**
 * Escape HTML special characters to prevent XSS in email templates.
 * All user-supplied data MUST be passed through this before HTML interpolation.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface WelcomeEmailData {
  coupleNames: string;
  email: string;
  slug: string;
  magicLink: string;
  guestCode: string;
  lang: Language;
  /** When true, user already has a password — show login link instead of magic link */
  hasPassword?: boolean;
}

export interface PaymentConfirmationData {
  coupleNames: string;
  email: string;
  amount: string;
  lang: Language;
}

const translations = {
  welcome: {
    en: {
      subject: 'Welcome to Reflets de Bonheur! 🎉',
      greeting: (names: string) => `Dear ${names},`,
      intro: 'Your wedding space has been created successfully! Here\'s everything you need to get started.',
      accessTitle: 'Access Your Dashboard',
      accessText: 'Click the button below to set up your password and access your wedding dashboard:',
      accessTextPassword: 'You can sign in anytime to access your wedding dashboard:',
      accessButton: 'Set Up My Account',
      accessButtonPassword: 'Go to My Dashboard',
      detailsTitle: 'Your Wedding Details',
      websiteLabel: 'Your wedding website:',
      guestCodeLabel: 'Guest access code:',
      guestCodeHelp: 'Share this code with your guests so they can upload photos and leave messages.',
      nextStepsTitle: 'Next Steps',
      nextSteps: [
        'Click the link above to set your password',
        'Customize your wedding website',
        'Share the guest code with your invitees',
        'Start collecting memories!',
      ],
      nextStepsPassword: [
        'Sign in to your dashboard',
        'Customize your wedding website',
        'Share the guest code with your invitees',
        'Start collecting memories!',
      ],
      supportText: 'If you have any questions, reply to this email and we\'ll be happy to help.',
      footer: 'With love,',
      footerTeam: 'The Reflets de Bonheur Team',
      linkExpiry: 'This link expires in 24 hours. If it expires, you can request a new one from the login page.',
    },
    fr: {
      subject: 'Bienvenue sur Reflets de Bonheur ! 🎉',
      greeting: (names: string) => `Cher(e)s ${names},`,
      intro: 'Votre espace mariage a été créé avec succès ! Voici tout ce dont vous avez besoin pour commencer.',
      accessTitle: 'Accédez à votre tableau de bord',
      accessText: 'Cliquez sur le bouton ci-dessous pour configurer votre mot de passe et accéder à votre espace :',
      accessTextPassword: 'Connectez-vous à tout moment pour accéder à votre espace mariage :',
      accessButton: 'Configurer mon compte',
      accessButtonPassword: 'Accéder à mon espace',
      detailsTitle: 'Détails de votre mariage',
      websiteLabel: 'Votre site de mariage :',
      guestCodeLabel: 'Code d\'accès invités :',
      guestCodeHelp: 'Partagez ce code avec vos invités pour qu\'ils puissent envoyer des photos et laisser des messages.',
      nextStepsTitle: 'Prochaines étapes',
      nextSteps: [
        'Cliquez sur le lien ci-dessus pour définir votre mot de passe',
        'Personnalisez votre site de mariage',
        'Partagez le code invité avec vos proches',
        'Commencez à collecter des souvenirs !',
      ],
      nextStepsPassword: [
        'Connectez-vous à votre tableau de bord',
        'Personnalisez votre site de mariage',
        'Partagez le code invité avec vos proches',
        'Commencez à collecter des souvenirs !',
      ],
      supportText: 'Si vous avez des questions, répondez à cet email et nous serons ravis de vous aider.',
      footer: 'Avec amour,',
      footerTeam: 'L\'équipe Reflets de Bonheur',
      linkExpiry: 'Ce lien expire dans 24 heures. S\'il a expiré, vous pouvez en demander un nouveau depuis la page de connexion.',
    },
    es: {
      subject: '¡Bienvenido/a a Reflets de Bonheur! 🎉',
      greeting: (names: string) => `Queridos ${names},`,
      intro: '¡Su espacio de boda ha sido creado con éxito! Aquí tiene todo lo que necesita para comenzar.',
      accessTitle: 'Acceda a su panel de control',
      accessText: 'Haga clic en el botón de abajo para configurar su contraseña y acceder a su espacio:',
      accessTextPassword: 'Inicie sesión en cualquier momento para acceder a su espacio de boda:',
      accessButton: 'Configurar mi cuenta',
      accessButtonPassword: 'Ir a mi espacio',
      detailsTitle: 'Detalles de su boda',
      websiteLabel: 'Su sitio web de boda:',
      guestCodeLabel: 'Código de acceso para invitados:',
      guestCodeHelp: 'Comparta este código con sus invitados para que puedan subir fotos y dejar mensajes.',
      nextStepsTitle: 'Próximos pasos',
      nextSteps: [
        'Haga clic en el enlace anterior para definir su contraseña',
        'Personalice su sitio web de boda',
        'Comparta el código de invitado con sus invitados',
        '¡Comience a recopilar recuerdos!',
      ],
      nextStepsPassword: [
        'Inicie sesión en su panel de control',
        'Personalice su sitio web de boda',
        'Comparta el código de invitado con sus invitados',
        '¡Comience a recopilar recuerdos!',
      ],
      supportText: 'Si tiene alguna pregunta, responda a este email y estaremos encantados de ayudarle.',
      footer: 'Con cariño,',
      footerTeam: 'El equipo de Reflets de Bonheur',
      linkExpiry: 'Este enlace expira en 24 horas. Si ha expirado, puede solicitar uno nuevo desde la página de inicio de sesión.',
    },
  },
  paymentConfirmation: {
    en: {
      subject: 'Payment Confirmation - Reflets de Bonheur',
      greeting: (names: string) => `Dear ${names},`,
      intro: 'We\'ve received your payment. Here\'s your receipt.',
      detailsTitle: 'Payment Details',
      productLabel: 'Product:',
      productName: 'Reflets de Bonheur - Wedding Package (2 years)',
      amountLabel: 'Amount paid:',
      dateLabel: 'Date:',
      statusLabel: 'Status:',
      statusPaid: 'Paid',
      accessText: 'Your premium features are now active. Enjoy unlimited photo sharing, your wedding website, and more!',
      supportText: 'If you have any questions about your payment, reply to this email.',
      footer: 'Thank you for choosing us,',
      footerTeam: 'The Reflets de Bonheur Team',
    },
    fr: {
      subject: 'Confirmation de paiement - Reflets de Bonheur',
      greeting: (names: string) => `Cher(e)s ${names},`,
      intro: 'Nous avons bien reçu votre paiement. Voici votre reçu.',
      detailsTitle: 'Détails du paiement',
      productLabel: 'Produit :',
      productName: 'Reflets de Bonheur - Forfait Mariage (2 ans)',
      amountLabel: 'Montant payé :',
      dateLabel: 'Date :',
      statusLabel: 'Statut :',
      statusPaid: 'Payé',
      accessText: 'Vos fonctionnalités premium sont maintenant actives. Profitez du partage de photos illimité, de votre site de mariage, et bien plus !',
      supportText: 'Si vous avez des questions concernant votre paiement, répondez à cet email.',
      footer: 'Merci de nous avoir choisis,',
      footerTeam: 'L\'équipe Reflets de Bonheur',
    },
    es: {
      subject: 'Confirmación de pago - Reflets de Bonheur',
      greeting: (names: string) => `Queridos ${names},`,
      intro: 'Hemos recibido su pago. Aquí tiene su recibo.',
      detailsTitle: 'Detalles del pago',
      productLabel: 'Producto:',
      productName: 'Reflets de Bonheur - Paquete de Boda (2 años)',
      amountLabel: 'Monto pagado:',
      dateLabel: 'Fecha:',
      statusLabel: 'Estado:',
      statusPaid: 'Pagado',
      accessText: '¡Sus funciones premium están ahora activas! Disfrute del uso compartido de fotos ilimitado, su sitio web de boda y mucho más.',
      supportText: 'Si tiene alguna pregunta sobre su pago, responda a este email.',
      footer: 'Gracias por elegirnos,',
      footerTeam: 'El equipo de Reflets de Bonheur',
    },
  },
};

/**
 * Generate welcome email HTML for new signups
 */
export function generateWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const t = translations.welcome[data.lang] || translations.welcome.en;
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

  // Escape user-supplied data for HTML display contexts
  const safeCoupleNames = escapeHtml(data.coupleNames);
  const safeGuestCode = escapeHtml(data.guestCode);

  // URLs: use raw values for href attributes, escape only for display text
  // Validate URL scheme to prevent javascript: XSS in href
  const magicLinkHref = /^https?:\/\//.test(data.magicLink) ? data.magicLink : '#';
  const weddingUrl = `${siteUrl}/${data.slug}`;
  const safeWeddingUrl = escapeHtml(weddingUrl);

  // Choose text based on whether user has a password
  const accessText = data.hasPassword ? t.accessTextPassword : t.accessText;
  const accessButton = data.hasPassword ? t.accessButtonPassword : t.accessButton;
  const nextSteps = data.hasPassword ? t.nextStepsPassword : t.nextSteps;
  const showLinkExpiry = !data.hasPassword;

  const html = `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f5f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:0;border-collapse:collapse;">
    <tr>
      <td style="padding:20px 0;text-align:center;">
        <table role="presentation" style="width:600px;max-width:100%;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ae1725,#8b1220);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:300;letter-spacing:1px;">Reflets de Bonheur</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 10px;">${t.greeting(safeCoupleNames)}</p>
              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 25px;">${t.intro}</p>

              <!-- Access Button -->
              <h2 style="color:#ae1725;font-size:18px;margin:0 0 10px;border-bottom:2px solid #f0e6e8;padding-bottom:8px;">${t.accessTitle}</h2>
              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px;">${accessText}</p>
              <table role="presentation" style="margin:0 auto 25px;">
                <tr>
                  <td style="background-color:#ae1725;border-radius:8px;">
                    <a href="${magicLinkHref}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">${accessButton}</a>
                  </td>
                </tr>
              </table>
              ${showLinkExpiry ? `<p style="color:#999;font-size:12px;text-align:center;margin:0 0 25px;">${t.linkExpiry}</p>` : ''}

              <!-- Wedding Details -->
              <h2 style="color:#ae1725;font-size:18px;margin:0 0 15px;border-bottom:2px solid #f0e6e8;padding-bottom:8px;">${t.detailsTitle}</h2>
              <table role="presentation" style="width:100%;background-color:#faf7f4;border-radius:8px;margin:0 0 25px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="color:#555;font-size:14px;margin:0 0 8px;"><strong>${t.websiteLabel}</strong> <a href="${weddingUrl}" style="color:#ae1725;text-decoration:none;">${safeWeddingUrl}</a></p>
                    <p style="color:#555;font-size:14px;margin:0;"><strong>${t.guestCodeLabel}</strong> <code style="background:#e8e0d8;padding:2px 8px;border-radius:4px;font-size:16px;letter-spacing:2px;">${safeGuestCode}</code></p>
                    <p style="color:#888;font-size:12px;margin:8px 0 0;">${t.guestCodeHelp}</p>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <h2 style="color:#ae1725;font-size:18px;margin:0 0 15px;border-bottom:2px solid #f0e6e8;padding-bottom:8px;">${t.nextStepsTitle}</h2>
              <ol style="color:#555;font-size:14px;line-height:2;padding-left:20px;margin:0 0 25px;">
                ${nextSteps.map((step: string) => `<li>${step}</li>`).join('\n                ')}
              </ol>

              <!-- Support -->
              <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;text-align:center;">${t.supportText}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#faf7f4;padding:25px 30px;text-align:center;border-top:1px solid #e8e0d8;">
              <p style="color:#888;font-size:13px;margin:0 0 5px;">${t.footer}</p>
              <p style="color:#ae1725;font-size:14px;font-weight:600;margin:0;">${t.footerTeam}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: t.subject, html };
}

/**
 * Generate payment confirmation email HTML
 */
export function generatePaymentConfirmationEmail(data: PaymentConfirmationData): { subject: string; html: string } {
  const t = translations.paymentConfirmation[data.lang] || translations.paymentConfirmation.en;

  // Escape all user-supplied data to prevent XSS
  const safeCoupleNames = escapeHtml(data.coupleNames);
  const safeAmount = escapeHtml(data.amount);

  const today = new Date().toLocaleDateString(data.lang === 'fr' ? 'fr-FR' : data.lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f5f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:0;border-collapse:collapse;">
    <tr>
      <td style="padding:20px 0;text-align:center;">
        <table role="presentation" style="width:600px;max-width:100%;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ae1725,#8b1220);padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:300;letter-spacing:1px;">Reflets de Bonheur</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 10px;">${t.greeting(safeCoupleNames)}</p>
              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 25px;">${t.intro}</p>

              <!-- Payment Details -->
              <h2 style="color:#ae1725;font-size:18px;margin:0 0 15px;border-bottom:2px solid #f0e6e8;padding-bottom:8px;">${t.detailsTitle}</h2>
              <table role="presentation" style="width:100%;background-color:#faf7f4;border-radius:8px;margin:0 0 25px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" style="width:100%;">
                      <tr>
                        <td style="color:#555;font-size:14px;padding:5px 0;"><strong>${t.productLabel}</strong></td>
                        <td style="color:#333;font-size:14px;padding:5px 0;text-align:right;">${t.productName}</td>
                      </tr>
                      <tr>
                        <td style="color:#555;font-size:14px;padding:5px 0;"><strong>${t.amountLabel}</strong></td>
                        <td style="color:#333;font-size:14px;padding:5px 0;text-align:right;font-weight:600;">${safeAmount}</td>
                      </tr>
                      <tr>
                        <td style="color:#555;font-size:14px;padding:5px 0;"><strong>${t.dateLabel}</strong></td>
                        <td style="color:#333;font-size:14px;padding:5px 0;text-align:right;">${today}</td>
                      </tr>
                      <tr>
                        <td style="color:#555;font-size:14px;padding:5px 0;"><strong>${t.statusLabel}</strong></td>
                        <td style="padding:5px 0;text-align:right;"><span style="background-color:#dcfce7;color:#166534;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:600;">${t.statusPaid}</span></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 25px;">${t.accessText}</p>

              <!-- Support -->
              <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 20px;text-align:center;">${t.supportText}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#faf7f4;padding:25px 30px;text-align:center;border-top:1px solid #e8e0d8;">
              <p style="color:#888;font-size:13px;margin:0 0 5px;">${t.footer}</p>
              <p style="color:#ae1725;font-size:14px;font-weight:600;margin:0;">${t.footerTeam}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: t.subject, html };
}
