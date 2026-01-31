import { EyeOff, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IgnoreMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricName: string;
  isIgnored: boolean;
  onConfirm: () => void;
}

export function IgnoreMetricDialog({
  open,
  onOpenChange,
  metricName,
  isIgnored,
  onConfirm,
}: IgnoreMetricDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIgnored ? (
              <>
                <Eye className="h-5 w-5 text-primary" />
                Restore Metric
              </>
            ) : (
              <>
                <EyeOff className="h-5 w-5 text-muted-foreground" />
                Hide Metric
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isIgnored ? (
              <>
                Are you sure you want to restore <strong>{metricName}</strong>? It will appear again
                in the All and Abnormal tabs.
              </>
            ) : (
              <>
                Are you sure you want to hide <strong>{metricName}</strong>? It will only appear in
                the Ignored tab.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>{isIgnored ? 'Restore' : 'Hide'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
