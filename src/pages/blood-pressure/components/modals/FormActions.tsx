import { Button } from '@/components/ui/button';
import { Save, Loader2, Trash2 } from 'lucide-react';

interface FormActionsProps {
  isEditing: boolean;
  isValid: boolean;
  saving: boolean;
  deleting: boolean;
  confirmDelete: boolean;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export function FormActions({
  isEditing,
  isValid,
  saving,
  deleting,
  confirmDelete,
  onSave,
  onReset,
  onDelete,
}: FormActionsProps) {
  return (
    <div className="flex gap-2 px-5 py-4 flex-shrink-0 border-t">
      {isEditing && (
        <Button
          variant={confirmDelete ? 'destructive' : 'outline'}
          onClick={onDelete}
          disabled={saving || deleting}
          className="flex-shrink-0"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {confirmDelete && <span className="ml-2">Confirm</span>}
            </>
          )}
        </Button>
      )}
      <Button variant="outline" onClick={onReset} className="flex-1" disabled={saving || deleting}>
        Reset
      </Button>
      <Button onClick={onSave} disabled={!isValid || saving || deleting} className="flex-1">
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
  );
}
