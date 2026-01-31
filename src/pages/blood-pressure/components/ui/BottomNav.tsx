import { TableProperties, BarChart3, LineChart } from 'lucide-react';
import { TabNav, type TabDefinition } from '@/components/shared/TabNav';

const tabs: TabDefinition[] = [
  { id: 'readings', label: 'Readings', icon: TableProperties },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'charts', label: 'Charts', icon: LineChart },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return <TabNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
