import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Check,
  X,
  HelpCircle,
  Users,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Filter,
} from 'lucide-react';
import {
  AdminButton,
  AdminInput,
  AdminCard,
  AdminBadge,
  AdminPagination,
  AdminEmptyState,
  AdminSelect,
  cn,
} from '../ui';
import type { RSVPResponse, RSVPQuestion } from '../../../lib/rsvp/types';
import { RSVPService } from '../../../lib/rsvp/rsvpService';

interface RSVPResponsesViewerProps {
  weddingId: string;
  demoMode?: boolean;
  questions: RSVPQuestion[];
  onDeleteResponse?: (responseId: string) => void;
}

const ITEMS_PER_PAGE = 10;

export function RSVPResponsesViewer({
  weddingId,
  demoMode = false,
  questions,
  onDeleteResponse,
}: RSVPResponsesViewerProps) {
  const [responses, setResponses] = useState<RSVPResponse[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const rsvpService = new RSVPService({ weddingId, demoMode });

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const { responses: data, total } = await rsvpService.getResponses({
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        attendance: attendanceFilter as 'yes' | 'no' | 'maybe' | undefined,
        search: searchQuery || undefined,
      });
      setResponses(data);
      setTotalResponses(total);
    } catch (error) {
      console.error('Failed to load responses:', error);
    } finally {
      setLoading(false);
    }
  }, [weddingId, demoMode, currentPage, attendanceFilter, searchQuery]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, attendanceFilter]);

  const handleDelete = async (responseId: string) => {
    try {
      await rsvpService.deleteResponse(responseId);
      onDeleteResponse?.(responseId);
      loadResponses();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete response:', error);
    }
  };

  const getAttendanceInfo = (attendance: string) => {
    switch (attendance) {
      case 'yes':
        return { label: 'Présent', variant: 'success' as const, icon: Check };
      case 'no':
        return { label: 'Absent', variant: 'error' as const, icon: X };
      case 'maybe':
        return { label: 'Incertain', variant: 'warning' as const, icon: HelpCircle };
      default:
        return { label: attendance, variant: 'default' as const, icon: HelpCircle };
    }
  };

  const getQuestionLabel = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    return question?.label || 'Question supprimée';
  };

  const formatAnswer = (questionId: string, value: string | string[]) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return Array.isArray(value) ? value.join(', ') : value;

    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
      const values = Array.isArray(value) ? value : [value];
      return values
        .map((v) => {
          const option = question.options.find((opt) => opt.value === v);
          return option?.label || v;
        })
        .join(', ');
    }

    return Array.isArray(value) ? value.join(', ') : value;
  };

  const exportToCSV = () => {
    // Build CSV content
    const headers = [
      'Nom',
      'Email',
      'Telephone',
      'Presence',
      'Accompagnants',
      'Message',
      'Date',
      ...questions.map((q) => q.label),
    ];

    const rows = responses.map((response) => {
      const guestNames = response.guests.map((g) => g.name).join('; ');
      const answers = questions.map((q) => {
        const answer = response.answers.find((a) => a.questionId === q.id);
        return answer ? formatAnswer(q.id, answer.value) : '';
      });

      return [
        response.respondentName,
        response.respondentEmail || '',
        response.respondentPhone || '',
        getAttendanceInfo(response.attendance).label,
        guestNames,
        response.message || '',
        new Date(response.createdAt).toLocaleDateString('fr-FR'),
        ...answers,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rsvp-responses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(totalResponses / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <AdminInput
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex gap-2">
          <AdminSelect
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
            options={[
              { value: '', label: 'Tous' },
              { value: 'yes', label: 'Présents' },
              { value: 'no', label: 'Absents' },
              { value: 'maybe', label: 'Incertains' },
            ]}
            className="w-32"
          />

          <AdminButton
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={exportToCSV}
            disabled={responses.length === 0}
          >
            Exporter
          </AdminButton>
        </div>
      </div>

      {/* Response list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-charcoal/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : responses.length === 0 ? (
        <AdminEmptyState
          icon={Users}
          title="Aucune réponse"
          description={
            searchQuery || attendanceFilter
              ? 'Aucune réponse ne correspond à vos critères'
              : 'Les réponses RSVP apparaîtront ici'
          }
        />
      ) : (
        <div className="space-y-3">
          {responses.map((response) => {
            const isExpanded = expandedId === response.id;
            const attendanceInfo = getAttendanceInfo(response.attendance);
            const AttendanceIcon = attendanceInfo.icon;

            return (
              <AdminCard
                key={response.id}
                padding="none"
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded && 'ring-1 ring-burgundy-old/20'
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    'flex items-center gap-4 p-4 cursor-pointer hover:bg-charcoal/[0.02]',
                    isExpanded && 'border-b border-charcoal/5'
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : response.id)}
                >
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-burgundy-old/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-burgundy-old" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-charcoal truncate">
                        {response.respondentName}
                      </span>
                      <AdminBadge variant={attendanceInfo.variant} size="sm">
                        <AttendanceIcon className="w-3 h-3 mr-1" />
                        {attendanceInfo.label}
                      </AdminBadge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-charcoal/50 mt-0.5">
                      {response.respondentEmail && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {response.respondentEmail}
                        </span>
                      )}
                      {response.guests.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          +{response.guests.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date and expand icon */}
                  <div className="flex items-center gap-2 text-charcoal/40">
                    <span className="text-xs hidden sm:block">
                      {new Date(response.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-4 bg-charcoal/[0.02] space-y-4">
                    {/* Contact info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-charcoal/40" />
                        <span>{response.respondentName}</span>
                      </div>
                      {response.respondentEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-charcoal/40" />
                          <a
                            href={`mailto:${response.respondentEmail}`}
                            className="text-burgundy-old hover:underline"
                          >
                            {response.respondentEmail}
                          </a>
                        </div>
                      )}
                      {response.respondentPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-charcoal/40" />
                          <a
                            href={`tel:${response.respondentPhone}`}
                            className="text-burgundy-old hover:underline"
                          >
                            {response.respondentPhone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Guests */}
                    {response.guests.length > 0 && (
                      <div className="pt-3 border-t border-charcoal/10">
                        <h4 className="text-sm font-medium text-charcoal mb-2">
                          Accompagnants ({response.guests.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {response.guests.map((guest, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm border border-charcoal/10"
                            >
                              <User className="w-3 h-3 text-charcoal/40" />
                              <span>{guest.name}</span>
                              {guest.dietaryRestrictions && (
                                <span className="text-charcoal/50 text-xs">
                                  ({guest.dietaryRestrictions})
                                </span>
                              )}
                              {guest.isChild && (
                                <AdminBadge variant="info" size="sm">
                                  Enfant
                                </AdminBadge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom question answers */}
                    {response.answers.length > 0 && (
                      <div className="pt-3 border-t border-charcoal/10">
                        <h4 className="text-sm font-medium text-charcoal mb-2">
                          Réponses aux questions
                        </h4>
                        <div className="space-y-2">
                          {response.answers.map((answer) => (
                            <div
                              key={answer.questionId}
                              className="bg-white rounded-lg p-3 border border-charcoal/10"
                            >
                              <p className="text-xs text-charcoal/50 mb-1">
                                {getQuestionLabel(answer.questionId)}
                              </p>
                              <p className="text-sm text-charcoal">
                                {formatAnswer(answer.questionId, answer.value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    {response.message && (
                      <div className="pt-3 border-t border-charcoal/10">
                        <h4 className="text-sm font-medium text-charcoal mb-2">Message</h4>
                        <p className="text-sm text-charcoal/70 italic bg-white rounded-lg p-3 border border-charcoal/10">
                          "{response.message}"
                        </p>
                      </div>
                    )}

                    {/* Metadata and actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-charcoal/10">
                      <div className="flex items-center gap-2 text-xs text-charcoal/40">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Reçu le{' '}
                          {new Date(response.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {deleteConfirmId === response.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-charcoal/50">Confirmer ?</span>
                          <AdminButton
                            variant="danger"
                            size="xs"
                            onClick={() => handleDelete(response.id)}
                          >
                            Oui
                          </AdminButton>
                          <AdminButton
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Non
                          </AdminButton>
                        </div>
                      ) : (
                        <AdminButton
                          variant="ghost"
                          size="xs"
                          leftIcon={<Trash2 className="w-3 h-3" />}
                          onClick={() => setDeleteConfirmId(response.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </AdminButton>
                      )}
                    </div>
                  </div>
                )}
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalResponses}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
