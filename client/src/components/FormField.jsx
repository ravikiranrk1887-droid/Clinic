import React from 'react';

const FormField = ({ label, error, required, children, hint, id }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-navy-light)',
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 4 }} aria-hidden="true">*</span>}
      </label>
    )}
    {children}
    {hint && !error && (
      <p style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: 4 }}>{hint}</p>
    )}
    {error && (
      <p style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: 4 }} role="alert">{error}</p>
    )}
  </div>
);

export const inputStyle = (hasError) => ({
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
  borderRadius: 'var(--radius)',
  fontSize: '0.875rem',
  color: 'var(--color-navy)',
  background: 'white',
  outline: 'none',
  transition: 'border-color var(--transition)',
});

export default FormField;
