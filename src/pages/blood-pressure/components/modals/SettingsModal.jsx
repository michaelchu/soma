import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/lib/SettingsContext';
import { BP_GUIDELINES, BP_CATEGORY_INFO } from '../../constants/bpGuidelines';

function GuidelineOption({ guidelineKey, guideline, isSelected, onSelect }) {
  const categories = guideline.categories.map((cat) => BP_CATEGORY_INFO[cat]);

  return (
    <button
      onClick={() => onSelect(guidelineKey)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{guideline.name}</span>
            {isSelected && <Check className="h-4 w-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{guideline.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {categories.map((cat) => (
              <span
                key={cat.key}
                className={`text-xs px-2 py-0.5 rounded-full border ${cat.bgClass} ${cat.textClass} ${cat.borderClass}`}
              >
                {cat.shortLabel || cat.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function ThresholdTable({ guideline }) {
  const { thresholds, categories } = guideline;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium">Category</th>
            <th className="text-left py-2 px-4 font-medium">Systolic</th>
            <th className="text-left py-2 pl-4 font-medium">Diastolic</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const threshold = thresholds[cat];
            const info = BP_CATEGORY_INFO[cat];
            const sysMin = threshold.systolic?.min;
            const sysMax = threshold.systolic?.max;
            const diaMin = threshold.diastolic?.min;
            const diaMax = threshold.diastolic?.max;

            const formatRange = (min, max) => {
              if (min !== undefined && max !== undefined) return `${min}-${max}`;
              if (min !== undefined) return `≥${min}`;
              if (max !== undefined) return `<${max + 1}`;
              return '—';
            };

            return (
              <tr key={cat} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${info.bgClass} ${info.textClass} ${info.borderClass}`}
                  >
                    {info.shortLabel || info.label}
                  </span>
                </td>
                <td className="py-2 px-4 font-mono text-muted-foreground">
                  {formatRange(sysMin, sysMax)}
                </td>
                <td className="py-2 pl-4 font-mono text-muted-foreground">
                  {formatRange(diaMin, diaMax)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SettingsModal({ open, onOpenChange }) {
  const { settings, updateSetting } = useSettings();
  const selectedGuideline = BP_GUIDELINES[settings.bpGuideline];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-2xl sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-1">Blood Pressure Classification</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which medical guideline to use for categorizing your blood pressure readings.
              </p>
              <div className="space-y-3">
                {Object.entries(BP_GUIDELINES).map(([key, guideline]) => (
                  <GuidelineOption
                    key={key}
                    guidelineKey={key}
                    guideline={guideline}
                    isSelected={settings.bpGuideline === key}
                    onSelect={(key) => updateSetting('bpGuideline', key)}
                  />
                ))}
              </div>
            </section>

            {selectedGuideline && (
              <section>
                <h2 className="text-lg font-semibold mb-1">{selectedGuideline.name} Thresholds</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Reference table for the selected classification system
                </p>
                <ThresholdTable guideline={selectedGuideline} />
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
