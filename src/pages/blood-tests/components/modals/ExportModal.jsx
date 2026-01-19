import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import markdownContent from '../../data/reports.md?raw';

export function ExportModal({ onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            Export Report Data
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 bg-muted">
          <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-card p-4 rounded-lg border text-foreground">
            {markdownContent}
          </pre>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-muted flex-row justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground self-center">Markdown format</span>
          <Button
            onClick={handleCopy}
            variant={copied ? 'default' : 'default'}
            className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
