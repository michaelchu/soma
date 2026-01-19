import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppIcon from '@/components/AppIcon';
import apps from '@/config/apps.json';
import { clearSession } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

export default function Launcher({ onLogout }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleAppClick = (app) => {
    navigate(`/app/${app.id}`);
  };

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-red-500" />
          <span className="font-medium">Soma</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="animate-fade-in">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {apps.apps.map((app) => (
              <AppIcon 
                key={app.id} 
                app={app} 
                onClick={handleAppClick}
              />
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
