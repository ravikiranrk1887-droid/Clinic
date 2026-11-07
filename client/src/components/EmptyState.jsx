import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      color: 'var(--color-slate)',
    }}
  >
    {Icon && (
      <div
        style={{
          width: 64,
          height: 64,
          background: 'var(--color-primary-light)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={28} color="var(--color-primary)" />
      </div>
    )}
    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: 8 }}>{title}</h3>
    {description && <p style={{ fontSize: '0.875rem', maxWidth: 320, lineHeight: 1.6 }}>{description}</p>}
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

export default EmptyState;
