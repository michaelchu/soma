import { useState } from 'react';
import { FileText, Copy, Check, Download } from 'lucide-react';
import { showError } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExportModalProps {
  onClose: () => void;
  title: string;
  generateMarkdown: () => string;
  generateCSV: () => string;
  downloadFilename: string;
}

/**
 * Shared export modal component for exporting data in markdown or CSV format
 */
export function ExportModal({
  onClose,
  title,
  generateMarkdown,
  generateCSV,
  downloadFilename,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState('markdown');

  const content = format === 'markdown' ? generateMarkdown() : generateCSV();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : 'csv';
    const mimeType = format === 'markdown' ? 'text/markdown' : 'text/csv';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadFilename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-3xl sm:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} className="text-muted-foreground" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 flex gap-2">
          <Button
            variant={format === 'markdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('markdown')}
          >
            Markdown
          </Button>
          <Button
            variant={format === 'csv' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFormat('csv')}
          >
            CSV
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4 bg-muted">
          <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-card p-4 rounded-lg border text-foreground">
            {content}
          </pre>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-muted flex-row justify-end sm:justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download size={16} />
              Download
            </Button>
            <Button
              onClick={handleCopy}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
