import { useState } from 'react';
import { User, Calendar } from 'lucide-react';
import { AdminInput } from '../../admin/ui/AdminInput';
import { AdminButton } from '../../admin/ui/AdminButton';

export interface WeddingData {
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
}

interface WeddingStepProps {
  data: WeddingData;
  onChange: (data: WeddingData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WeddingStep({ data, onChange, onNext, onBack }: WeddingStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.partner1Name.trim()) {
      newErrors.partner1Name = 'First partner name is required';
    }

    if (!data.partner2Name.trim()) {
      newErrors.partner2Name = 'Second partner name is required';
    }

    // Wedding date is optional, but if provided, check it's valid
    if (data.weddingDate) {
      const date = new Date(data.weddingDate);
      if (isNaN(date.getTime())) {
        newErrors.weddingDate = 'Please enter a valid date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  // Get today's date for the date input min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-charcoal mb-2">Tell Us About Your Wedding</h2>
        <p className="text-charcoal/60 text-sm">Enter the names of the happy couple.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <AdminInput
          label="Partner 1"
          type="text"
          placeholder="e.g., Marie"
          value={data.partner1Name}
          onChange={(e) => onChange({ ...data, partner1Name: e.target.value })}
          error={errors.partner1Name}
          required
          leftIcon={<User className="w-5 h-5" />}
          size="lg"
        />

        <AdminInput
          label="Partner 2"
          type="text"
          placeholder="e.g., Thomas"
          value={data.partner2Name}
          onChange={(e) => onChange({ ...data, partner2Name: e.target.value })}
          error={errors.partner2Name}
          required
          leftIcon={<User className="w-5 h-5" />}
          size="lg"
        />
      </div>

      <AdminInput
        label="Wedding Date"
        type="date"
        value={data.weddingDate}
        onChange={(e) => onChange({ ...data, weddingDate: e.target.value })}
        error={errors.weddingDate}
        helperText="Optional - you can add this later"
        leftIcon={<Calendar className="w-5 h-5" />}
        size="lg"
        min={today}
      />

      <div className="flex gap-4 pt-4">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
        >
          Back
        </AdminButton>
        <AdminButton type="submit" variant="primary" size="lg" className="flex-1">
          Continue
        </AdminButton>
      </div>
    </form>
  );
}
