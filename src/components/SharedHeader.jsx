import { Button } from '@/components/ui/button';
import { Grid3X3, MoreVertical } from 'lucide-react';

export default function SharedHeader({ appName, onBack }) {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b bg-background">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <Grid3X3 className="h-4 w-4" />
        <span className="hidden sm:inline">Apps</span>
      </Button>

      <h1 className="text-sm font-medium absolute left-1/2 transform -translate-x-1/2">
        {appName}
      </h1>

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </header>
  );
}
