import { useState } from 'react';
import {
  GripVertical,
  Trash2,
  Plus,
  Type,
  CircleDot,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AdminButton,
  AdminInput,
  AdminToggle,
  AdminSelect,
  AdminTextarea,
  AdminCard,
  cn,
} from '../ui';
import type {
  RSVPQuestion,
  RSVPQuestionOption,
  RSVPQuestionType,
} from '../../../lib/rsvp/types';
import {
  createTextQuestion,
  createSingleChoiceQuestion,
  createMultipleChoiceQuestion,
  createQuestionOption,
  hasOptions,
  RSVP_LIMITS,
} from '../../../lib/rsvp/types';

interface RSVPQuestionBuilderProps {
  weddingId: string;
  questions: RSVPQuestion[];
  onChange: (questions: RSVPQuestion[]) => void;
  maxQuestions?: number;
}

const questionTypeOptions = [
  { value: 'text', label: 'Champ texte libre', icon: Type },
  { value: 'single_choice', label: 'Choix unique', icon: CircleDot },
  { value: 'multiple_choice', label: 'Choix multiple', icon: CheckSquare },
];

export function RSVPQuestionBuilder({
  weddingId,
  questions,
  onChange,
  maxQuestions = RSVP_LIMITS.maxQuestionsPerWedding,
}: RSVPQuestionBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addQuestion = (type: RSVPQuestionType) => {
    if (questions.length >= maxQuestions) return;

    let newQuestion: RSVPQuestion;
    const order = questions.length;

    switch (type) {
      case 'text':
        newQuestion = createTextQuestion(weddingId, order);
        break;
      case 'single_choice':
        newQuestion = createSingleChoiceQuestion(weddingId, order);
        break;
      case 'multiple_choice':
        newQuestion = createMultipleChoiceQuestion(weddingId, order);
        break;
    }

    onChange([...questions, newQuestion]);
    setExpandedId(newQuestion.id);
  };

  const updateQuestion = (id: string, updates: Partial<RSVPQuestion>) => {
    onChange(
      questions.map((q) =>
        q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
      )
    );
  };

  const deleteQuestion = (id: string) => {
    onChange(
      questions
        .filter((q) => q.id !== id)
        .map((q, index) => ({ ...q, order: index }))
    );
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !hasOptions(question)) return;

    if (question.options.length >= RSVP_LIMITS.maxOptionsPerQuestion) return;

    const newOption = createQuestionOption(question.options.length + 1);
    updateQuestion(questionId, {
      options: [...question.options, newOption],
    });
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    updates: Partial<RSVPQuestionOption>
  ) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !hasOptions(question)) return;

    updateQuestion(questionId, {
      options: question.options.map((opt) =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const deleteOption = (questionId: string, optionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !hasOptions(question)) return;

    if (question.options.length <= 2) return; // Minimum 2 options

    updateQuestion(questionId, {
      options: question.options.filter((opt) => opt.id !== optionId),
    });
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, removed);

    // Update order
    onChange(newQuestions.map((q, i) => ({ ...q, order: i })));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getQuestionIcon = (type: RSVPQuestionType) => {
    const option = questionTypeOptions.find((o) => o.value === type);
    return option?.icon || Type;
  };

  return (
    <div className="space-y-4">
      {/* Question list */}
      <div className="space-y-3">
        {questions.map((question, index) => {
          const Icon = getQuestionIcon(question.type);
          const isExpanded = expandedId === question.id;

          return (
            <div
              key={question.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'border rounded-lg transition-all duration-200',
                isExpanded ? 'border-burgundy-old/30 shadow-sm' : 'border-charcoal/10',
                draggedIndex === index && 'opacity-50'
              )}
            >
              {/* Question header */}
              <div
                className={cn(
                  'flex items-center gap-3 p-4 cursor-pointer',
                  isExpanded && 'border-b border-charcoal/10'
                )}
                onClick={() => setExpandedId(isExpanded ? null : question.id)}
              >
                <div
                  className="cursor-grab active:cursor-grabbing text-charcoal/40 hover:text-charcoal/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="w-8 h-8 rounded-lg bg-burgundy-old/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-burgundy-old" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">
                    {question.label || 'Question sans titre'}
                  </p>
                  <p className="text-xs text-charcoal/50">
                    {questionTypeOptions.find((o) => o.value === question.type)?.label}
                    {question.required && ' • Obligatoire'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuestion(question.id);
                    }}
                    className="p-2 text-charcoal/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Supprimer la question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-charcoal/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-charcoal/40" />
                  )}
                </div>
              </div>

              {/* Question editor */}
              {isExpanded && (
                <div className="p-4 space-y-4 bg-charcoal/[0.02]">
                  {/* Label */}
                  <AdminInput
                    label="Intitulé de la question"
                    value={question.label}
                    onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                    placeholder="Ex: Avez-vous des allergies alimentaires ?"
                    maxLength={RSVP_LIMITS.maxLabelLength}
                    required
                  />

                  {/* Description */}
                  <AdminTextarea
                    label="Description (optionnel)"
                    value={question.description || ''}
                    onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                    placeholder="Informations complémentaires pour aider les invités..."
                    maxLength={RSVP_LIMITS.maxDescriptionLength}
                    rows={2}
                    showCount
                  />

                  {/* Required toggle */}
                  <AdminToggle
                    enabled={question.required}
                    onChange={(enabled) => updateQuestion(question.id, { required: enabled })}
                    label="Question obligatoire"
                    description="Les invités devront répondre à cette question"
                    size="sm"
                  />

                  {/* Type-specific fields */}
                  {question.type === 'text' && (
                    <div className="space-y-4 pt-4 border-t border-charcoal/10">
                      <AdminInput
                        label="Texte d'aide (placeholder)"
                        value={question.placeholder || ''}
                        onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                        placeholder="Ex: Décrivez vos restrictions..."
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <AdminInput
                          label="Longueur max"
                          type="number"
                          value={question.validation.maxLength}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              validation: {
                                ...question.validation,
                                maxLength: Math.min(
                                  parseInt(e.target.value) || RSVP_LIMITS.maxTextAnswerLength,
                                  RSVP_LIMITS.maxTextAnswerLength
                                ),
                              },
                            })
                          }
                          min={1}
                          max={RSVP_LIMITS.maxTextAnswerLength}
                        />

                        <AdminToggle
                          enabled={question.multiline || false}
                          onChange={(enabled) => updateQuestion(question.id, { multiline: enabled })}
                          label="Multiligne"
                          size="sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Options for choice questions */}
                  {hasOptions(question) && (
                    <div className="space-y-3 pt-4 border-t border-charcoal/10">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-charcoal">
                          Options de réponse
                        </label>
                        <span className="text-xs text-charcoal/50">
                          {question.options.length}/{RSVP_LIMITS.maxOptionsPerQuestion}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div key={option.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full border border-charcoal/20 flex items-center justify-center text-xs text-charcoal/50 shrink-0">
                              {optIndex + 1}
                            </div>
                            <input
                              type="text"
                              value={option.label}
                              onChange={(e) =>
                                updateOption(question.id, option.id, {
                                  label: e.target.value,
                                  value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                                })
                              }
                              className="flex-1 px-3 py-2 text-sm border border-charcoal/10 rounded-lg focus:border-burgundy-old focus:ring-2 focus:ring-burgundy-old/20 outline-none"
                              placeholder={`Option ${optIndex + 1}`}
                            />
                            <button
                              onClick={() => deleteOption(question.id, option.id)}
                              disabled={question.options.length <= 2}
                              className="p-2 text-charcoal/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Supprimer l'option"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {question.options.length < RSVP_LIMITS.maxOptionsPerQuestion && (
                        <button
                          onClick={() => addOption(question.id)}
                          className="flex items-center gap-2 text-sm text-burgundy-old hover:text-burgundy-old/80 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter une option
                        </button>
                      )}

                      {/* Display options for single choice */}
                      {question.type === 'single_choice' && (
                        <AdminSelect
                          label="Affichage"
                          value={question.displayAs || 'radio'}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              displayAs: e.target.value as 'radio' | 'dropdown',
                            })
                          }
                          options={[
                            { value: 'radio', label: 'Boutons radio' },
                            { value: 'dropdown', label: 'Liste déroulante' },
                          ]}
                        />
                      )}

                      {/* Selection limits for multiple choice */}
                      {question.type === 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-4">
                          <AdminInput
                            label="Min sélections"
                            type="number"
                            value={question.minSelections || ''}
                            onChange={(e) =>
                              updateQuestion(question.id, {
                                minSelections: parseInt(e.target.value) || undefined,
                              })
                            }
                            min={0}
                            max={question.options.length}
                            placeholder="Aucun"
                          />
                          <AdminInput
                            label="Max sélections"
                            type="number"
                            value={question.maxSelections || ''}
                            onChange={(e) =>
                              updateQuestion(question.id, {
                                maxSelections: parseInt(e.target.value) || undefined,
                              })
                            }
                            min={1}
                            max={question.options.length}
                            placeholder="Aucun"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <AdminCard className="text-center py-8">
          <p className="text-charcoal/50 mb-4">Aucune question personnalisée</p>
          <p className="text-sm text-charcoal/40">
            Ajoutez des questions pour recueillir des informations supplémentaires
          </p>
        </AdminCard>
      )}

      {/* Add question buttons */}
      {questions.length < maxQuestions && (
        <div className="flex flex-wrap gap-2">
          {questionTypeOptions.map(({ value, label, icon: Icon }) => (
            <AdminButton
              key={value}
              variant="outline"
              size="sm"
              leftIcon={<Icon className="w-4 h-4" />}
              onClick={() => addQuestion(value as RSVPQuestionType)}
            >
              {label}
            </AdminButton>
          ))}
        </div>
      )}

      {/* Limit warning */}
      {questions.length >= maxQuestions && (
        <p className="text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
          Vous avez atteint le nombre maximum de questions ({maxQuestions})
        </p>
      )}
    </div>
  );
}
