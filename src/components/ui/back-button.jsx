import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BackButton({ to = '/' }) {
  const navigate = useNavigate();

  return (
    <Button variant="ghost" size="icon" onClick={() => navigate(to)} className="h-8 w-8">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
