import { useState } from 'react';
import { LineChart, ScatterChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BPTimeChart } from '../charts/BPTimeChart';
import { BPScatterChart } from '../charts/BPScatterChart';

export function ChartsTab({ readings, dateRange = 'all' }) {
  const [showTrendline, setShowTrendline] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [showPP, setShowPP] = useState(true);
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
          showPP={showPP}
          showMAP={showMAP}
          dateRange={dateRange}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-fit mx-auto">
          <div className="flex items-center gap-2">
            <Switch id="pp" checked={showPP} onCheckedChange={setShowPP} />
            <Label htmlFor="pp" className="text-sm cursor-pointer">
              PP Area
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="map" checked={showMAP} onCheckedChange={setShowMAP} />
            <Label htmlFor="map" className="text-sm cursor-pointer">
              MAP
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="trendline" checked={showTrendline} onCheckedChange={setShowTrendline} />
            <Label htmlFor="trendline" className="text-sm cursor-pointer">
              Trendline
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="markers" checked={showMarkers} onCheckedChange={setShowMarkers} />
            <Label htmlFor="markers" className="text-sm cursor-pointer">
              Markers
            </Label>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="scatter" className="w-full">
        <BPScatterChart readings={readings} />
      </TabsContent>
    </Tabs>
  );
}
