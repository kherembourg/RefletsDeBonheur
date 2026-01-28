export const languages = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
} as const;

export type Language = keyof typeof languages;

export const defaultLang: Language = 'en';

export const translations = {
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      features: 'Fonctionnalités',
      pricing: 'Tarifs',
      gallery: 'Galerie',
      guestbook: 'Livre d\'Or',
      login: 'Connexion',
      signup: 'Commencer',
      demo: 'Démo',
      admin: 'Administration',
      photos: 'Photos',
      info: 'Informations',
      rsvp: 'RSVP',
    },

    // Homepage
    home: {
      hero: {
        tagline: 'Galerie de mariage collaborative',
        title: 'Collectez tous les souvenirs de votre mariage',
        subtitle: 'Un espace unique pour rassembler les photos de vos invités, partager votre livre d\'or et créer votre site de mariage personnalisé.',
        cta: 'Créer mon espace',
        ctaSecondary: 'Voir la démo',
      },
      features: {
        title: 'Tout ce dont vous avez besoin',
        subtitle: 'Une solution complète pour immortaliser votre mariage',
        gallery: {
          title: 'Galerie Photos',
          description: 'Récupérez automatiquement toutes les photos de vos invités dans un album privé et sécurisé.',
        },
        guestbook: {
          title: 'Livre d\'Or',
          description: 'Collectez les messages de vos proches et gardez-les précieusement.',
        },
        website: {
          title: 'Site de Mariage',
          description: 'Un site web personnalisé avec votre domaine, programme et informations pratiques.',
        },
        download: {
          title: 'Téléchargement',
          description: 'Téléchargez toutes vos photos en un clic au format ZIP.',
        },
      },
      cta: {
        title: 'Prêt à commencer ?',
        subtitle: 'Créez votre espace mariage en quelques minutes',
        button: 'Commencer maintenant',
      },
    },

    // Pricing
    pricing: {
      tagline: 'Tarification',
      title: 'Une offre simple et transparente',
      subtitle: 'Tout ce dont vous avez besoin pour immortaliser votre mariage, sans surprises',
      badge: 'Offre de lancement',
      plan: 'Forfait Complet',
      planSubtitle: 'Tous les services inclus',
      price: '99€',
      originalPrice: '149€',
      duration: 'pour 2 ans',
      savings: 'Économisez 50€',
      renewal: 'Puis 19,99€/an pour garder votre galerie',
      cta: 'Commencer maintenant',
      guarantee: 'Garantie satisfait ou remboursé 30 jours',
      features: {
        title: 'Inclus dans l\'offre',
        subtitle: 'Tout ce dont vous avez besoin',
        list: [
          'Galerie photos & vidéos illimitée',
          'Nom de domaine personnalisé',
          'Livre d\'or numérique',
          'Site web de mariage',
          'Application mobile (PWA)',
          'Mode hors ligne',
          'Téléchargement groupé (ZIP)',
          'Export PDF du livre d\'or',
          'Albums par catégories',
          'Réactions & favoris',
          'Mode diaporama',
          'Support par email',
        ],
      },
      services: {
        gallery: {
          title: 'Galerie Photos',
          features: ['Upload illimité', 'Albums organisés', 'Téléchargement ZIP'],
        },
        guestbook: {
          title: 'Livre d\'Or',
          features: ['Messages illimités', 'Modération admin', 'Export PDF'],
        },
        website: {
          title: 'Site de Mariage',
          features: ['Domaine personnalisé', 'Programme & lieu', 'RSVP intégré'],
        },
      },
      faq: {
        title: 'Questions fréquentes',
        subtitle: 'Nous répondons à vos questions',
        items: [
          {
            question: 'Comment fonctionne le domaine personnalisé ?',
            answer: 'Vous choisissez votre nom lors de l\'inscription (ex: marie-thomas.reflets-bonheur.fr). Ce sera l\'adresse unique de votre espace mariage, accessible par tous vos invités.',
          },
          {
            question: 'Comment fonctionne le renouvellement ?',
            answer: 'Après 2 ans, si vous souhaitez garder votre galerie en ligne (mode lecture seule, sans nouveaux uploads), c\'est seulement 19,99€/an. Le renouvellement est optionnel - vous pouvez télécharger vos données à tout moment.',
          },
          {
            question: 'Mes photos sont-elles sécurisées ?',
            answer: 'Oui, vos données sont chiffrées et sauvegardées automatiquement. Seules les personnes ayant le code d\'accès peuvent voir votre galerie.',
          },
          {
            question: 'Puis-je récupérer mes photos ?',
            answer: 'À tout moment, vous pouvez télécharger l\'intégralité de vos photos et vidéos en un clic (format ZIP). Le livre d\'or peut être exporté en PDF.',
          },
        ],
      },
      comparison: {
        title: 'Pourquoi nous choisir ?',
        headers: ['Fonctionnalité', 'Reflets de Bonheur', 'Google Photos', 'WeTransfer'],
        features: {
          price: 'Prix',
          customDomain: 'Domaine personnalisé',
          guestbook: 'Livre d\'or',
          website: 'Site web mariage',
          originalQuality: 'Qualité originale',
          noAds: 'Sans publicité',
        },
      },
      finalCta: {
        title: 'Prêt à commencer ?',
        subtitle: 'Domaine personnalisé inclus',
        renewalNote: 'Puis 19,99€/an pour le renouvellement',
      },
    },

    // Login
    login: {
      title: 'Connexion',
      subtitle: 'Accédez à votre espace mariage',
      email: 'Email',
      password: 'Mot de passe',
      remember: 'Se souvenir de moi',
      forgot: 'Mot de passe oublié ?',
      submit: 'Se connecter',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'Créer un compte',
      or: 'ou',
      guestAccess: 'Accès invité',
      guestCode: 'Code d\'accès',
      guestSubmit: 'Accéder à la galerie',
    },

    // Signup
    signup: {
      title: 'Créez Votre Espace Mariage',
      subtitle: 'Votre galerie privée, livre d\'or et site de mariage—tout en un seul endroit magnifique.',
      tagline: 'Commencer',
      steps: {
        account: 'Compte',
        details: 'Détails',
        url: 'URL',
        theme: 'Thème',
      },
      account: {
        title: 'Créez Votre Compte',
        subtitle: 'Commencez votre essai gratuit d\'1 mois. Aucune carte de crédit requise.',
        email: 'Adresse email',
        emailPlaceholder: 'vous@exemple.com',
        password: 'Mot de passe',
        passwordPlaceholder: 'Au moins 8 caractères',
        confirmPassword: 'Confirmer le mot de passe',
        confirmPlaceholder: 'Retapez votre mot de passe',
        alreadyHaveAccount: 'Vous avez déjà un compte ?',
        signIn: 'Se connecter',
      },
      wedding: {
        title: 'Parlez-nous de Votre Mariage',
        subtitle: 'Entrez les noms des heureux mariés.',
        partner1: 'Partenaire 1',
        partner1Placeholder: 'ex: Marie',
        partner2: 'Partenaire 2',
        partner2Placeholder: 'ex: Thomas',
        weddingDate: 'Date du mariage',
        dateHelper: 'Optionnel - vous pouvez l\'ajouter plus tard',
      },
      slug: {
        title: 'Choisissez Votre URL',
        subtitle: 'Ce sera l\'adresse de votre site de mariage.',
        label: 'URL du site de mariage',
        placeholder: 'marie-thomas',
        preview: 'Votre site sera disponible à :',
        available: 'Cette URL est disponible !',
        taken: 'Cette URL est déjà utilisée.',
        reserved: 'Cette URL est réservée.',
        invalid: 'L\'URL doit contenir entre 3 et 50 caractères, lettres minuscules, chiffres et tirets uniquement.',
        suggestions: 'Essayez plutôt :',
        guidelines: {
          title: 'Règles pour l\'URL :',
          lowercase: 'Utilisez des lettres minuscules, chiffres et tirets uniquement',
          length: 'Doit contenir entre 3 et 50 caractères',
          auto: 'Sera automatiquement converti en minuscules',
        },
      },
      theme: {
        title: 'Choisissez Votre Thème',
        subtitle: 'Sélectionnez un style pour votre site de mariage. Vous pourrez le personnaliser plus tard.',
        submit: 'Créer Mon Site de Mariage',
        creating: 'Création...',
        terms: 'En créant un compte, vous acceptez nos',
        termsLink: 'Conditions',
        and: 'et',
        privacyLink: 'Politique de confidentialité',
      },
      navigation: {
        back: 'Retour',
        continue: 'Continuer',
        checking: 'Vérification...',
      },
      trial: {
        info: 'Essai gratuit d\'1 mois',
        photos: 'Jusqu\'à 50 photos',
        video: '1 vidéo',
        noCard: 'Aucune carte de crédit requise',
      },
      errors: {
        emailRequired: 'L\'email est requis',
        emailInvalid: 'Veuillez entrer une adresse email valide',
        passwordRequired: 'Le mot de passe est requis',
        passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
        confirmRequired: 'Veuillez confirmer votre mot de passe',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
        partner1Required: 'Le nom du premier partenaire est requis',
        partner2Required: 'Le nom du second partenaire est requis',
        slugRequired: 'Veuillez entrer une URL pour votre site de mariage',
        slugTooShort: 'L\'URL doit contenir au moins 3 caractères',
        emailExists: 'Un compte avec cet email existe déjà. Veuillez vous connecter.',
        networkError: 'Erreur réseau. Veuillez vérifier votre connexion et réessayer.',
      },
    },

    // Gallery
    gallery: {
      title: 'Galerie Photos',
      subtitle: 'Partagez vos plus beaux moments',
      upload: 'Ajouter des photos',
      download: 'Télécharger tout',
      filter: 'Filtrer',
      sort: 'Trier',
      noPhotos: 'Aucune photo pour le moment',
      uploadFirst: 'Soyez le premier à partager un souvenir !',
    },

    // Guestbook
    guestbook: {
      title: 'Livre d\'Or',
      subtitle: 'Laissez un message aux mariés',
      placeholder: 'Votre message...',
      name: 'Votre nom',
      submit: 'Envoyer',
      noMessages: 'Aucun message pour le moment',
      beFirst: 'Soyez le premier à laisser un message !',
    },

    // Footer
    footer: {
      description: 'Votre galerie de mariage collaborative',
      navigation: 'Navigation',
      legal: 'Légal',
      privacyPolicy: 'Politique de confidentialité',
      terms: 'CGV',
      legalNotice: 'Mentions légales',
      copyright: 'Tous droits réservés',
      madeWith: 'Fait avec',
      inFrance: 'en France',
    },

    // Common
    common: {
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      retry: 'Réessayer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      search: 'Rechercher',
      viewMore: 'Voir plus',
      viewLess: 'Voir moins',
      yes: 'Oui',
      no: 'Non',
      free: 'Gratuit',
      compressed: 'Compressé',
      proVersion: 'Version Pro',
    },
  },

  en: {
    // Navigation
    nav: {
      home: 'Home',
      features: 'Features',
      pricing: 'Pricing',
      gallery: 'Gallery',
      guestbook: 'Guestbook',
      login: 'Login',
      signup: 'Get Started',
      demo: 'Demo',
      admin: 'Admin',
      photos: 'Photos',
      info: 'Information',
      rsvp: 'RSVP',
    },

    // Homepage
    home: {
      hero: {
        tagline: 'Collaborative wedding gallery',
        title: 'Collect all the memories from your wedding',
        subtitle: 'A unique space to gather photos from your guests, share your guestbook, and create your personalized wedding website.',
        cta: 'Create my space',
        ctaSecondary: 'View demo',
      },
      features: {
        title: 'Everything you need',
        subtitle: 'A complete solution to preserve your wedding memories',
        gallery: {
          title: 'Photo Gallery',
          description: 'Automatically collect all photos from your guests in a private and secure album.',
        },
        guestbook: {
          title: 'Guestbook',
          description: 'Collect messages from your loved ones and keep them forever.',
        },
        website: {
          title: 'Wedding Website',
          description: 'A personalized website with your domain, schedule, and practical information.',
        },
        download: {
          title: 'Download',
          description: 'Download all your photos in one click as a ZIP file.',
        },
      },
      cta: {
        title: 'Ready to get started?',
        subtitle: 'Create your wedding space in minutes',
        button: 'Start now',
      },
    },

    // Pricing
    pricing: {
      tagline: 'Pricing',
      title: 'Simple and transparent pricing',
      subtitle: 'Everything you need to preserve your wedding, no surprises',
      badge: 'Launch offer',
      plan: 'Complete Package',
      planSubtitle: 'All services included',
      price: '$199',
      originalPrice: '$249',
      duration: 'for 2 years',
      savings: 'Save $50',
      renewal: 'Then $19.99/year to keep your gallery',
      cta: 'Get started',
      guarantee: '30-day money-back guarantee',
      features: {
        title: 'Included in the offer',
        subtitle: 'Everything you need',
        list: [
          'Unlimited photos & videos gallery',
          'Custom domain name',
          'Digital guestbook',
          'Wedding website',
          'Mobile app (PWA)',
          'Offline mode',
          'Bulk download (ZIP)',
          'PDF export of guestbook',
          'Category albums',
          'Reactions & favorites',
          'Slideshow mode',
          'Email support',
        ],
      },
      services: {
        gallery: {
          title: 'Photo Gallery',
          features: ['Unlimited upload', 'Organized albums', 'ZIP download'],
        },
        guestbook: {
          title: 'Guestbook',
          features: ['Unlimited messages', 'Admin moderation', 'PDF export'],
        },
        website: {
          title: 'Wedding Website',
          features: ['Custom domain', 'Schedule & venue', 'Built-in RSVP'],
        },
      },
      faq: {
        title: 'Frequently asked questions',
        subtitle: 'We answer your questions',
        items: [
          {
            question: 'How does the custom domain work?',
            answer: 'You choose your name during signup (e.g., john-jane.reflets-bonheur.fr). This will be the unique address for your wedding space, accessible to all your guests.',
          },
          {
            question: 'How does renewal work?',
            answer: 'After 2 years, if you want to keep your gallery online (read-only mode, no new uploads), it\'s only $19.99/year. Renewal is optional - you can download your data at any time.',
          },
          {
            question: 'Are my photos secure?',
            answer: 'Yes, your data is encrypted and automatically backed up. Only people with the access code can see your gallery.',
          },
          {
            question: 'Can I download my photos?',
            answer: 'At any time, you can download all your photos and videos in one click (ZIP format). The guestbook can be exported as PDF.',
          },
        ],
      },
      comparison: {
        title: 'Why choose us?',
        headers: ['Feature', 'Reflets de Bonheur', 'Google Photos', 'WeTransfer'],
        features: {
          price: 'Price',
          customDomain: 'Custom domain',
          guestbook: 'Guestbook',
          website: 'Wedding website',
          originalQuality: 'Original quality',
          noAds: 'No ads',
        },
      },
      finalCta: {
        title: 'Ready to start?',
        subtitle: 'Custom domain included',
        renewalNote: 'Then $19.99/year for renewal',
      },
    },

    // Login
    login: {
      title: 'Login',
      subtitle: 'Access your wedding space',
      email: 'Email',
      password: 'Password',
      remember: 'Remember me',
      forgot: 'Forgot password?',
      submit: 'Sign in',
      noAccount: 'Don\'t have an account?',
      createAccount: 'Create account',
      or: 'or',
      guestAccess: 'Guest access',
      guestCode: 'Access code',
      guestSubmit: 'Access gallery',
    },

    // Signup
    signup: {
      title: 'Create Your Wedding Space',
      subtitle: 'Your private gallery, guestbook, and wedding website—all in one beautiful place.',
      tagline: 'Get Started',
      steps: {
        account: 'Account',
        details: 'Details',
        url: 'URL',
        theme: 'Theme',
      },
      account: {
        title: 'Create Your Account',
        subtitle: 'Start your 1-month free trial. No credit card required.',
        email: 'Email Address',
        emailPlaceholder: 'you@example.com',
        password: 'Password',
        passwordPlaceholder: 'At least 8 characters',
        confirmPassword: 'Confirm Password',
        confirmPlaceholder: 'Re-enter your password',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
      },
      wedding: {
        title: 'Tell Us About Your Wedding',
        subtitle: 'Enter the names of the happy couple.',
        partner1: 'Partner 1',
        partner1Placeholder: 'e.g., Marie',
        partner2: 'Partner 2',
        partner2Placeholder: 'e.g., Thomas',
        weddingDate: 'Wedding Date',
        dateHelper: 'Optional - you can add this later',
      },
      slug: {
        title: 'Choose Your URL',
        subtitle: 'This will be the address for your wedding website.',
        label: 'Wedding Site URL',
        placeholder: 'marie-thomas',
        preview: 'Your site will be available at:',
        available: 'This URL is available!',
        taken: 'This URL is already in use.',
        reserved: 'This URL is reserved.',
        invalid: 'URL must be 3-50 characters, lowercase letters, numbers, and hyphens only.',
        suggestions: 'Try instead:',
        guidelines: {
          title: 'URL Guidelines:',
          lowercase: 'Use lowercase letters, numbers, and hyphens only',
          length: 'Must be between 3 and 50 characters',
          auto: 'Will be converted to lowercase automatically',
        },
      },
      theme: {
        title: 'Choose Your Theme',
        subtitle: 'Select a style for your wedding website. You can customize it later.',
        submit: 'Create My Wedding Site',
        creating: 'Creating...',
        terms: 'By creating an account, you agree to our',
        termsLink: 'Terms',
        and: 'and',
        privacyLink: 'Privacy Policy',
      },
      navigation: {
        back: 'Back',
        continue: 'Continue',
        checking: 'Checking...',
      },
      trial: {
        info: '1-month free trial',
        photos: 'Up to 50 photos',
        video: '1 video',
        noCard: 'No credit card required',
      },
      errors: {
        emailRequired: 'Email is required',
        emailInvalid: 'Please enter a valid email address',
        passwordRequired: 'Password is required',
        passwordTooShort: 'Password must be at least 8 characters',
        confirmRequired: 'Please confirm your password',
        passwordMismatch: 'Passwords do not match',
        partner1Required: 'First partner name is required',
        partner2Required: 'Second partner name is required',
        slugRequired: 'Please enter a URL for your wedding site',
        slugTooShort: 'URL must be at least 3 characters',
        emailExists: 'An account with this email already exists. Please sign in instead.',
        networkError: 'Network error. Please check your connection and try again.',
      },
    },

    // Gallery
    gallery: {
      title: 'Photo Gallery',
      subtitle: 'Share your best moments',
      upload: 'Add photos',
      download: 'Download all',
      filter: 'Filter',
      sort: 'Sort',
      noPhotos: 'No photos yet',
      uploadFirst: 'Be the first to share a memory!',
    },

    // Guestbook
    guestbook: {
      title: 'Guestbook',
      subtitle: 'Leave a message for the couple',
      placeholder: 'Your message...',
      name: 'Your name',
      submit: 'Send',
      noMessages: 'No messages yet',
      beFirst: 'Be the first to leave a message!',
    },

    // Footer
    footer: {
      description: 'Your collaborative wedding gallery',
      navigation: 'Navigation',
      legal: 'Legal',
      privacyPolicy: 'Privacy Policy',
      terms: 'Terms of Service',
      legalNotice: 'Legal Notice',
      copyright: 'All rights reserved',
      madeWith: 'Made with',
      inFrance: 'in France',
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      retry: 'Retry',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      search: 'Search',
      viewMore: 'View more',
      viewLess: 'View less',
      yes: 'Yes',
      no: 'No',
      free: 'Free',
      compressed: 'Compressed',
      proVersion: 'Pro version',
    },
  },

  // Spanish - Structure ready for future translation
  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      features: 'Características',
      pricing: 'Precios',
      gallery: 'Galería',
      guestbook: 'Libro de Visitas',
      login: 'Iniciar sesión',
      signup: 'Comenzar',
      demo: 'Demo',
      admin: 'Administración',
      photos: 'Fotos',
      info: 'Información',
      rsvp: 'Confirmar asistencia',
    },

    // Homepage
    home: {
      hero: {
        tagline: 'Galería de boda colaborativa',
        title: 'Recopila todos los recuerdos de tu boda',
        subtitle: 'Un espacio único para reunir las fotos de tus invitados, compartir tu libro de visitas y crear tu sitio web de boda personalizado.',
        cta: 'Crear mi espacio',
        ctaSecondary: 'Ver demo',
      },
      features: {
        title: 'Todo lo que necesitas',
        subtitle: 'Una solución completa para preservar los recuerdos de tu boda',
        gallery: {
          title: 'Galería de Fotos',
          description: 'Recopila automáticamente todas las fotos de tus invitados en un álbum privado y seguro.',
        },
        guestbook: {
          title: 'Libro de Visitas',
          description: 'Recopila mensajes de tus seres queridos y guárdalos para siempre.',
        },
        website: {
          title: 'Sitio Web de Boda',
          description: 'Un sitio web personalizado con tu dominio, horario e información práctica.',
        },
        download: {
          title: 'Descarga',
          description: 'Descarga todas tus fotos en un clic en formato ZIP.',
        },
      },
      cta: {
        title: '¿Listo para comenzar?',
        subtitle: 'Crea tu espacio de boda en minutos',
        button: 'Comenzar ahora',
      },
    },

    // Pricing
    pricing: {
      tagline: 'Precios',
      title: 'Precios simples y transparentes',
      subtitle: 'Todo lo que necesitas para preservar tu boda, sin sorpresas',
      badge: 'Oferta de lanzamiento',
      plan: 'Paquete Completo',
      planSubtitle: 'Todos los servicios incluidos',
      price: '99€',
      originalPrice: '149€',
      duration: 'por 2 años',
      savings: 'Ahorra 50€',
      renewal: 'Luego 19,99€/año para mantener tu galería',
      cta: 'Comenzar',
      guarantee: 'Garantía de devolución de 30 días',
      features: {
        title: 'Incluido en la oferta',
        subtitle: 'Todo lo que necesitas',
        list: [
          'Galería de fotos y videos ilimitada',
          'Nombre de dominio personalizado',
          'Libro de visitas digital',
          'Sitio web de boda',
          'Aplicación móvil (PWA)',
          'Modo sin conexión',
          'Descarga masiva (ZIP)',
          'Exportar libro de visitas a PDF',
          'Álbumes por categorías',
          'Reacciones y favoritos',
          'Modo presentación',
          'Soporte por email',
        ],
      },
      services: {
        gallery: {
          title: 'Galería de Fotos',
          features: ['Carga ilimitada', 'Álbumes organizados', 'Descarga ZIP'],
        },
        guestbook: {
          title: 'Libro de Visitas',
          features: ['Mensajes ilimitados', 'Moderación admin', 'Exportar PDF'],
        },
        website: {
          title: 'Sitio Web de Boda',
          features: ['Dominio personalizado', 'Horario y lugar', 'RSVP integrado'],
        },
      },
      faq: {
        title: 'Preguntas frecuentes',
        subtitle: 'Respondemos tus preguntas',
        items: [
          {
            question: '¿Cómo funciona el dominio personalizado?',
            answer: 'Eliges tu nombre durante el registro (ej: maria-jose.reflets-bonheur.fr). Esta será la dirección única de tu espacio de boda, accesible para todos tus invitados.',
          },
          {
            question: '¿Cómo funciona la renovación?',
            answer: 'Después de 2 años, si quieres mantener tu galería en línea (modo solo lectura, sin nuevas cargas), cuesta solo 19,99€/año. La renovación es opcional - puedes descargar tus datos en cualquier momento.',
          },
          {
            question: '¿Mis fotos están seguras?',
            answer: 'Sí, tus datos están encriptados y respaldados automáticamente. Solo las personas con el código de acceso pueden ver tu galería.',
          },
          {
            question: '¿Puedo descargar mis fotos?',
            answer: 'En cualquier momento, puedes descargar todas tus fotos y videos en un clic (formato ZIP). El libro de visitas se puede exportar como PDF.',
          },
        ],
      },
      comparison: {
        title: '¿Por qué elegirnos?',
        headers: ['Característica', 'Reflets de Bonheur', 'Google Photos', 'WeTransfer'],
        features: {
          price: 'Precio',
          customDomain: 'Dominio personalizado',
          guestbook: 'Libro de visitas',
          website: 'Sitio web de boda',
          originalQuality: 'Calidad original',
          noAds: 'Sin anuncios',
        },
      },
      finalCta: {
        title: '¿Listo para comenzar?',
        subtitle: 'Dominio personalizado incluido',
        renewalNote: 'Luego 19,99€/año para renovación',
      },
    },

    // Login
    login: {
      title: 'Iniciar sesión',
      subtitle: 'Accede a tu espacio de boda',
      email: 'Correo electrónico',
      password: 'Contraseña',
      remember: 'Recordarme',
      forgot: '¿Olvidaste tu contraseña?',
      submit: 'Entrar',
      noAccount: '¿No tienes cuenta?',
      createAccount: 'Crear cuenta',
      or: 'o',
      guestAccess: 'Acceso de invitado',
      guestCode: 'Código de acceso',
      guestSubmit: 'Acceder a la galería',
    },

    // Signup
    signup: {
      title: 'Crea Tu Espacio de Boda',
      subtitle: 'Tu galería privada, libro de visitas y sitio web de boda—todo en un hermoso lugar.',
      tagline: 'Empezar',
      steps: {
        account: 'Cuenta',
        details: 'Detalles',
        url: 'URL',
        theme: 'Tema',
      },
      account: {
        title: 'Crea Tu Cuenta',
        subtitle: 'Comienza tu prueba gratuita de 1 mes. No se requiere tarjeta de crédito.',
        email: 'Correo electrónico',
        emailPlaceholder: 'tu@ejemplo.com',
        password: 'Contraseña',
        passwordPlaceholder: 'Al menos 8 caracteres',
        confirmPassword: 'Confirmar contraseña',
        confirmPlaceholder: 'Vuelve a escribir tu contraseña',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        signIn: 'Iniciar sesión',
      },
      wedding: {
        title: 'Cuéntanos Sobre Tu Boda',
        subtitle: 'Ingresa los nombres de la feliz pareja.',
        partner1: 'Pareja 1',
        partner1Placeholder: 'ej: María',
        partner2: 'Pareja 2',
        partner2Placeholder: 'ej: Tomás',
        weddingDate: 'Fecha de la boda',
        dateHelper: 'Opcional - puedes agregarlo después',
      },
      slug: {
        title: 'Elige Tu URL',
        subtitle: 'Esta será la dirección de tu sitio web de boda.',
        label: 'URL del sitio de boda',
        placeholder: 'maria-tomas',
        preview: 'Tu sitio estará disponible en:',
        available: '¡Esta URL está disponible!',
        taken: 'Esta URL ya está en uso.',
        reserved: 'Esta URL está reservada.',
        invalid: 'La URL debe tener entre 3 y 50 caracteres, solo letras minúsculas, números y guiones.',
        suggestions: 'Prueba en su lugar:',
        guidelines: {
          title: 'Reglas para la URL:',
          lowercase: 'Usa solo letras minúsculas, números y guiones',
          length: 'Debe tener entre 3 y 50 caracteres',
          auto: 'Se convertirá automáticamente a minúsculas',
        },
      },
      theme: {
        title: 'Elige Tu Tema',
        subtitle: 'Selecciona un estilo para tu sitio web de boda. Puedes personalizarlo después.',
        submit: 'Crear Mi Sitio de Boda',
        creating: 'Creando...',
        terms: 'Al crear una cuenta, aceptas nuestros',
        termsLink: 'Términos',
        and: 'y',
        privacyLink: 'Política de privacidad',
      },
      navigation: {
        back: 'Atrás',
        continue: 'Continuar',
        checking: 'Verificando...',
      },
      trial: {
        info: 'Prueba gratuita de 1 mes',
        photos: 'Hasta 50 fotos',
        video: '1 video',
        noCard: 'No se requiere tarjeta de crédito',
      },
      errors: {
        emailRequired: 'El correo electrónico es requerido',
        emailInvalid: 'Por favor ingresa una dirección de correo válida',
        passwordRequired: 'La contraseña es requerida',
        passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
        confirmRequired: 'Por favor confirma tu contraseña',
        passwordMismatch: 'Las contraseñas no coinciden',
        partner1Required: 'El nombre del primer miembro de la pareja es requerido',
        partner2Required: 'El nombre del segundo miembro de la pareja es requerido',
        slugRequired: 'Por favor ingresa una URL para tu sitio de boda',
        slugTooShort: 'La URL debe tener al menos 3 caracteres',
        emailExists: 'Ya existe una cuenta con este correo electrónico. Por favor inicia sesión.',
        networkError: 'Error de red. Por favor verifica tu conexión e intenta de nuevo.',
      },
    },

    // Gallery
    gallery: {
      title: 'Galería de Fotos',
      subtitle: 'Comparte tus mejores momentos',
      upload: 'Agregar fotos',
      download: 'Descargar todo',
      filter: 'Filtrar',
      sort: 'Ordenar',
      noPhotos: 'Aún no hay fotos',
      uploadFirst: '¡Sé el primero en compartir un recuerdo!',
    },

    // Guestbook
    guestbook: {
      title: 'Libro de Visitas',
      subtitle: 'Deja un mensaje para los novios',
      placeholder: 'Tu mensaje...',
      name: 'Tu nombre',
      submit: 'Enviar',
      noMessages: 'Aún no hay mensajes',
      beFirst: '¡Sé el primero en dejar un mensaje!',
    },

    // Footer
    footer: {
      description: 'Tu galería de boda colaborativa',
      navigation: 'Navegación',
      legal: 'Legal',
      privacyPolicy: 'Política de privacidad',
      terms: 'Términos de servicio',
      legalNotice: 'Aviso legal',
      copyright: 'Todos los derechos reservados',
      madeWith: 'Hecho con',
      inFrance: 'en Francia',
    },

    // Common
    common: {
      loading: 'Cargando...',
      error: 'Ocurrió un error',
      retry: 'Reintentar',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      search: 'Buscar',
      viewMore: 'Ver más',
      viewLess: 'Ver menos',
      yes: 'Sí',
      no: 'No',
      free: 'Gratis',
      compressed: 'Comprimido',
      proVersion: 'Versión Pro',
    },
  },
} as const;

export type TranslationKeys = typeof translations.fr;
