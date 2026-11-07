import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Clock, History,
  Settings, LogOut, X, Activity, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/queue', icon: Users, label: 'Queue' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: 'var(--sidebar-width)',
        background: 'var(--color-navy)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transform: isOpen ? 'translateX(0)' : undefined,
        transition: 'transform var(--transition)',
        overflowY: 'auto',
      }}
      className="sidebar"
    >
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--color-primary)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>ClinicQueue</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Lite</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mobile-close-btn"
            style={{
              display: 'none', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.6)', padding: 4, borderRadius: 4,
            }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }} aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              marginBottom: 2,
              borderRadius: 8,
              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(14,165,233,0.2)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem',
              transition: 'all var(--transition)',
              borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
            })}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ padding: '10px 12px', marginBottom: 4, borderRadius: 8 }}>
          <div style={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>{staff?.displayName}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{staff?.role}</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '10px 12px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem',
            borderRadius: 8, cursor: 'pointer', transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'};
          }
          .mobile-close-btn { display: flex !important; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
