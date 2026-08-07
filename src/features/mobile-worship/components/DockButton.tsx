import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

export interface DockButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  label: string;
  children: ReactNode;
}

export const DockButton = forwardRef<HTMLButtonElement, DockButtonProps>(function DockButton(
  {
    onClick,
    active,
    label,
    children,
    className = '',
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center justify-center min-w-[2.5rem] min-h-[2.5rem] px-1 py-0.5 rounded-xl border transition-all active:scale-95 ${className} ${
        active
          ? 'border-amber-400/70 bg-amber-400/20 text-amber-200'
          : 'border-white/20 bg-white/5 text-white'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
});

DockButton.displayName = 'DockButton';
