import * as React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FabButton = React.forwardRef(
  ({ className, icon: Icon = Plus, hideAbove = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          `${hideAbove}:hidden fixed bottom-20 right-4 z-50`,
          'h-14 w-14 rounded-full bg-primary text-primary-foreground',
          'shadow-lg flex items-center justify-center',
          'hover:bg-primary/90 transition-colors',
          className
        )}
        {...props}
      >
        <Icon className="h-6 w-6" />
      </button>
    );
  }
);

FabButton.displayName = 'FabButton';

export { FabButton };
