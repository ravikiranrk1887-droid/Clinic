import React from 'react';
import { getStatusBadge } from '../utils/helpers';

const StatusBadge = ({ status, size = 'sm' }) => {
  const { bg, color, label } = getStatusBadge(status);
  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: 999,
        background: bg,
        color,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
