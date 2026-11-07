import React from 'react';
import { Menu, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Header = ({ onMenuClick }) => {
  const { staff } = useAuth();
  const { connected } = useSocket();

  return (
    <header
      style={{
        height: 'var(--header-height)',
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        onClick={onMenuClick}
        className="menu-btn"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'var(--color-slate)',
          padding: 4,
          borderRadius: 6,
          cursor: 'pointer',
        }}
        aria-label="Toggle menu"
      >
        <Menu size={22} />
      </button>

      <div style={{ flex: 1 }} />

      {/* Live connection indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.75rem',
          color: connected ? 'var(--color-success)' : 'var(--color-slate)',
        }}
        title={connected ? 'Live updates active' : 'Connecting...'}
      >
        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span className="hide-mobile">{connected ? 'Live' : 'Offline'}</span>
      </div>

      {/* Patient status link */}
      <Link
        to="/patient-status"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary-dark)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem',
          fontWeight: 500,
          transition: 'background var(--transition)',
        }}
      >
        <ExternalLink size={14} />
        <span className="hide-mobile">Patient View</span>
      </Link>

      {/* User avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.8rem',
        }}
        title={staff?.displayName}
      >
        {staff?.displayName?.[0]?.toUpperCase() || 'S'}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .menu-btn { display: flex !important; }
          .hide-mobile { display: none; }
        }
      `}</style>
    </header>
  );
};

export default Header;
