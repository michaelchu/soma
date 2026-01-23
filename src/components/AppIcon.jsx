import { cn } from '@/lib/utils';

export default function AppIcon({ app, onClick }) {
  return (
    <button
      onClick={() => onClick(app)}
      className="flex flex-col items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-2"
    >
      <div
        className={cn(
          'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl',
          'bg-secondary border border-border',
          'transition-all duration-200',
          'group-hover:scale-105 group-hover:shadow-lg',
          'group-active:scale-95'
        )}
      >
        {app.icon}
      </div>
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors text-center max-w-[80px]">
        {app.name}
      </span>
    </button>
  );
}
