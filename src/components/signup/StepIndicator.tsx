import { Check } from 'lucide-react';
import { cn } from '../../styles/admin-theme';

export interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal */}
      <div className="hidden sm:flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                    isCompleted && 'bg-burgundy-old text-white',
                    isCurrent && 'bg-burgundy-old text-white ring-4 ring-burgundy-old/20',
                    !isCompleted && !isCurrent && 'bg-charcoal/10 text-charcoal/40'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium whitespace-nowrap',
                    isCurrent ? 'text-burgundy-old' : 'text-charcoal/50'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-16 lg:w-24 h-0.5 mx-2 transition-all duration-300',
                    isCompleted ? 'bg-burgundy-old' : 'bg-charcoal/10'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-charcoal">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm text-burgundy-old font-medium">
            {steps.find(s => s.id === currentStep)?.label}
          </span>
        </div>
        <div className="h-2 bg-charcoal/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-burgundy-old rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
