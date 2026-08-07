import { Link } from 'react-router-dom';
import type { ProfileLite } from '@/features/profile/profileApi';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-24 h-24 text-3xl',
};

type Props = {
  profile?: Pick<ProfileLite, 'userId' | 'displayName' | 'avatarUrl'> | null;
  /** Fallback letter when no profile */
  name?: string;
  size?: Size;
  linkToProfile?: boolean;
  className?: string;
};

export function ProfileAvatar({
  profile,
  name,
  size = 'md',
  linkToProfile = true,
  className = '',
}: Props) {
  const label = (profile?.displayName || name || 'M').trim() || 'M';
  const initial = label.charAt(0).toUpperCase();
  const avatar = (
    <div
      className={`${SIZE_CLASS[size]} rounded-full bg-secondary overflow-hidden flex items-center justify-center font-bold text-foreground ring-1 ring-border shrink-0 ${className}`}
    >
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );

  if (linkToProfile && profile?.userId) {
    return (
      <Link to={`/perfil/${profile.userId}`} className="shrink-0" title={label}>
        {avatar}
      </Link>
    );
  }
  return avatar;
}
