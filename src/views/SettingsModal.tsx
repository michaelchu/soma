import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { secureGetItem, secureSetItem } from '@/lib/secureStorage';
import * as googleDrive from '@/lib/googleDrive';

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

const DEFAULT_FONT_SIZE = 18;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

export function getStoredFont(): FontId {
  const stored = secureGetItem<FontId>(FONT_STORAGE_KEY);
  if (stored && FONT_OPTIONS.some((f) => f.id === stored)) {
    return stored;
  }
  return 'exo';
}

export function getStoredFontSize(): number {
  const stored = secureGetItem<number>(FONT_SIZE_STORAGE_KEY);
  if (stored && !isNaN(stored) && stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE) {
    return stored;
  }
  return DEFAULT_FONT_SIZE;
}

export function applyFont(fontId: FontId) {
  const font = FONT_OPTIONS.find((f) => f.id === fontId);
  if (font) {
    document.documentElement.style.setProperty('--font-sans', font.family);
    document.body.style.fontFamily = font.family;
    secureSetItem(FONT_STORAGE_KEY, fontId);
  }
}

export function applyFontSize(size: number) {
  document.documentElement.style.fontSize = `${size}px`;
  secureSetItem(FONT_SIZE_STORAGE_KEY, size);
}

export function SettingsModal({
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

  // Google Drive backup state
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const driveConfigured = googleDrive.isConfigured();

  const loadBackupInfo = useCallback(async () => {
    if (!driveConfigured) return;
    try {
      const info = await googleDrive.getBackupInfo();
      if (info) {
        setLastBackup(new Date(info.modifiedTime).toLocaleString());
      }
    } catch {
      // Token not available yet, that's fine
    }
  }, [driveConfigured]);

  useEffect(() => {
    if (open && driveConfigured) {
      loadBackupInfo();
    }
  }, [open, driveConfigured, loadBackupInfo]);

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupStatus('');
    try {
      const result = await googleDrive.backup();
      setLastBackup(new Date(result.modifiedTime).toLocaleString());
      setBackupStatus('Backup complete');
    } catch (err) {
      setBackupStatus(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) {
      setConfirmRestore(true);
      return;
    }
    setBackupLoading(true);
    setBackupStatus('');
    setConfirmRestore(false);
    try {
      await googleDrive.restore();
      setBackupStatus('Restore complete. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setBackupStatus(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackupLoading(false);
    }
  };

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

          {/* Google Drive Backup */}
          <section>
            <h2 className="text-sm font-medium mb-2">Google Drive Backup</h2>
            {!driveConfigured ? (
              <p className="text-xs text-muted-foreground">
                Set VITE_GOOGLE_CLIENT_ID in .env to enable backup.
              </p>
            ) : (
              <div className="space-y-3">
                {lastBackup && (
                  <p className="text-xs text-muted-foreground">Last backup: {lastBackup}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackup}
                    disabled={backupLoading}
                    className="flex-1"
                  >
                    {backupLoading ? 'Working...' : 'Backup Now'}
                  </Button>
                  <Button
                    variant={confirmRestore ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={handleRestore}
                    disabled={backupLoading}
                    className="flex-1"
                  >
                    {confirmRestore ? 'Confirm Restore' : 'Restore'}
                  </Button>
                </div>
                {confirmRestore && (
                  <p className="text-xs text-destructive">
                    This will replace all local data with the backup. Tap again to confirm.
                  </p>
                )}
                {backupStatus && (
                  <p
                    className={`text-xs ${backupStatus.includes('failed') ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {backupStatus}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
