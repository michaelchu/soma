import type { LucideIcon } from 'lucide-react';

export interface TabDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabNavProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Bottom navigation component for mobile tab navigation
 * Reusable across different pages with configurable tabs
 */
export function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
