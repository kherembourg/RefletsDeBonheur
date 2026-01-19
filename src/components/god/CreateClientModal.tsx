/**
 * Create Client Modal
 * Form to create new wedding clients
 */

import { useState, type FormEvent } from 'react';
import { X, User, Mail, Calendar, Link, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient, type Client } from '../../lib/auth/godAuth';

interface CreateClientModalProps {
  onClose: () => void;
  onCreated: (client: Client) => void;
}

export function CreateClientModal({ onClose, onCreated }: CreateClientModalProps) {
  const [formData, setFormData] = useState({
    wedding_name: '',
    couple_names: '',
    wedding_date: '',
    wedding_slug: '',
    username: '',
    password: '',
    email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate slug from wedding name
    if (name === 'wedding_name') {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, wedding_slug: slug }));
    }

    // Auto-generate username from couple names
    if (name === 'couple_names') {
      const username = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/, '');
      setFormData(prev => ({ ...prev, username: prev.username || username }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await createClient({
        wedding_name: formData.wedding_name,
        couple_names: formData.couple_names,
        wedding_date: formData.wedding_date || undefined,
        wedding_slug: formData.wedding_slug,
        username: formData.username || formData.email,
        password: formData.password,
        email: formData.email,
      });

      if (result.success && result.client) {
        onCreated(result.client);
      } else {
        setError(result.error || 'Failed to create client');
      }
    } catch (err) {
      console.error('Create client error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Nouveau Client</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Wedding Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Informations du mariage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wedding Name */}
                <div>
                  <label htmlFor="wedding_name" className="block text-sm font-medium text-gray-300 mb-2">
                    Nom du mariage *
                  </label>
                  <input
                    id="wedding_name"
                    name="wedding_name"
                    type="text"
                    placeholder="Mariage Marie & Thomas"
                    value={formData.wedding_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Couple Names */}
                <div>
                  <label htmlFor="couple_names" className="block text-sm font-medium text-gray-300 mb-2">
                    Noms des mariés *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      id="couple_names"
                      name="couple_names"
                      type="text"
                      placeholder="Marie & Thomas"
                      value={formData.couple_names}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Wedding Date */}
                <div>
                  <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-300 mb-2">
                    Date du mariage
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      id="wedding_date"
                      name="wedding_date"
                      type="date"
                      value={formData.wedding_date}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Wedding Slug */}
                <div>
                  <label htmlFor="wedding_slug" className="block text-sm font-medium text-gray-300 mb-2">
                    URL du site *
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      id="wedding_slug"
                      name="wedding_slug"
                      type="text"
                      placeholder="marie-thomas"
                      value={formData.wedding_slug}
                      onChange={handleChange}
                      required
                      pattern="[a-z0-9-]+"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    reflets-bonheur.fr/{formData.wedding_slug || 'marie-thomas'}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Compte client
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="marie@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    Identifiant (optionnel)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="marie.thomas"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Mot de passe *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mot de passe sécurisé"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="w-full pl-10 pr-12 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600 transition-colors whitespace-nowrap"
                    >
                      Générer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-amber-200">
                  <p className="font-medium mb-1">Informations importantes</p>
                  <ul className="text-amber-300/80 space-y-1">
                    <li>• Les codes d'accès invité et admin seront générés automatiquement</li>
                    <li>• L'abonnement sera actif pour 2 ans à partir d'aujourd'hui</li>
                    <li>• Le client recevra ses identifiants par email</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Création...</span>
              </>
            ) : (
              'Créer le client'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
