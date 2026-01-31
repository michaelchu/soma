import { useState } from 'react';
import { LineChart, ScatterChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BPTimeChart } from '../charts/BPTimeChart';
import { BPScatterChart } from '../charts/BPScatterChart';
import { cn } from '@/lib/utils';

interface BPReading {
  datetime: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  notes?: string | null;
}

interface ChartsTabProps {
  readings: BPReading[];
  dateRange?: string;
}

export function ChartsTab({ readings, dateRange = 'all' }: ChartsTabProps) {
  const [showTrendline, setShowTrendline] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [showMAP, setShowMAP] = useState(true);

  if (!readings || readings.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No readings yet
      </div>
    );
  }

  return (
    <Tabs defaultValue="timeline" className="w-full pt-4">
      <div className="flex justify-center">
        <TabsList className="mb-4">
          <TabsTrigger value="timeline" className="gap-1.5">
            <LineChart className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="scatter" className="gap-1.5">
            <ScatterChart className="h-4 w-4" />
            Distribution
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="timeline" className="w-full">
        <BPTimeChart
          readings={readings}
          showTrendline={showTrendline}
          showMarkers={showMarkers}
          showMAP={showMAP}
          dateRange={dateRange}
        />
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {[
            { key: 'map', label: 'MAP', active: showMAP, toggle: setShowMAP },
            { key: 'trendline', label: 'Trend', active: showTrendline, toggle: setShowTrendline },
            { key: 'markers', label: 'Markers', active: showMarkers, toggle: setShowMarkers },
          ].map(({ key, label, active, toggle }) => (
            <button
              key={key}
              onClick={() => toggle(!active)}
              className={cn(
                'px-3 py-1 text-xs rounded-full transition-colors',
                active
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="scatter" className="w-full">
        <BPScatterChart readings={readings} />
      </TabsContent>
    </Tabs>
  );
}
