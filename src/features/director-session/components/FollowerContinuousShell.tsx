import type { ReactNode } from 'react';

type FollowerContinuousShellProps = {
  children: ReactNode;
  className?: string;
};

/** Ensures follower continuous route always has visible background and layout (no blank/blue screen). */
export function FollowerContinuousShell({ children, className = '' }: FollowerContinuousShellProps) {
  return (
    <div
      className={`min-h-[100dvh] bg-background text-foreground ${className}`.trim()}
      data-follower-continuous-shell
    >
      {children}
    </div>
  );
}
