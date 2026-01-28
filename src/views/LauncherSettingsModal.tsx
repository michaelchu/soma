import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const FONT_OPTIONS = [
  {
    id: 'line-seed',
    name: 'LINE Seed JP',
    family: '"LINE Seed JP", system-ui, sans-serif',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    family: '"Open Sans", system-ui, sans-serif',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: '"Montserrat", system-ui, sans-serif',
  },
  {
    id: 'anta',
    name: 'Anta',
    family: '"Anta", system-ui, sans-serif',
  },
  {
    id: 'rubik',
    name: 'Rubik',
    family: '"Rubik", system-ui, sans-serif',
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: '"Nunito", system-ui, sans-serif',
  },
  {
    id: 'raleway',
    name: 'Raleway',
    family: '"Raleway", system-ui, sans-serif',
  },
  {
    id: 'exo',
    name: 'Exo',
    family: '"Exo", system-ui, sans-serif',
  },
] as const;

type FontId = (typeof FONT_OPTIONS)[number]['id'];

const FONT_STORAGE_KEY = 'soma-font';
const FONT_SIZE_STORAGE_KEY = 'soma-font-size';

const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

export function getStoredFont(): FontId {
  const stored = localStorage.getItem(FONT_STORAGE_KEY);
  if (stored && FONT_OPTIONS.some((f) => f.id === stored)) {
    return stored as FontId;
  }
  return 'line-seed';
}

export function getStoredFontSize(): number {
  const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  if (stored) {
    const size = parseInt(stored, 10);
    if (!isNaN(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
      return size;
    }
  }
  return DEFAULT_FONT_SIZE;
}

export function applyFont(fontId: FontId) {
  const font = FONT_OPTIONS.find((f) => f.id === fontId);
  if (font) {
    document.documentElement.style.setProperty('--font-sans', font.family);
    document.body.style.fontFamily = font.family;
    localStorage.setItem(FONT_STORAGE_KEY, fontId);
  }
}

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
  localStorage.setItem(FONT_SIZE_STORAGE_KEY, size.toString());
}

export function LauncherSettingsModal({
  open,
  onOpenChange,
  currentFont,
  onFontChange,
  currentFontSize,
  onFontSizeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: FontId;
  onFontChange: (fontId: FontId) => void;
  currentFontSize: number;
  onFontSizeChange: (size: number) => void;
}) {
  const handleFontSelect = (fontId: FontId) => {
    onFontChange(fontId);
    applyFont(fontId);
  };

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    onFontSizeChange(size);
    applyFontSize(size);
  };

  const currentFontFamily =
    FONT_OPTIONS.find((f) => f.id === currentFont)?.family || FONT_OPTIONS[0].family;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-md sm:h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Font Selection */}
          <section>
            <h2 className="text-sm font-medium mb-2">Font</h2>
            <Select value={currentFont} onValueChange={handleFontSelect}>
              <SelectTrigger className="w-full" style={{ fontFamily: currentFontFamily }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Font Size Slider */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium">Font Size</h2>
              <span className="text-sm text-muted-foreground">{currentFontSize}px</span>
            </div>
            <Slider
              value={[currentFontSize]}
              onValueChange={handleFontSizeChange}
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{MIN_FONT_SIZE}px</span>
              <span>{MAX_FONT_SIZE}px</span>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
