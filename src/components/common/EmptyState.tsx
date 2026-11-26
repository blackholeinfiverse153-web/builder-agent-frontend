import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-surface-800 rounded-xl bg-surface-900/20 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-surface-800/80 border border-surface-700/60 flex items-center justify-center text-surface-400 mb-4">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-surface-200">{title}</h4>
      <p className="text-xs text-surface-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="primary" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
