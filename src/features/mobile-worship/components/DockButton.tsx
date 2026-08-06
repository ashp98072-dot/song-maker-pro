import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface DockButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
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
          ? 'border-gold bg-gold/20 text-gold'
          : 'border-white/10 bg-white/5 text-foreground'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
});

DockButton.displayName = 'DockButton';
