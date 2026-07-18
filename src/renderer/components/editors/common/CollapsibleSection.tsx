import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultExpanded = false,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div
        className="save-manager-section-header mt-4 mb-2 border-b border-[var(--color-border-parchment)] pb-1 flex justify-between items-center cursor-pointer select-none hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}
      >
        <h5 className="font-title text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          {title}
        </h5>
        <span className="text-[10px] text-[var(--color-text-muted)] font-bold mr-1">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};
