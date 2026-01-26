import React from 'react';
import { LogOut, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';

interface NavbarProps {
  leftContent: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function Navbar({ leftContent, rightContent }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-2">
        <div className="flex justify-between items-center gap-2">
          {/* Left: Page-specific content */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">{leftContent}</div>

          {/* Right: Page actions + theme + logout */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {rightContent}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
