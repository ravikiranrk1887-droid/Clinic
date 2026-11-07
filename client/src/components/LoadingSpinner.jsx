import React from 'react';

const LoadingSpinner = ({ size = 24, style }) => (
  <div
    style={{
      width: size,
      height: size,
      border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
      ...style,
    }}
    aria-label="Loading"
    role="status"
  />
);

export const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
    <div style={{ textAlign: 'center' }}>
      <LoadingSpinner size={36} style={{ margin: '0 auto 12px' }} />
      <p style={{ fontSize: '0.875rem', color: 'var(--color-slate)' }}>Loading...</p>
    </div>
  </div>
);

export default LoadingSpinner;
