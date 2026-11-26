import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'neutral' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    brand: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    neutral: 'bg-surface-800 text-surface-300 border-surface-700',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-md border ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
