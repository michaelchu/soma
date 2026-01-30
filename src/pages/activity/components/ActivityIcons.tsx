import type React from 'react';
import type { ActivityType } from '@/types/activity';

interface IconProps {
  className?: string;
  size?: number;
}

// Walking icon - using PNG with invert filter
export function WalkingIcon({ className = '', size = 24 }: IconProps) {
  return (
    <img
      src="/icons/walking.png"
      alt="Walking"
      width={size}
      height={size}
      className={`${className} invert`}
      style={{ filter: 'invert(1)' }}
    />
  );
}

// Shuttlecock icon - using PNG with invert filter
export function BadmintonIcon({ className = '', size = 24 }: IconProps) {
  return (
    <img
      src="/icons/badminton.png"
      alt="Badminton"
      width={size}
      height={size}
      className={`${className} invert`}
      style={{ filter: 'invert(1)' }}
    />
  );
}

// Pickleball icon - using PNG with invert filter
export function PickleballIcon({ className = '', size = 24 }: IconProps) {
  return (
    <img
      src="/icons/pickleball.png"
      alt="Pickleball"
      width={size}
      height={size}
      className={`${className} invert`}
      style={{ filter: 'invert(1)' }}
    />
  );
}

// Running/activity icon
export function OtherActivityIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Head */}
      <circle cx="12" cy="4" r="2.5" />
      {/* Body - simplified running pose */}
      <path d="M15.5 22l-3-7.5-3 2V22h-2v-7l4-3-1-3-4 1v-2l5-1.5c.8-.2 1.6.3 1.9 1l1.1 3c.5 1.2 1.6 2 2.9 2.2v2c-1.5-.2-2.9-1-3.8-2.2l-.6 1.5 2.5 2V22h-2.5z" />
    </svg>
  );
}

export function getActivityIcon(type: ActivityType): React.ComponentType<IconProps> {
  switch (type) {
    case 'walking':
      return WalkingIcon;
    case 'badminton':
      return BadmintonIcon;
    case 'pickleball':
      return PickleballIcon;
    default:
      return OtherActivityIcon;
  }
}

export function ActivityIcon({
  type,
  className = '',
  size = 24,
}: IconProps & { type: ActivityType }) {
  switch (type) {
    case 'walking':
      return <WalkingIcon className={className} size={size} />;
    case 'badminton':
      return <BadmintonIcon className={className} size={size} />;
    case 'pickleball':
      return <PickleballIcon className={className} size={size} />;
    default:
      return <OtherActivityIcon className={className} size={size} />;
  }
}
