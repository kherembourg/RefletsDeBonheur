import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye,
  Save,
  Loader2,
  Search,
  Plus,
  Users,
  MessageSquare,
  Settings,
} from 'lucide-react';
import {
  AdminCard,
  AdminCardHeader,
  AdminCardTitle,
  AdminCardBody,
  AdminToggle,
  AdminInput,
  AdminTextarea,
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
  weddingSlug?: string;
  demoMode?: boolean;
}

type TabId = 'responses' | 'questions' | 'settings';

const tabs: { id: TabId; label: string }[] = [
  { id: 'responses', label: 'Guest Responses' },
  { id: 'questions', label: 'Form Builder' },
  { id: 'settings', label: 'Settings' },
];

const mobileUpdates = [
  { name: 'Sophie & Marc', meta: '2 guests • Chicken', status: 'GOING' },
  { name: 'Julien Dupont', meta: 'Not responded yet', status: 'PENDING' },
  { name: 'Emma Watson', meta: 'Regretfully declined', status: 'DECLINED' },
  { name: 'Alex & Sarah', meta: '2 guests • Fish', status: 'GOING' },
];

export function RSVPManager({ weddingId, weddingSlug, demoMode = false }: RSVPManagerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('questions');
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

  const totalInvited = statistics?.totalGuests ?? statistics?.total ?? 0;
  const confirmed = statistics?.attending ?? 0;
  const declined = statistics?.notAttending ?? 0;
  const noResponse = Math.max(0, totalInvited - confirmed - declined);
  const previewUrl = weddingSlug ? `/${weddingSlug}/rsvp` : '/rsvp';

  return (
    <div className="space-y-8">
      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-2xl text-charcoal">RSVP Management</h1>
            <p className="text-sm text-charcoal/50">Configure your questions and track responses.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={previewUrl}
              className="px-4 py-2 rounded-lg border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal hover:border-charcoal/30 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </a>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-4 py-2 rounded-lg bg-[#b08b8b] text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-charcoal/10 pb-2 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 transition-colors ${
                activeTab === tab.id ? 'text-charcoal border-b border-charcoal' : 'text-charcoal/50 hover:text-charcoal'
              }`}
            >
              {tab.label}
              {tab.id === 'responses' && statistics && (
                <AdminBadge variant={statistics.total > 0 ? 'primary' : 'default'} size="sm" className="ml-2">
                  {statistics.total}
                </AdminBadge>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-6">
            {activeTab === 'responses' && (
              <RSVPResponsesViewer
                weddingId={weddingId}
                demoMode={demoMode}
                questions={config.questions}
                onDeleteResponse={handleDeleteResponse}
              />
            )}

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

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle subtitle="Personnalisez les options générales du formulaire RSVP">
                      Options générales
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardBody className="space-y-6">
                    <AdminToggle
                      enabled={config.enabled}
                      onChange={handleToggleEnabled}
                      label="RSVP activé"
                      description={config.enabled ? 'Les invités peuvent répondre' : 'Le formulaire est désactivé'}
                      size="md"
                    />

                    <AdminToggle
                      enabled={config.allowPlusOne}
                      onChange={(enabled) => updateConfig({ allowPlusOne: enabled })}
                      label="Autoriser les accompagnants"
                      description="Les invités peuvent indiquer des personnes supplémentaires"
                      size="sm"
                    />

                    <AdminToggle
                      enabled={config.askDietaryRestrictions}
                      onChange={(enabled) => updateConfig({ askDietaryRestrictions: enabled })}
                      label="Demander les restrictions alimentaires"
                      description="Un champ pour les allergies et régimes spéciaux"
                      size="sm"
                    />

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
                    <AdminTextarea
                      label="Message d'accueil"
                      value={config.welcomeMessage || ''}
                      onChange={(e) => updateConfig({ welcomeMessage: e.target.value })}
                      placeholder="Un message pour accueillir vos invités sur la page RSVP..."
                      rows={3}
                      maxLength={500}
                      showCount
                    />

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
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-[#1f2433] text-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/60">RSVP Stats</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-semibold">{totalInvited}</span>
                    <span className="text-xs text-white/60">Total Invited</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70">Confirmed</span>
                    <span className="text-white/70">{confirmed}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${totalInvited ? (confirmed / totalInvited) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70">Declined</span>
                    <span className="text-white/70">{declined}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-rose-300" style={{ width: `${totalInvited ? (declined / totalInvited) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70">No Response</span>
                    <span className="text-white/70">{noResponse}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-white/40" style={{ width: `${totalInvited ? (noResponse / totalInvited) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-charcoal/10 shadow-sm p-5">
              <h3 className="font-serif text-lg text-charcoal mb-4">Quick Links</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal hover:border-charcoal/30 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Copy RSVP Link
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal hover:border-charcoal/30 transition-colors">
                  <Settings className="w-4 h-4" />
                  Export Responses (CSV)
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-charcoal/10 text-sm text-charcoal/70 hover:text-charcoal hover:border-charcoal/30 transition-colors">
                  <Users className="w-4 h-4" />
                  Email Reminders
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-charcoal/50">Wedding Admin</p>
              <h2 className="font-serif text-xl text-charcoal mt-1">RSVP Manager</h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#e7d7d7]" />
          </div>
          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guest name..."
              className="w-full pl-9 pr-4 py-2 rounded-full border border-charcoal/10 text-sm text-charcoal/70"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#b08b8b] text-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Confirmed</p>
              <p className="text-2xl font-semibold mt-2">
                {confirmed}
                <span className="text-xs text-white/70"> / {totalInvited}</span>
              </p>
            </div>
            <div className="rounded-2xl border border-charcoal/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40">Pending</p>
              <p className="text-2xl font-semibold mt-2 text-charcoal">{noResponse}</p>
              <p className="text-xs text-charcoal/40">guests</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-charcoal">Latest Updates</h3>
            <button className="text-xs text-charcoal/50">VIEW ALL</button>
          </div>
          <div className="space-y-3">
            {mobileUpdates.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl border border-charcoal/5">
                <div>
                  <p className="text-sm font-medium text-charcoal">{item.name}</p>
                  <p className="text-xs text-charcoal/40">{item.meta}</p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-semibold',
                    item.status === 'GOING' && 'bg-emerald-100 text-emerald-700',
                    item.status === 'DECLINED' && 'bg-rose-100 text-rose-600',
                    item.status === 'PENDING' && 'bg-slate-100 text-slate-500'
                  )}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="fixed bottom-6 right-6">
          <button className="w-12 h-12 rounded-full bg-[#b08b8b] text-white flex items-center justify-center shadow-lg">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-lg p-3 flex items-center justify-around text-[10px] text-charcoal/50">
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-charcoal/5 flex items-center justify-center">🏠</div>
            Home
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-charcoal/5 flex items-center justify-center">🖼️</div>
            Gallery
          </div>
          <div className="flex flex-col items-center gap-1 text-[#b08b8b]">
            <div className="w-6 h-6 rounded-full bg-[#b08b8b]/20 flex items-center justify-center">✉️</div>
            RSVP
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-charcoal/5 flex items-center justify-center">📖</div>
            Book
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-charcoal/5 flex items-center justify-center">⚙️</div>
            Settings
          </div>
        </div>
      </div>
    </div>
  );
}
