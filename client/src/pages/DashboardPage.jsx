import React, { useState, useEffect, useCallback } from 'react';
import { Users, Calendar, CheckCircle, Clock, UserCheck, ArrowRight, RefreshCw, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatTime, formatDateTime, formatWaitTime, getStatusBadge } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/helpers';

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div
    style={{
      background: 'white',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      boxShadow: 'var(--shadow)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        background: bg,
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-slate)', marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue:updated', fetchDashboard);
    return () => socket.off('queue:updated', fetchDashboard);
  }, [socket, fetchDashboard]);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const { summary, nextPatient, inConsultationList = [], averageServiceDurationMinutes, upcomingAppointments = [], recentActivity = [], clinicName } = data;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
            {clinicName || 'Clinic Dashboard'}
          </h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchDashboard}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: 'white', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)', fontSize: '0.8rem', cursor: 'pointer',
              color: 'var(--color-slate)',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            to="/appointments"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: 'var(--color-primary)', border: 'none',
              borderRadius: 'var(--radius)', fontSize: '0.8rem', cursor: 'pointer',
              color: 'white', fontWeight: 500, textDecoration: 'none',
            }}
          >
            <Plus size={14} /> New Appointment
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Appointments Today" value={summary?.totalToday || 0} icon={Calendar} color="var(--color-primary)" bg="var(--color-primary-light)" />
        <StatCard label="Currently Waiting" value={summary?.waiting || 0} icon={Clock} color="var(--color-warning)" bg="var(--color-warning-light)" />
        <StatCard label="In Consultation" value={summary?.inConsultation || 0} icon={UserCheck} color="var(--color-info)" bg="var(--color-info-light)" />
        <StatCard label="Completed" value={summary?.completed || 0} icon={CheckCircle} color="var(--color-success)" bg="var(--color-success-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="dashboard-grid">
        {/* Next Patient + In Consultation */}
        <Card>
          <CardHeader title="Queue Status" />
          <CardBody>
            {nextPatient ? (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Patient in Line</p>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius)', marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, background: 'var(--color-primary)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem',
                    }}
                  >
                    #{nextPatient.queueNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{nextPatient.patientName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'capitalize' }}>{nextPatient.entryType}</div>
                  </div>
                  <Link to="/queue">
                    <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>
                      Call <ArrowRight size={13} />
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-slate)', fontSize: '0.875rem' }}>
                No patients currently waiting
              </div>
            )}

            {inConsultationList.length > 0 && (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Consultation</p>
                {inConsultationList.map((p) => (
                  <div key={p.id || p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--color-info-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-info)', fontWeight: 700, fontSize: '0.8rem' }}>
                      #{p.queueNumber}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.patientName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>Since {formatTime(p.consultationStartTime)}</div>
                    </div>
                    <StatusBadge status="in-consultation" />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--color-slate)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>Avg. service: <strong>{averageServiceDurationMinutes || 10} min</strong></span>
            </div>
          </CardBody>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader
            title="Today's Appointments"
            actions={<Link to="/appointments" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>View all</Link>}
          />
          <CardBody style={{ padding: 0 }}>
            {upcomingAppointments.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate)', fontSize: '0.875rem' }}>No appointments today</div>
            ) : (
              <div>
                {upcomingAppointments.map((appt) => (
                  <div key={appt._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ width: 44, height: 36, background: 'var(--color-primary-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatTime(appt.appointmentTime)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.patientName}</div>
                    </div>
                    <StatusBadge status={appt.status} size="xs" />
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardHeader title="Recent Activity" />
          <CardBody style={{ padding: 0 }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-slate)', fontSize: '0.875rem' }}>No activity yet today</div>
            ) : (
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg)' }}>
                      {['Queue #', 'Patient', 'Type', 'Status', 'Last Updated'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((entry) => (
                      <tr key={entry._id} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-primary)' }}>#{entry.queueNumber}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{entry.patientName}</td>
                        <td style={{ padding: '12px 16px' }}><span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{entry.entryType}</span></td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={entry.status} /></td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-slate)', fontSize: '0.8rem' }}>{formatDateTime(entry.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
