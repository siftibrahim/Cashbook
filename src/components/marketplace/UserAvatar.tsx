import React, { useState } from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  isVerified?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 sm:w-28 sm:h-28 text-3xl',
};

const ICON_SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-12 h-12',
};

// Generates a consistent, visually pleasing pastel/vibrant gradient based on name
function getAvatarGradient(name: string = ''): string {
  const gradients = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'ইউজার',
  size = 'md',
  className = '',
  showBadge = false,
  isVerified = false,
}) => {
  const [hasError, setHasError] = useState(false);

  // Check if src is valid and not empty, and not a broken URL
  const isValidSrc = Boolean(src && typeof src === 'string' && src.trim().length > 5 && !hasError);

  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const iconSizeClasses = ICON_SIZE_MAP[size] || ICON_SIZE_MAP.md;
  const gradientClass = getAvatarGradient(name);

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {isValidSrc ? (
        <img
          src={src!}
          alt={name}
          onError={() => setHasError(true)}
          className={`${sizeClasses} rounded-full object-cover border border-slate-200/80 shadow-xs bg-slate-100`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradientClass} text-white font-black flex items-center justify-center shadow-xs uppercase tracking-wider`}
          title={name}
        >
          {initial.match(/[\u0980-\u09FFa-zA-Z0-9]/) ? (
            <span>{initial}</span>
          ) : (
            <User className={`${iconSizeClasses} text-white/90`} />
          )}
        </div>
      )}

      {showBadge && isVerified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] border-2 border-white shadow-xs"
          title="ভেরিফাইড অ্যাকাউন্ট"
        >
          ✓
        </span>
      )}
    </div>
  );
};
