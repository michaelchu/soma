import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import Navbar from '@/components/Navbar';
import apps from '@/config/apps.json';

export default function Launcher() {
  const navigate = useNavigate();

  const handleAppClick = (app) => {
    if (app.route) {
      navigate(app.route);
    } else if (app.url) {
      window.open(app.url, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        leftContent={
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            <span className="text-xl font-bold">Soma</span>
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="animate-fade-in">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {apps.apps.map((app) => (
              <AppIcon key={app.id} app={app} onClick={handleAppClick} />
            ))}
          </div>

          {apps.apps.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p>No apps configured</p>
              <p className="text-sm mt-1">Add apps to src/config/apps.json</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-muted-foreground text-xs">
          {apps.apps.length} {apps.apps.length === 1 ? 'app' : 'apps'} available
        </p>
      </footer>
    </div>
  );
}
