import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserCheck,
  Settings,
  MessageSquare,
  BarChart3,
  Users,
  Check,
  X,
  HelpCircle,
  Save,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import {
  AdminButton,
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardBody,
  AdminToggle,
  AdminInput,
  AdminTextarea,
  AdminSection,
  AdminDivider,
  AdminBadge,
  cn,
} from '../ui';
import { RSVPQuestionBuilder } from './RSVPQuestionBuilder';
import { RSVPResponsesViewer } from './RSVPResponsesViewer';
import type { RSVPConfig, RSVPStatistics, RSVPQuestion } from '../../../lib/rsvp/types';
import { RSVPService } from '../../../lib/rsvp/rsvpService';
import { DEFAULT_RSVP_CONFIG } from '../../../lib/rsvp/types';

interface RSVPManagerProps {
  weddingId: string;
  demoMode?: boolean;
}

type TabId = 'settings' | 'questions' | 'responses';

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'questions', label: 'Questions', icon: MessageSquare },
  { id: 'responses', label: 'Réponses', icon: Users },
];

export function RSVPManager({ weddingId, demoMode = false }: RSVPManagerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [config, setConfig] = useState<RSVPConfig>(DEFAULT_RSVP_CONFIG);
  const [statistics, setStatistics] = useState<RSVPStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const serviceRef = useRef<RSVPService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = new RSVPService({ weddingId, demoMode });
  }
  const rsvpService = serviceRef.current;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configData, statsData] = await Promise.all([
        rsvpService.getConfig(),
        rsvpService.getStatistics(),
      ]);
      setConfig(configData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Failed to load RSVP data:', error);
    } finally {
      setLoading(false);
    }
  }, [rsvpService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = (updates: Partial<RSVPConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rsvpService.saveConfig(config);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    updateConfig({ enabled });
  };

  const handleQuestionsChange = (questions: RSVPQuestion[]) => {
    updateConfig({ questions });
  };

  const handleDeleteResponse = () => {
    // Refresh statistics after deletion
    rsvpService.getStatistics().then(setStatistics);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 animate-spin">
          <Loader2 className="w-full h-full text-burgundy-old" />
        </div>
        <span className="ml-3 text-charcoal/60 font-light">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle and save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AdminToggle
            enabled={config.enabled}
            onChange={handleToggleEnabled}
            label="RSVP activé"
            description={config.enabled ? 'Les invités peuvent répondre' : 'Le formulaire est désactivé'}
            size="md"
          />
        </div>

        {hasChanges && (
          <AdminButton
            variant="primary"
            leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </AdminButton>
        )}
      </div>

      {/* Statistics cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <AdminCard padding="sm" className="text-center">
            <div className="text-2xl font-serif font-light text-charcoal">
              {statistics.total}
            </div>
            <div className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">
              Réponses
            </div>
          </AdminCard>

          <AdminCard padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-serif font-light text-green-600">
                {statistics.attending}
              </span>
            </div>
            <div className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">
              Présents
            </div>
          </AdminCard>

          <AdminCard padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2">
              <X className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-serif font-light text-red-600">
                {statistics.notAttending}
              </span>
            </div>
            <div className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">
              Absents
            </div>
          </AdminCard>

          <AdminCard padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-burgundy-old" />
              <span className="text-2xl font-serif font-light text-burgundy-old">
                {statistics.totalGuests}
              </span>
            </div>
            <div className="text-xs text-charcoal/50 uppercase tracking-wide mt-1">
              Convives
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-charcoal/10">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all',
                  isActive
                    ? 'border-burgundy-old text-burgundy-old'
                    : 'border-transparent text-charcoal/50 hover:text-charcoal hover:border-charcoal/20'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'responses' && statistics && (
                  <AdminBadge variant={statistics.total > 0 ? 'primary' : 'default'} size="sm">
                    {statistics.total}
                  </AdminBadge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle subtitle="Personnalisez les options générales du formulaire RSVP">
                  Options générales
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardBody className="space-y-6">
                {/* Deadline */}
                <AdminInput
                  type="date"
                  label="Date limite de réponse"
                  value={config.deadline ? config.deadline.split('T')[0] : ''}
                  onChange={(e) =>
                    updateConfig({
                      deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                  leftIcon={<CalendarDays className="w-4 h-4" />}
                  helperText="Après cette date, le formulaire sera fermé"
                />

                {/* Allow plus one */}
                <AdminToggle
                  enabled={config.allowPlusOne}
                  onChange={(enabled) => updateConfig({ allowPlusOne: enabled })}
                  label="Autoriser les accompagnants"
                  description="Les invités peuvent indiquer des personnes supplémentaires"
                  size="sm"
                />

                {/* Ask dietary restrictions */}
                <AdminToggle
                  enabled={config.askDietaryRestrictions}
                  onChange={(enabled) => updateConfig({ askDietaryRestrictions: enabled })}
                  label="Demander les restrictions alimentaires"
                  description="Un champ pour les allergies et régimes spéciaux"
                  size="sm"
                />

                {/* Max guests */}
                <AdminInput
                  type="number"
                  label="Nombre maximum d'accompagnants"
                  value={config.maxGuestsPerResponse}
                  onChange={(e) =>
                    updateConfig({
                      maxGuestsPerResponse: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
                    })
                  }
                  min={1}
                  max={20}
                  helperText="Limite par réponse (1-20)"
                />
              </AdminCardBody>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle subtitle="Messages affichés aux invités">
                  Messages personnalisés
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardBody className="space-y-6">
                {/* Welcome message */}
                <AdminTextarea
                  label="Message d'accueil"
                  value={config.welcomeMessage || ''}
                  onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                  placeholder="Un message pour accueillir vos invités sur la page RSVP..."
                  rows={3}
                  maxLength={500}
                  showCount
                />

                {/* Thank you message */}
                <AdminTextarea
                  label="Message de remerciement"
                  value={config.thankYouMessage || ''}
                  onChange={(e) => updateConfig({ thankYouMessage: e.target.value })}
                  placeholder="Message affiché après la soumission du formulaire..."
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </AdminCardBody>
            </AdminCard>
          </div>
        )}

        {/* Questions tab */}
        {activeTab === 'questions' && (
          <AdminCard>
            <AdminCardHeader>
              <AdminCardTitle subtitle="Ajoutez des questions personnalisées pour recueillir des informations">
                Questions personnalisées
              </AdminCardTitle>
            </AdminCardHeader>
            <AdminCardBody>
              <RSVPQuestionBuilder
                weddingId={weddingId}
                questions={config.questions}
                onChange={handleQuestionsChange}
              />
            </AdminCardBody>
          </AdminCard>
        )}

        {/* Responses tab */}
        {activeTab === 'responses' && (
          <RSVPResponsesViewer
            weddingId={weddingId}
            demoMode={demoMode}
            questions={config.questions}
            onDeleteResponse={handleDeleteResponse}
          />
        )}
      </div>
    </div>
  );
}
