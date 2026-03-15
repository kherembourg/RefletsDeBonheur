const statusContainer = document.getElementById('status-container');

function renderLoading(title, subtitle) {
  if (!statusContainer) return;

  statusContainer.innerHTML = `
    <div class="mx-auto mb-6 h-12 w-12 rounded-full border-[3px] border-gray-700 border-t-amber-500 animate-spin"></div>
    <p class="mb-2 text-xl font-semibold text-gray-50"></p>
    <p class="text-sm text-gray-400"></p>
  `;

  const [titleEl, subtitleEl] = statusContainer.querySelectorAll('p');
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
}

function renderError(errorTitle, errorMessage) {
  if (!statusContainer) return;

  statusContainer.innerHTML = `
    <div class="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-left">
      <p class="mb-2 text-lg font-semibold text-red-200"></p>
      <p class="mb-4 text-sm text-red-100/80"></p>
      <a href="/god" class="inline-flex text-sm font-medium text-amber-300 hover:text-amber-200">
        ← Retour au tableau de bord
      </a>
    </div>
  `;

  const [titleEl, messageEl] = statusContainer.querySelectorAll('p');
  if (titleEl) titleEl.textContent = errorTitle;
  if (messageEl) messageEl.textContent = errorMessage;
}

async function verifyImpersonationToken(token) {
  const response = await fetch('/api/god/verify-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error('Verification request failed');
  }

  return response.json();
}

async function handleImpersonation() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    renderError('Token manquant', 'Aucun token d’accès fourni.');
    return;
  }

  try {
    const result = await verifyImpersonationToken(token);

    if (!result.valid || !result.client) {
      renderError('Accès refusé', result.error || 'Token invalide ou expiré.');
      return;
    }

    localStorage.setItem('reflets_god_impersonation', JSON.stringify({
      client_id: result.client.id,
      wedding_name: result.client.wedding_name,
      couple_names: result.client.couple_names,
      wedding_slug: result.client.wedding_slug,
      is_god_access: true,
      timestamp: Date.now(),
    }));

    localStorage.setItem('reflets_client_session', JSON.stringify({
      client_id: result.client.id,
      wedding_name: result.client.wedding_name,
      couple_names: result.client.couple_names,
      wedding_slug: result.client.wedding_slug,
      is_admin: true,
    }));

    renderLoading('Accès autorisé', `Redirection vers ${result.client.wedding_name}...`);

    window.setTimeout(() => {
      window.location.href = `/${result.client.wedding_slug}/admin`;
    }, 1000);
  } catch (error) {
    console.error('Impersonation error:', error);
    renderError('Erreur', 'Une erreur inattendue s’est produite.');
  }
}

void handleImpersonation();
