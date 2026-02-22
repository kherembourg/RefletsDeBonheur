import { ChevronLeft, Palette, Type, Image, Sparkles } from 'lucide-react';
import type { WeddingCustomization } from '../../../lib/customization';
import { ColorPaletteEditor } from '../ColorPaletteEditor';
import { ContentEditor } from '../ContentEditor';
import { ImageManager } from '../ImageManager';
import { ThemeTabContent } from './ThemeTabContent';
import type { EditorTab } from './types';

interface EditorSidebarProps {
  activeTab: EditorTab;
  collapsed: boolean;
  customization: WeddingCustomization;
  uploadProgress: number | null;
  onTabChange: (tab: EditorTab) => void;
  onToggleCollapse: () => void;
  onThemeChange: (themeId: string) => void;
  onColorsChange: (palette: Record<string, string | undefined>) => void;
  onContentChange: (content: Record<string, string | undefined>) => void;
  onImagesChange: (images: Record<string, string | undefined>) => void;
  onUpload: (file: File, key: string) => Promise<string>;
}

const tabs = [
  { id: 'theme' as const, label: 'Thèmes', icon: Sparkles },
  { id: 'colors' as const, label: 'Couleurs', icon: Palette },
  { id: 'content' as const, label: 'Contenu', icon: Type },
  { id: 'images' as const, label: 'Images', icon: Image },
];

export function EditorSidebar({
  activeTab,
  collapsed,
  customization,
  uploadProgress,
  onTabChange,
  onToggleCollapse,
  onThemeChange,
  onColorsChange,
  onContentChange,
  onImagesChange,
  onUpload,
}: EditorSidebarProps) {
  return (
    <aside
      className={`bg-white border-r border-charcoal/10 flex flex-col transition-all duration-300 shadow-sm ${
        collapsed ? 'w-16' : 'w-[340px]'
      }`}
    >
      {/* Tab Navigation */}
      <nav className="flex border-b border-charcoal/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all relative ${
                isActive
                  ? 'text-burgundy'
                  : 'text-charcoal/50 hover:text-charcoal'
              }`}
            >
              <Icon className="w-5 h-5" />
              {!collapsed && (
                <span className="text-xs font-medium">{tab.label}</span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-burgundy rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {activeTab === 'theme' && (
              <ThemeTabContent
                customization={customization}
                onThemeChange={onThemeChange}
              />
            )}
            {activeTab === 'colors' && (
              <ColorPaletteEditor
                themeId={customization.themeId}
                customPalette={customization.customPalette}
                onChange={onColorsChange}
              />
            )}
            {activeTab === 'content' && (
              <ContentEditor
                customContent={customization.customContent}
                onChange={onContentChange}
              />
            )}
            {activeTab === 'images' && (
              <ImageManager
                customImages={customization.customImages}
                onChange={onImagesChange}
                onUpload={onUpload}
                uploadProgress={uploadProgress}
              />
            )}
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="p-3 border-t border-charcoal/10 text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5 transition-all flex items-center justify-center gap-2"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        {!collapsed && <span className="text-xs">Réduire</span>}
      </button>
    </aside>
  );
}
