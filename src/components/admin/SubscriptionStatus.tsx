import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Clock, AlertTriangle, CheckCircle, Loader2, ExternalLink, CloudOff } from 'lucide-react';
import type { SubscriptionInfo } from '../../lib/stripe/types';
import { SUBSCRIPTION_STATUS_LABELS } from '../../lib/stripe/types';

interface SubscriptionStatusProps {
  profileId: string;
  demoMode?: boolean;
}

export function SubscriptionStatus({ profileId, demoMode = false }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      // Demo mode - show trial status
      setSubscription({
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        daysRemaining: 30,
        isTrialExpired: false,
        canUploadToCloud: false,
      });
      setLoading(false);
      return;
    }

    // Fetch subscription status from API
    fetchSubscriptionStatus();
  }, [profileId, demoMode]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch(`/api/stripe/subscription?profileId=${profileId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Impossible de charger le statut de l\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          successUrl: `${window.location.origin}/admin?payment=success`,
          cancelUrl: `${window.location.origin}/admin?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError('Erreur lors de la création de la session de paiement');
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          returnUrl: `${window.location.origin}/admin`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError('Erreur lors de l\'accès au portail de gestion');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#ae1725] animate-spin" />
        <span className="ml-2 text-charcoal/60 font-light">Chargement...</span>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-8 text-charcoal/50 font-light">
        Impossible de charger les informations d'abonnement
      </div>
    );
  }

  const statusInfo = SUBSCRIPTION_STATUS_LABELS[subscription.status] || SUBSCRIPTION_STATUS_LABELS.trial;
  const isTrialOrExpired = subscription.status === 'trial' || subscription.status === 'expired';

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 border rounded-lg ${statusInfo.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {subscription.status === 'active' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : subscription.status === 'trial' ? (
              <Clock className="w-5 h-5 text-amber-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
              {subscription.daysRemaining > 0 && subscription.status === 'trial' && (
                <p className="text-sm text-charcoal/60 mt-0.5">
                  {subscription.daysRemaining} jours restants
                </p>
              )}
            </div>
          </div>
          {subscription.trialEndsAt && subscription.status === 'trial' && (
            <div className="text-right">
              <p className="text-xs text-charcoal/50">Fin de l'essai</p>
              <p className="text-sm font-medium text-charcoal/70">
                {new Date(subscription.trialEndsAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trial Limitations Notice */}
      {subscription.status === 'trial' && !subscription.canUploadToCloud && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CloudOff className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Mode essai gratuit</p>
              <p className="text-sm text-amber-700 mt-1">
                Pendant l'essai, vos photos sont stockées localement.
                Passez à la version payante pour bénéficier du stockage cloud illimité
                et de toutes les fonctionnalités.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Period (for active subscriptions) */}
      {subscription.status === 'active' && subscription.currentPeriodEnd && (
        <div className="flex items-center gap-3 p-4 bg-white border border-charcoal/10 rounded-lg">
          <Calendar className="w-5 h-5 text-charcoal/40" />
          <div>
            <p className="text-sm text-charcoal/50">Prochain renouvellement</p>
            <p className="font-medium text-charcoal">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Cancellation Notice */}
      {subscription.cancelAtPeriodEnd && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Annulation programmée</p>
              <p className="text-sm text-amber-700 mt-1">
                Votre abonnement sera annulé à la fin de la période actuelle.
                Vous pouvez réactiver votre abonnement depuis le portail de gestion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {isTrialOrExpired ? (
          <button
            onClick={handleUpgrade}
            disabled={checkoutLoading || demoMode}
            className="w-full flex items-center justify-center gap-2 bg-[#ae1725] hover:bg-[#c92a38] text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirection...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Passer au forfait complet - 199 €</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading || demoMode || !subscription.stripeCustomerId}
            className="w-full flex items-center justify-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirection...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Gérer mon abonnement</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Pricing Info */}
      <div className="text-center text-sm text-charcoal/50 pt-4 border-t border-charcoal/10">
        <p>
          <span className="font-medium text-charcoal/70">199 €</span> pour 2 ans
          {' • '}
          <span className="font-medium text-charcoal/70">19,99 €/an</span> ensuite
        </p>
        <p className="mt-1 text-xs">
          Stockage illimité, site web, livre d'or, et plus encore
        </p>
      </div>
    </div>
  );
}
