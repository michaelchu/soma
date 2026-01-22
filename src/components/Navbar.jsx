import { LogOut, Sun, Moon, HeartPulse, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';

export default function Navbar({ leftContent, rightContent }) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
        <div className="flex justify-between items-center gap-2">
          {/* Left: Page-specific content */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">{leftContent}</div>

          {/* Center: Branding */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <HeartPulse className="h-7 w-7 text-red-500" strokeWidth={2.5} />
            <span className="text-xl font-bold hidden sm:inline">Soma</span>
          </div>

          {/* Right: Page actions + theme + logout */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-1 justify-end">
            {rightContent}
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Settings">
              <Link to="/settings" state={{ from: location.pathname }}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
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
        </div>
      </div>
    </header>
  );
}
