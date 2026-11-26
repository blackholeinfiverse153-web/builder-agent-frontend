import React from 'react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'idle';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const dotStyles = {
    online: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    offline: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    warning: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    idle: 'bg-surface-500',
  }[status];

  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`relative flex ${dotSize}`}>
        {status === 'online' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full ${dotSize} ${dotStyles}`} />
      </span>
      {label && <span className="text-xs font-mono text-surface-300">{label}</span>}
    </div>
  );
};
