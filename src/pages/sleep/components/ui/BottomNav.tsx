import { List, BarChart3, CalendarDays } from 'lucide-react';
import { TabNav, type TabDefinition } from '@/components/shared/TabNav';

const tabs: TabDefinition[] = [
  { id: 'readings', label: 'Entries', icon: List },
  { id: 'details', label: 'Details', icon: CalendarDays },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return <TabNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
