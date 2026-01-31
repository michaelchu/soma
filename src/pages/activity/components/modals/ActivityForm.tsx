import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Save, Loader2, Trash2 } from 'lucide-react';
import { useActivity } from '../../context/ActivityContext';
import { showError, showSuccess, showWithUndo } from '@/lib/toast';
import { getIntensityLabel } from '../../utils/activityHelpers';
import {
  ACTIVITY_TYPES,
  TIME_OF_DAY_OPTIONS,
  type Activity,
  type ActivityType,
  type ActivityTimeOfDay,
} from '@/types/activity';

function getLocalDateNow(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function ActivityFormContent({
  activity,
  onOpenChange,
}: {
  activity: Activity | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addActivity, updateActivity, deleteActivity } = useActivity();
  const isEditing = !!activity;

  // Form state
  const [date, setDate] = useState(() => activity?.date || getLocalDateNow());
  const [timeOfDay, setTimeOfDay] = useState<ActivityTimeOfDay>(
    () => activity?.timeOfDay || 'morning'
  );
  const [activityType, setActivityType] = useState<ActivityType>(
    () => activity?.activityType || 'walking'
  );
  const [durationMinutes, setDurationMinutes] = useState(() =>
    activity?.durationMinutes ? String(activity.durationMinutes) : ''
  );
  const [intensity, setIntensity] = useState(() => activity?.intensity || 3);
  const [notes, setNotes] = useState(() => activity?.notes || '');

  const [saving, setSaving] = useState(false);

  const isValid =
    date && timeOfDay && activityType && durationMinutes && parseInt(durationMinutes) > 0;

  const handleSave = async () => {
    setSaving(true);

    const activityData = {
      date,
      timeOfDay,
      activityType,
      durationMinutes: parseInt(durationMinutes),
      intensity,
      notes: notes || null,
    };

    let saveError;
    if (isEditing) {
      const result = await updateActivity(activity.id, activityData);
      saveError = result.error;
    } else {
      const result = await addActivity(activityData);
      saveError = result.error;
    }

    setSaving(false);

    if (saveError) {
      const errorMessage = typeof saveError === 'string' ? saveError : saveError.message;
      showError(errorMessage || 'Failed to save activity');
      return;
    }

    showSuccess(isEditing ? 'Activity updated' : 'Activity added');
    onOpenChange(false);
  };

  const handleReset = () => {
    setDate(getLocalDateNow());
    setTimeOfDay('morning');
    setActivityType('walking');
    setDurationMinutes('');
    setIntensity(3);
    setNotes('');
  };

  const handleDelete = async () => {
    if (!activity) return;

    const { error } = await deleteActivity(activity.id);
    if (error) {
      showError(typeof error === 'string' ? error : error.message || 'Failed to delete activity');
      return;
    }

    onOpenChange(false);

    showWithUndo('Activity deleted', async () => {
      const { error: undoError } = await addActivity({
        date: activity.date,
        timeOfDay: activity.timeOfDay,
        activityType: activity.activityType,
        durationMinutes: activity.durationMinutes,
        intensity: activity.intensity,
        notes: activity.notes,
      });
      if (undoError) {
        showError('Failed to restore activity');
      }
    });
  };

  return (
    <>
      {/* Header */}
      <DialogHeader className="flex-shrink-0 px-5 py-4 border-b">
        <DialogTitle>{isEditing ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
      </DialogHeader>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto px-5">
        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Time of Day */}
          <div className="space-y-2">
            <Label htmlFor="timeOfDay">Time of Day</Label>
            <Select value={timeOfDay} onValueChange={(v) => setTimeOfDay(v as ActivityTimeOfDay)}>
              <SelectTrigger id="timeOfDay">
                <SelectValue placeholder="Select time of day" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OF_DAY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({option.description})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
              <SelectTrigger id="activityType">
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              placeholder="e.g., 45"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min={1}
              max={480}
            />
          </div>

          {/* Intensity Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Intensity</Label>
              <span className="text-sm font-medium">
                {intensity} - {getIntensityLabel(intensity)}
              </span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={(v) => setIntensity(v[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very light</span>
              <span>All out</span>
            </div>
          </div>

          <hr className="border-t" />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Felt great, played with friends..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-5 py-4 flex-shrink-0 border-t">
        {isEditing ? (
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={saving}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" onClick={handleReset} className="flex-1" disabled={saving}>
            Reset
          </Button>
        )}
        <Button onClick={handleSave} disabled={!isValid || saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </>
  );
}

export function ActivityForm({
  open,
  onOpenChange,
  activity = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full h-full max-w-none sm:max-w-md sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-lg overflow-hidden p-0 gap-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <ActivityFormContent
          key={activity?.id || 'new'}
          activity={activity}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
