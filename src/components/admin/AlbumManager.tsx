import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { DataService, type Album } from '../../lib/services/dataService';

interface AlbumManagerProps {
  dataService: DataService;
  onAlbumSelect?: (albumId: string) => void;
}

export function AlbumManager({ dataService, onAlbumSelect }: AlbumManagerProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D4AF37'
  });

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      const data = await dataService.getAlbums();
      setAlbums(data);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Le nom de l\'album est requis');
      return;
    }

    setSaving(true);
    try {
      await dataService.createAlbum({
        name: formData.name,
        description: formData.description,
        color: formData.color
      });
      await loadAlbums();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create album:', error);
      alert('Erreur lors de la création de l\'album');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedAlbum) return;

    if (!formData.name.trim()) {
      alert('Le nom de l\'album est requis');
      return;
    }

    setSaving(true);
    try {
      await dataService.updateAlbum(selectedAlbum.id, {
        name: formData.name,
        description: formData.description,
        color: formData.color
      });
      await loadAlbums();
      setShowEditModal(false);
      setSelectedAlbum(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update album:', error);
      alert('Erreur lors de la mise à jour de l\'album');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (albumId: string, albumName: string) => {
    if (!confirm(`Supprimer l'album "${albumName}" ? Les photos resteront dans la galerie.`)) {
      return;
    }

    try {
      await dataService.deleteAlbum(albumId);
      await loadAlbums();
    } catch (error) {
      console.error('Failed to delete album:', error);
      alert('Erreur lors de la suppression de l\'album');
    }
  };

  const openEditModal = (album: Album) => {
    setSelectedAlbum(album);
    setFormData({
      name: album.name,
      description: album.description || '',
      color: album.color || '#D4AF37'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#D4AF37'
    });
  };

  const colorOptions = [
    { value: '#D4AF37', label: 'Or' },
    { value: '#8B7355', label: 'Taupe' },
    { value: '#C0C0C0', label: 'Argent' },
    { value: '#FFB6C1', label: 'Rose' },
    { value: '#87CEEB', label: 'Bleu' },
    { value: '#98FB98', label: 'Vert' },
    { value: '#DDA0DD', label: 'Violet' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 animate-spin">
          <Loader2 className="w-full h-full text-burgundy-old" />
        </div>
        <span className="ml-2 text-charcoal/60 font-light">Chargement des albums...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen size={24} className="text-burgundy-old" />
          <h2 className="text-xl font-bold font-serif text-deep-charcoal dark:text-ivory">
            Albums
          </h2>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Nouvel Album</span>
        </button>
      </div>

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-12 text-warm-taupe dark:text-silver-mist">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p>Aucun album créé</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-burgundy-old hover:underline"
          >
            Créer votre premier album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {albums.map(album => (
            <div
              key={album.id}
              className="bg-pearl-white dark:bg-deep-charcoal/30 rounded-lg border border-silver-mist/30 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color Bar */}
              <div
                className="h-2"
                style={{ backgroundColor: album.color || '#D4AF37' }}
              />

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-deep-charcoal dark:text-ivory truncate">
                      {album.name}
                    </h3>
                    {album.description && (
                      <p className="text-sm text-warm-taupe dark:text-silver-mist truncate">
                        {album.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(album)}
                      className="p-1.5 hover:bg-silver-mist/30 rounded-sm transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} className="text-burgundy-old" />
                    </button>
                    <button
                      onClick={() => handleDelete(album.id, album.name)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-sm transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 text-sm text-warm-taupe dark:text-silver-mist">
                  <ImageIcon size={14} />
                  <span>
                    {album.photoCount || 0} photo{(album.photoCount || 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* View Album Button */}
                {onAlbumSelect && (
                  <button
                    onClick={() => onAlbumSelect(album.id)}
                    className="mt-3 w-full text-sm text-center text-burgundy-old hover:underline"
                  >
                    Voir l'album →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-deep-charcoal/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-ivory dark:bg-deep-charcoal max-w-md w-full rounded-xl shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-silver-mist/30">
              <h3 className="text-xl font-bold text-deep-charcoal dark:text-ivory">
                Créer un Album
              </h3>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Nom de l'album *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cérémonie, Réception..."
                  className="w-full px-4 py-2 border border-silver-mist rounded-lg focus:outline-hidden focus:ring-2 focus:ring-burgundy-old dark:bg-deep-charcoal/50 dark:text-ivory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez cet album..."
                  rows={3}
                  className="w-full px-4 py-2 border border-silver-mist rounded-lg focus:outline-hidden focus:ring-2 focus:ring-burgundy-old dark:bg-deep-charcoal/50 dark:text-ivory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Couleur
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        formData.color === option.value
                          ? 'border-deep-charcoal dark:border-ivory scale-110'
                          : 'border-silver-mist/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: option.value }}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-silver-mist/30 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 text-warm-taupe dark:text-silver-mist hover:bg-silver-mist/20 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAlbum && (
        <div className="fixed inset-0 bg-deep-charcoal/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-ivory dark:bg-deep-charcoal max-w-md w-full rounded-xl shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-silver-mist/30">
              <h3 className="text-xl font-bold text-deep-charcoal dark:text-ivory">
                Modifier l'Album
              </h3>
            </div>

            {/* Form (same as create) */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Nom de l'album *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cérémonie, Réception..."
                  className="w-full px-4 py-2 border border-silver-mist rounded-lg focus:outline-hidden focus:ring-2 focus:ring-burgundy-old dark:bg-deep-charcoal/50 dark:text-ivory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez cet album..."
                  rows={3}
                  className="w-full px-4 py-2 border border-silver-mist rounded-lg focus:outline-hidden focus:ring-2 focus:ring-burgundy-old dark:bg-deep-charcoal/50 dark:text-ivory"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-charcoal dark:text-ivory mb-2">
                  Couleur
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        formData.color === option.value
                          ? 'border-deep-charcoal dark:border-ivory scale-110'
                          : 'border-silver-mist/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: option.value }}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-silver-mist/30 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAlbum(null);
                  resetForm();
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 text-warm-taupe dark:text-silver-mist hover:bg-silver-mist/20 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
