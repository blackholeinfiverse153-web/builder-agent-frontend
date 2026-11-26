import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  headerAction,
  footer,
  className = '',
  children,
}) => {
  return (
    <div className={`rounded-xl border border-surface-800 bg-surface-900/40 shadow-lg backdrop-blur-sm flex flex-col ${className}`}>
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-surface-400 shrink-0">{icon}</span>}
            <div>
              {title && <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-surface-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-surface-800 bg-surface-950/40 rounded-b-xl text-xs text-surface-400">
          {footer}
        </div>
      )}
    </div>
  );
};
