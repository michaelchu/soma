import type { ActivityType } from '@/types/activity';

interface IconProps {
  className?: string;
  size?: number;
}

// Icon configuration for PNG-based icons
const ACTIVITY_ICONS: Record<string, { src: string; alt: string }> = {
  walking: { src: '/icons/walking.png', alt: 'Walking' },
  badminton: { src: '/icons/badminton.png', alt: 'Badminton' },
  pickleball: { src: '/icons/pickleball.png', alt: 'Pickleball' },
};

// PNG icon component with dark mode aware invert filter
function PngIcon({
  src,
  alt,
  className = '',
  size = 24,
}: IconProps & { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`${className} invert dark:invert-0`}
    />
  );
}

// Fallback SVG icon for "other" activity type
function OtherActivityIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="4" r="2.5" />
      <path d="M15.5 22l-3-7.5-3 2V22h-2v-7l4-3-1-3-4 1v-2l5-1.5c.8-.2 1.6.3 1.9 1l1.1 3c.5 1.2 1.6 2 2.9 2.2v2c-1.5-.2-2.9-1-3.8-2.2l-.6 1.5 2.5 2V22h-2.5z" />
    </svg>
  );
}

export function ActivityIcon({
  type,
  className = '',
  size = 24,
}: IconProps & { type: ActivityType }) {
  const iconConfig = ACTIVITY_ICONS[type];

  if (iconConfig) {
    return <PngIcon src={iconConfig.src} alt={iconConfig.alt} className={className} size={size} />;
  }

  return <OtherActivityIcon className={className} size={size} />;
}
