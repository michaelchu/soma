import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SharedHeader from '@/components/SharedHeader';
import { Button } from '@/components/ui/button';
import apps from '@/config/apps.json';

export default function AppHost() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const app = apps.apps.find(a => a.id === appId);

  useEffect(() => {
    if (!app) {
      setError('App not found');
      setLoading(false);
    }
  }, [app]);

  const handleBack = () => {
    navigate('/');
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load app');
    setLoading(false);
  };

  if (error || !app) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <SharedHeader appName="Error" onBack={handleBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-medium mb-2">
              {error || 'App not found'}
            </h2>
            <p className="text-muted-foreground mb-6">
              The app "{appId}" could not be loaded
            </p>
            <Button onClick={handleBack}>
              Back to Apps
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <SharedHeader appName={app.name} onBack={handleBack} />

      <div className="flex-1 relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center animate-fade-in">
              <div className="text-4xl mb-3">{app.icon}</div>
              <p className="text-muted-foreground text-sm">Loading {app.name}...</p>
            </div>
          </div>
        )}

        <iframe
          src={app.url}
          title={app.name}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          className={`w-full h-full border-0 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        />
      </div>
    </div>
  );
}
