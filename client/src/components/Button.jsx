import React from 'react';

const variants = {
  primary: { background: 'var(--color-primary)', color: 'white', border: 'none' },
  secondary: { background: 'var(--color-white)', color: 'var(--color-navy)', border: '1px solid var(--color-border)' },
  success: { background: 'var(--color-success)', color: 'white', border: 'none' },
  danger: { background: 'var(--color-danger)', color: 'white', border: 'none' },
  warning: { background: 'var(--color-warning)', color: 'white', border: 'none' },
  ghost: { background: 'transparent', color: 'var(--color-slate)', border: '1px solid transparent' },
};

const sizes = {
  xs: { padding: '4px 8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' },
  sm: { padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' },
  md: { padding: '8px 16px', fontSize: '0.875rem', borderRadius: 'var(--radius)' },
  lg: { padding: '10px 20px', fontSize: '1rem', borderRadius: 'var(--radius)' },
};

const Button = ({ children, variant = 'primary', size = 'md', loading, disabled, style, icon, ...props }) => {
  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition)',
        whiteSpace: 'nowrap',
        ...variantStyle,
        ...sizeStyle,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : icon ? icon : null}
      {children}
    </button>
  );
};

export default Button;
