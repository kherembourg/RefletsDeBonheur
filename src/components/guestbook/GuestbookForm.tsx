import { useState, useEffect, type FormEvent } from 'react';
import { Send, Sparkles, PenLine } from 'lucide-react';
import { getUsername, setUsername as saveUsername } from '../../lib/auth';
import { AIAssistant } from './AIAssistant';

interface GuestbookFormProps {
  onSubmit: (author: string, message: string) => void;
}

export function GuestbookForm({ onSubmit }: GuestbookFormProps) {
  const [authorName, setAuthorName] = useState(getUsername());
  const [message, setMessage] = useState('');
  const [showAIHelp, setShowAIHelp] = useState(false);

  useEffect(() => {
    if (authorName) {
      saveUsername(authorName);
    }
  }, [authorName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !authorName.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    onSubmit(authorName.trim(), message.trim());
    setMessage('');
    setShowAIHelp(false);
  };

  const handleAIGenerate = (generatedMessage: string) => {
    setMessage(generatedMessage);
  };

  return (
    <div className="relative">
      {/* Decorative frame */}
      <div className="absolute inset-0 bg-linear-to-br from-burgundy-old/5 to-burgundy-old/10 -m-2 sm:-m-3"></div>

      {/* Form container */}
      <div className="relative bg-white shadow-lg p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 border border-burgundy-old/20 flex items-center justify-center">
            <PenLine className="text-burgundy-old" size={24} />
          </div>
          <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-light">
            Laissez un mot
          </h3>
          <p className="text-charcoal/50 text-sm mt-1 font-light">
            Partagez vos vœux avec les mariés
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Author Name */}
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-2 tracking-wide uppercase">
              Votre Prénom
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full px-4 py-3 border border-charcoal/10 focus:border-burgundy-old/50 focus:ring-1 focus:ring-burgundy-old/20 focus:outline-hidden bg-cream/30 transition-all duration-300 font-light"
              placeholder="Ex: Lucas"
              required
            />
          </div>

          {/* Message */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium text-charcoal/70 tracking-wide uppercase">
                Votre Message
              </label>
              <button
                type="button"
                onClick={() => setShowAIHelp(!showAIHelp)}
                className="text-xs flex items-center gap-1.5 text-violet-600 hover:text-violet-800 font-medium transition-colors"
              >
                <Sparkles size={12} />
                Besoin d'inspiration ?
              </button>
            </div>

            {/* AI Assistant */}
            {showAIHelp && (
              <div className="mb-3">
                <AIAssistant onGenerate={handleAIGenerate} />
              </div>
            )}

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-charcoal/10 focus:border-burgundy-old/50 focus:ring-1 focus:ring-burgundy-old/20 focus:outline-hidden resize-none bg-cream/30 transition-all duration-300 font-light"
              placeholder="Félicitations pour ce jour merveilleux..."
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-burgundy-old hover:bg-[#c92a38] text-white font-medium py-3.5 transition-all duration-300 flex items-center justify-center gap-2 tracking-wide text-sm uppercase"
          >
            <Send size={16} />
            Envoyer mon message
          </button>
        </form>

        {/* Decorative bottom element */}
        <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-charcoal/5">
          <div className="w-8 h-px bg-burgundy-old/20"></div>
          <span className="text-burgundy-old/30 text-sm">❦</span>
          <div className="w-8 h-px bg-burgundy-old/20"></div>
        </div>
      </div>
    </div>
  );
}
