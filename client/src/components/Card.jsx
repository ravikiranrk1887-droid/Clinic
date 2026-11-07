import React from 'react';

const Card = ({ children, style, className, ...props }) => (
  <div
    style={{
      background: 'var(--color-white)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow)',
      border: '1px solid var(--color-border)',
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, actions, style }) => (
  <div
    style={{
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      ...style,
    }}
  >
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--color-slate)', marginTop: 2 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export const CardBody = ({ children, style }) => (
  <div style={{ padding: '16px 20px', ...style }}>{children}</div>
);

export default Card;
