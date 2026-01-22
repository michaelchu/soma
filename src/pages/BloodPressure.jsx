import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Plus, ArrowLeft, LineChart, ScatterChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Navbar from '@/components/Navbar';
import { useReadings } from './blood-pressure/hooks/useReadings';
import { BPTimeChart } from './blood-pressure/components/charts/BPTimeChart';
import { BPScatterChart } from './blood-pressure/components/charts/BPScatterChart';
import { LatestReading } from './blood-pressure/components/ui/LatestReading';
import { BPStatusBadge } from './blood-pressure/components/ui/BPStatusBadge';
import { ReadingForm } from './blood-pressure/components/modals/ReadingForm';
import { getBPCategory, calculateStats, formatDateTime } from './blood-pressure/utils/bpHelpers';

export default function BloodPressure({ onLogout }) {
  const navigate = useNavigate();
  const { readings, loading, error } = useReadings();
  const [showForm, setShowForm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading blood pressure readings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading readings</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const stats = calculateStats(readings);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        onLogout={onLogout}
        leftContent={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        }
      />

      {/* Sticky Toolbar */}
      <div
        className={`sticky top-[57px] z-10 bg-background/95 backdrop-blur-sm transition-all ${
          isScrolled ? 'border-b shadow-sm' : ''
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Blood Pressure</h1>
              <p className="text-sm text-muted-foreground">
                {readings.length} reading{readings.length !== 1 ? 's' : ''} recorded
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Reading</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {readings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No blood pressure readings yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Reading
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Latest Reading & Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <LatestReading readings={readings} />

              {stats && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Average</p>
                        <p className="text-lg font-semibold">
                          {stats.avgSystolic}/{stats.avgDiastolic}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Readings</p>
                        <p className="text-lg font-semibold">{stats.count}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Systolic Range</p>
                        <p className="font-medium">
                          {stats.minSystolic} - {stats.maxSystolic}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Diastolic Range</p>
                        <p className="font-medium">
                          {stats.minDiastolic} - {stats.maxDiastolic}
                        </p>
                      </div>
                      {stats.avgPulse && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Average Pulse</p>
                          <p className="font-medium">{stats.avgPulse} bpm</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Charts */}
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="timeline">
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
                  <TabsContent value="timeline">
                    <BPTimeChart readings={readings} />
                  </TabsContent>
                  <TabsContent value="scatter">
                    <BPScatterChart readings={readings} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Readings Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Readings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">BP</TableHead>
                        <TableHead className="text-right">Pulse</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading) => {
                        const { date, time } = formatDateTime(reading.datetime);
                        const category = getBPCategory(reading.systolic, reading.diastolic);
                        return (
                          <TableRow key={reading.id}>
                            <TableCell className="font-medium">{date}</TableCell>
                            <TableCell className="text-muted-foreground">{time}</TableCell>
                            <TableCell className="text-right font-mono">
                              {reading.systolic}/{reading.diastolic}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {reading.pulse || '—'}
                            </TableCell>
                            <TableCell>
                              <BPStatusBadge category={category} size="sm" />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                              {reading.notes || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Add Reading Modal */}
      <ReadingForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
