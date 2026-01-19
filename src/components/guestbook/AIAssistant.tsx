import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { mockAPI } from '../../lib/api';

interface AIAssistantProps {
  onGenerate: (message: string) => void;
}

type Relation = 'Amis' | 'Famille' | 'Collègue';
type Tone = 'Joyeux' | 'Émouvant' | 'Solennel' | 'Poétique';

export function AIAssistant({ onGenerate }: AIAssistantProps) {
  const [relation, setRelation] = useState<Relation>('Amis');
  const [tone, setTone] = useState<Tone>('Joyeux');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const message = await mockAPI.generateGuestbookMessage(relation, tone);
      onGenerate(message);
    } catch (error) {
      console.error('Message generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-3 bg-violet-50 rounded-lg border border-violet-100 text-sm space-y-3">
      <p className="text-violet-800 font-medium text-xs flex items-center gap-1">
        <Sparkles size={12} />
        Assistant de Vœux IA
      </p>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={relation}
          onChange={(e) => setRelation(e.target.value as Relation)}
          className="p-1.5 rounded border-violet-200 text-xs bg-ivory focus:ring-2 focus:ring-violet-400 focus:outline-none"
        >
          <option>Amis</option>
          <option>Famille</option>
          <option>Collègue</option>
        </select>

        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          className="p-1.5 rounded border-violet-200 text-xs bg-ivory focus:ring-2 focus:ring-violet-400 focus:outline-none"
        >
          <option>Joyeux</option>
          <option>Émouvant</option>
          <option>Solennel</option>
          <option>Poétique</option>
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full bg-violet-500 hover:bg-violet-600 text-ivory py-1.5 rounded text-xs font-medium flex justify-center items-center gap-1 transition-colors disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            <span>Génération...</span>
          </>
        ) : (
          <>
            <Sparkles size={12} />
            <span>Générer un message</span>
          </>
        )}
      </button>
    </div>
  );
}
