import { useState } from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { REFERENCE_RANGES } from '../../constants/referenceRanges';
import { CATEGORY_INFO } from '../../constants/categories';

export function ReferenceRangePanel({ onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedMetric, setExpandedMetric] = useState(null);

  const categories = Object.entries(CATEGORY_INFO);
  const metrics = Object.entries(REFERENCE_RANGES).filter(
    ([_key, ref]) => selectedCategory === 'all' || ref.category === selectedCategory
  );

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen size={18} className="text-muted-foreground" />
            Reference Ranges
            <span className="text-xs font-normal text-muted-foreground">
              ({metrics.length} metrics)
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Reference ranges for blood test metrics
          </DialogDescription>
        </DialogHeader>

        <div className="p-2 border-b bg-muted overflow-x-auto">
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map(([key, info]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(key)}
              >
                {info.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-center">Reference</TableHead>
                <TableHead className="text-center">Optimal</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map(([key, ref]) => (
                <>
                  <TableRow
                    key={key}
                    className={`cursor-pointer ${
                      expandedMetric === key ? 'bg-accent' : ''
                    }`}
                    onClick={() => setExpandedMetric(expandedMetric === key ? null : key)}
                  >
                    <TableCell className="font-medium">{ref.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-primary font-medium">
                        {ref.min !== null && ref.max !== null
                          ? `${ref.min}–${ref.max}`
                          : ref.min !== null
                            ? `≥${ref.min}`
                            : `≤${ref.max}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {ref.optimalRange ? (
                        <span className="font-mono text-green-600 dark:text-green-400 text-xs">
                          {ref.optimalRange.min}–{ref.optimalRange.max}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{ref.unit}</TableCell>
                    <TableCell>
                      <ChevronRight
                        size={14}
                        className={`text-muted-foreground transition-transform ${
                          expandedMetric === key ? 'rotate-90' : ''
                        }`}
                      />
                    </TableCell>
                  </TableRow>
                  {expandedMetric === key && (
                    <TableRow
                      key={`${key}-expanded`}
                      className="bg-muted/50 hover:bg-muted/50"
                    >
                      <TableCell colSpan={5} className="border-t border-border">
                        <div className="text-xs text-muted-foreground mb-1">{ref.description}</div>
                        <div className="text-xs text-muted-foreground bg-card p-2 rounded border-l-2 border-primary/50">
                          💡 {ref.clinicalNotes}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="p-2 border-t bg-muted text-center text-[11px] text-muted-foreground">
          Tap row for details
        </div>
      </DialogContent>
    </Dialog>
  );
}
