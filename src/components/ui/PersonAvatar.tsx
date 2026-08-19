import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#84CC16',
  '#F97316',
  '#14B8A6',
];

export function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function avatarColor(name?: string | null): string {
  const seed = name?.trim() || '?';
  return AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length];
}

export function isUsableAvatarUrl(src?: string | null): boolean {
  if (!src) return false;
  const value = src.trim();
  if (!value) return false;
  if (value.includes('default-avatar')) return false;
  if (value === 'undefined' || value === 'null') return false;
  return true;
}

interface PersonAvatarProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  alt?: string;
  fallbackClassName?: string;
}

export function PersonAvatar({ name, src, className, alt, fallbackClassName }: PersonAvatarProps) {
  const initials = getInitials(name);
  const color = avatarColor(name);
  const imageSrc = isUsableAvatarUrl(src) ? src!.trim() : undefined;

  return (
    <Avatar className={cn('h-7 w-7 shrink-0', className)}>
      {imageSrc && (
        <AvatarImage src={imageSrc} alt={alt || name || ''} className="object-cover object-top" />
      )}
      <AvatarFallback
        className={cn('text-[10px] font-semibold text-white', fallbackClassName)}
        style={{ backgroundColor: color }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
