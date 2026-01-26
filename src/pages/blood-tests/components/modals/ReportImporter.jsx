import { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { useReports } from '../../hooks/useReports';

function parseReference(refString) {
  if (!refString) return {};
  const rangeMatch = refString.match(/^([\d.]+)-([\d.]+)$/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }
  const ltMatch = refString.match(/^<([\d.]+)$/);
  if (ltMatch) {
    return { max: parseFloat(ltMatch[1]) };
  }
  const gtMatch = refString.match(/^>([\d.]+)$/);
  if (gtMatch) {
    return { min: parseFloat(gtMatch[1]) };
  }
  return { raw: refString };
}

export function ReportImporter({ onClose }) {
  const { addReport } = useReports();
  const [reportDate, setReportDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [saving, setSaving] = useState(false);

  const addMetric = () => {
    setMetrics([
      ...metrics,
      {
        key: '',
        value: '',
        reference: '',
        unit: '',
      },
    ]);
  };

  const removeMetric = (index) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index, field, value) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-populate reference and unit from constants if key is selected
    if (field === 'key' && value && REFERENCE_RANGES[value]) {
      const ref = REFERENCE_RANGES[value];
      const refString =
        ref.min !== null && ref.max !== null
          ? `${ref.min}-${ref.max}`
          : ref.min !== null
            ? `>${ref.min}`
            : ref.max !== null
              ? `<${ref.max}`
              : '';
      updated[index].reference = refString;
      updated[index].unit = ref.unit || '';
    }

    setMetrics(updated);
  };

  const handleSave = async () => {
    setSaving(true);

    // Build metrics object for database
    const metricsObj = {};
    for (const metric of metrics) {
      if (metric.key && metric.value) {
        metricsObj[metric.key] = {
          value: parseFloat(metric.value),
          unit: metric.unit || '',
          reference: parseReference(metric.reference),
        };
      }
    }

    const report = {
      date: reportDate,
      orderNumber: orderNumber || null,
      orderedBy: orderedBy || null,
      metrics: metricsObj,
    };

    const { error: saveError } = await addReport(report);

    setSaving(false);

    if (saveError) {
      showError(saveError.message || 'Failed to save report');
      return;
    }

    showSuccess('Report saved');
    onClose();
  };

  const availableMetrics = Object.entries(REFERENCE_RANGES).map(([key, ref]) => ({
    key,
    name: ref.name,
    category: ref.category,
  }));

  const canSave = reportDate && metrics.some((m) => m.key && m.value);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-3xl sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Add New Report</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Report Metadata */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Report Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orderedBy">Ordered By</Label>
                  <Input
                    id="orderedBy"
                    type="text"
                    value={orderedBy}
                    onChange={(e) => setOrderedBy(e.target.value)}
                    placeholder="Dr. Name"
                  />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Metrics ({metrics.length})</h3>
                <Button onClick={addMetric} size="sm">
                  <Plus size={16} />
                  Add Metric
                </Button>
              </div>

              {metrics.length === 0 ? (
                <div className="bg-muted rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">
                    No metrics added yet. Click &quot;Add Metric&quot; to start.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.map((metric, index) => (
                    <div key={index} className="bg-card border border-border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2 space-y-1.5">
                          <Label>Metric *</Label>
                          <Select
                            value={metric.key}
                            onValueChange={(value) => updateMetric(index, 'key', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select metric..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMetrics.map((m) => (
                                <SelectItem key={m.key} value={m.key}>
                                  {m.name} ({m.category})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Value *</Label>
                          <Input
                            type="number"
                            step="any"
                            value={metric.value}
                            onChange={(e) => updateMetric(index, 'value', e.target.value)}
                            placeholder="123.4"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Reference</Label>
                          <Input
                            type="text"
                            value={metric.reference}
                            onChange={(e) => updateMetric(index, 'reference', e.target.value)}
                            placeholder="10-100 or <50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            <Label>Unit</Label>
                            <Input
                              type="text"
                              value={metric.unit}
                              onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                              placeholder="g/L"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMetric(index)}
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-muted flex-row justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="min-w-[100px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="min-w-[100px]">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
