import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

interface NavbarProps {
  leftContent: React.ReactNode;
  rightContent?: React.ReactNode;
}

export default function Navbar({ leftContent, rightContent }: NavbarProps) {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-2">
        <div className="flex justify-between items-center gap-2">
          {/* Left: Page-specific content */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">{leftContent}</div>

          {/* Right: Page actions + logout */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 -mr-2">
            {rightContent}
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
