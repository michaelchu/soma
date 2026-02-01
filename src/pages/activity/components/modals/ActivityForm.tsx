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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Save, Loader2, Trash2, ChevronDown, Heart } from 'lucide-react';
import { useActivity } from '../../context/ActivityContext';
import { showError, showSuccess, showWithUndo, extractErrorMessage } from '@/lib/toast';
import { getLocalDateNow } from '@/lib/dateUtils';
import { getIntensityLabel } from '../../utils/activityHelpers';
import {
  ACTIVITY_TYPES,
  TIME_OF_DAY_OPTIONS,
  HR_ZONE_OPTIONS,
  type Activity,
  type ActivityType,
  type ActivityTimeOfDay,
} from '@/types/activity';

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

  // HR zone state (optional)
  const [zone1Minutes, setZone1Minutes] = useState(() =>
    activity?.zone1Minutes != null ? String(activity.zone1Minutes) : ''
  );
  const [zone2Minutes, setZone2Minutes] = useState(() =>
    activity?.zone2Minutes != null ? String(activity.zone2Minutes) : ''
  );
  const [zone3Minutes, setZone3Minutes] = useState(() =>
    activity?.zone3Minutes != null ? String(activity.zone3Minutes) : ''
  );
  const [zone4Minutes, setZone4Minutes] = useState(() =>
    activity?.zone4Minutes != null ? String(activity.zone4Minutes) : ''
  );
  const [zone5Minutes, setZone5Minutes] = useState(() =>
    activity?.zone5Minutes != null ? String(activity.zone5Minutes) : ''
  );
  const [hrZonesOpen, setHrZonesOpen] = useState(() => {
    // Open by default if any zone has data
    return !!(
      activity?.zone1Minutes ||
      activity?.zone2Minutes ||
      activity?.zone3Minutes ||
      activity?.zone4Minutes ||
      activity?.zone5Minutes
    );
  });

  const [saving, setSaving] = useState(false);

  // Helper to parse zone minutes (empty string = null)
  const parseZoneMinutes = (val: string): number | null => {
    if (!val.trim()) return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  };

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
      zone1Minutes: parseZoneMinutes(zone1Minutes),
      zone2Minutes: parseZoneMinutes(zone2Minutes),
      zone3Minutes: parseZoneMinutes(zone3Minutes),
      zone4Minutes: parseZoneMinutes(zone4Minutes),
      zone5Minutes: parseZoneMinutes(zone5Minutes),
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
      showError(extractErrorMessage(saveError) || 'Failed to save activity');
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
    setZone1Minutes('');
    setZone2Minutes('');
    setZone3Minutes('');
    setZone4Minutes('');
    setZone5Minutes('');
    setHrZonesOpen(false);
  };

  const handleDelete = async () => {
    if (!activity) return;

    const { error } = await deleteActivity(activity.id);
    if (error) {
      showError(extractErrorMessage(error) || 'Failed to delete activity');
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
        zone1Minutes: activity.zone1Minutes,
        zone2Minutes: activity.zone2Minutes,
        zone3Minutes: activity.zone3Minutes,
        zone4Minutes: activity.zone4Minutes,
        zone5Minutes: activity.zone5Minutes,
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

          {/* HR Zones (optional, collapsible) */}
          <Collapsible open={hrZonesOpen} onOpenChange={setHrZonesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-0 hover:bg-transparent"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="h-4 w-4" />
                  Heart Rate Zones
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${hrZonesOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Enter time spent in each HR zone from your watch (in minutes)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {HR_ZONE_OPTIONS.map((zone) => {
                  const zoneSetters = {
                    1: setZone1Minutes,
                    2: setZone2Minutes,
                    3: setZone3Minutes,
                    4: setZone4Minutes,
                    5: setZone5Minutes,
                  };
                  const zoneValues = {
                    1: zone1Minutes,
                    2: zone2Minutes,
                    3: zone3Minutes,
                    4: zone4Minutes,
                    5: zone5Minutes,
                  };
                  return (
                    <div key={zone.zone} className="space-y-1">
                      <Label htmlFor={`zone${zone.zone}`} className="text-xs">
                        {zone.label}{' '}
                        <span className="text-muted-foreground">({zone.description})</span>
                      </Label>
                      <Input
                        id={`zone${zone.zone}`}
                        type="number"
                        placeholder="min"
                        value={zoneValues[zone.zone]}
                        onChange={(e) => zoneSetters[zone.zone](e.target.value)}
                        min={0}
                        max={480}
                        className="h-8"
                      />
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

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
