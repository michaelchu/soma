import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity as ActivityIcon, AlertTriangle, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FabButton } from '@/components/ui/fab-button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { ActivityProvider, useActivity } from './activity/context/ActivityContext';
import { ActivityCalendar } from './activity/components/ActivityCalendar';
import { ActivityForm } from './activity/components/modals/ActivityForm';
import { ExportModal } from './activity/components/modals/ExportModal';
import type { Activity } from '@/types/activity';

function ActivityContent() {
  const navigate = useNavigate();
  const { activities, loading, error } = useActivity();
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ActivityIcon className="animate-pulse text-primary mx-auto mb-4" size={32} />
          <p className="text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
            Error loading activities
          </p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        leftContent={
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Home"
          >
            <ActivityIcon className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            <span className="text-xl font-bold">Soma</span>
          </button>
        }
        rightContent={
          <>
            {activities.length > 0 && (
              <Button
                onClick={() => setShowExport(true)}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Export Data"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Button
              onClick={() => setShowForm(true)}
              size="icon"
              variant="ghost"
              className="hidden md:flex h-8 w-8"
              title="Add Activity"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 pt-4 pb-0 md:pb-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No activities yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ActivityCalendar activities={activities} onEditActivity={setEditingActivity} />
        )}
      </main>

      {/* FAB Button - mobile only, positioned lower since no bottom nav */}
      <FabButton onClick={() => setShowForm(true)} className="bottom-6" />

      {/* Add Activity Modal */}
      <ActivityForm open={showForm} onOpenChange={setShowForm} />

      {/* Edit Activity Modal */}
      <ActivityForm
        open={!!editingActivity}
        onOpenChange={(open) => !open && setEditingActivity(null)}
        activity={editingActivity}
      />

      {/* Export Modal */}
      {showExport && <ExportModal activities={activities} onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <ActivityProvider>
      <ActivityContent />
    </ActivityProvider>
  );
}
