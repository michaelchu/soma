import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const FONT_OPTIONS = [
  {
    id: 'line-seed',
    name: 'LINE Seed JP',
    family: '"LINE Seed JP", system-ui, sans-serif',
    description: 'Clean Japanese-inspired sans-serif',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    family: '"Open Sans", system-ui, sans-serif',
    description: 'Neutral and friendly sans-serif',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: '"Montserrat", system-ui, sans-serif',
    description: 'Modern geometric sans-serif',
  },
  {
    id: 'anta',
    name: 'Anta',
    family: '"Anta", system-ui, sans-serif',
    description: 'Sharp geometric display font',
  },
  {
    id: 'rubik',
    name: 'Rubik',
    family: '"Rubik", system-ui, sans-serif',
    description: 'Slightly rounded sans-serif',
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: '"Nunito", system-ui, sans-serif',
    description: 'Well-balanced rounded sans-serif',
  },
  {
    id: 'raleway',
    name: 'Raleway',
    family: '"Raleway", system-ui, sans-serif',
    description: 'Elegant thin-weight sans-serif',
  },
  {
    id: 'exo',
    name: 'Exo',
    family: '"Exo", system-ui, sans-serif',
    description: 'Futuristic geometric sans-serif',
  },
] as const;

type FontId = (typeof FONT_OPTIONS)[number]['id'];

function FontOption({
  font,
  isSelected,
  onSelect,
}: {
  font: (typeof FONT_OPTIONS)[number];
  isSelected: boolean;
  onSelect: (id: FontId) => void;
}) {
  return (
    <button
      onClick={() => onSelect(font.id)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ fontFamily: font.family }}>
              {font.name}
            </span>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{font.description}</p>
          <p className="text-lg mt-2 text-foreground" style={{ fontFamily: font.family }}>
            The quick brown fox jumps over the lazy dog
          </p>
        </div>
      </div>
    </button>
  );
}

const FONT_STORAGE_KEY = 'soma-font';

export function getStoredFont(): FontId {
  const stored = localStorage.getItem(FONT_STORAGE_KEY);
  if (stored && FONT_OPTIONS.some((f) => f.id === stored)) {
    return stored as FontId;
  }
  return 'line-seed';
}

export function applyFont(fontId: FontId) {
  const font = FONT_OPTIONS.find((f) => f.id === fontId);
  if (font) {
    document.documentElement.style.setProperty('--font-sans', font.family);
    document.body.style.fontFamily = font.family;
    localStorage.setItem(FONT_STORAGE_KEY, fontId);
  }
}

export function LauncherSettingsModal({
  open,
  onOpenChange,
  currentFont,
  onFontChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: FontId;
  onFontChange: (fontId: FontId) => void;
}) {
  const handleFontSelect = (fontId: FontId) => {
    onFontChange(fontId);
    applyFont(fontId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-1">Font</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the font for the app interface.
            </p>
            <div className="space-y-3">
              {FONT_OPTIONS.map((font) => (
                <FontOption
                  key={font.id}
                  font={font}
                  isSelected={currentFont === font.id}
                  onSelect={handleFontSelect}
                />
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
