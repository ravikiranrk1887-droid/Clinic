import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, PhoneCall, CheckCircle, SkipForward, RotateCcw, XCircle, RefreshCw, Clock } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatTime, formatWaitTime, getTodayStr, getApiErrorMessage } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';
import { PageLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const WalkInForm = ({ onSuccess, onClose }) => {
  const [form, setForm] = useState({ patientName: '', patientPhone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.patientName.trim()) errs.patientName = 'Patient name is required';
    if (form.patientPhone && !/^[+]?[\d\s\-().]{7,20}$/.test(form.patientPhone)) errs.patientPhone = 'Invalid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/queue/walk-in', form);
      const { queueNumber, accessCode } = res.data.data;
      toast.success(`Walk-in registered! Queue #${queueNumber} | Access Code: ${accessCode}`, { duration: 6000 });
      onSuccess();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div
        style={{
          padding: '12px 16px',
          background: 'var(--color-warning-light)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem',
          color: '#92400e',
          marginBottom: 16,
          border: '1px solid #fde68a',
        }}
      >
        A queue number and 6-character access code will be generated. Provide the access code to the patient to check their status online.
      </div>
      <FormField label="Patient Name" required error={errors.patientName} id="walkin-name">
        <input id="walkin-name" type="text" value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} style={inputStyle(!!errors.patientName)} placeholder="Full name" autoFocus />
      </FormField>
      <FormField label="Phone Number" error={errors.patientPhone} id="walkin-phone" hint="Optional">
        <input id="walkin-phone" type="tel" value={form.patientPhone} onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))} style={inputStyle(!!errors.patientPhone)} placeholder="+1 555 000 0000" />
      </FormField>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={loading}>Register Walk-in</Button>
      </div>
    </form>
  );
};

const QueueActionButton = ({ icon: Icon, label, variant, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 10px',
      background: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.75rem',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      color: variant === 'danger' ? 'var(--color-danger)' : variant === 'success' ? 'var(--color-success)' : variant === 'warning' ? 'var(--color-warning)' : variant === 'primary' ? 'var(--color-primary)' : 'var(--color-slate)',
      whiteSpace: 'nowrap',
      transition: 'all var(--transition)',
      fontWeight: 500,
    }}
  >
    <Icon size={13} />
    <span className="action-label">{label}</span>
  </button>
);

const QueuePage = () => {
  const [queue, setQueue] = useState({ inConsultation: [], waiting: [], skipped: [], completed: [], cancelled: [], settings: {} });
  const [loading, setLoading] = useState(true);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const { socket } = useSocket();

  const fetchQueue = useCallback(async () => {
    try {
      const res = await api.get('/queue', { params: { date: getTodayStr() } });
      setQueue(res.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  useEffect(() => {
    if (!socket) return;
    socket.on('queue:updated', fetchQueue);
    return () => socket.off('queue:updated', fetchQueue);
  }, [socket, fetchQueue]);

  const doAction = async (id, action, label) => {
    if (actionLoading[id]) return;
    setActionLoading(p => ({ ...p, [id]: true }));
    try {
      await api.post(`/queue/${id}/${action}`);
      toast.success(`${label} successful`);
      fetchQueue();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setActionLoading(p => ({ ...p, [id]: false }));
    }
  };

  const callNext = () => {
    const next = queue.waiting[0];
    if (!next) return toast.error('No patients waiting');
    if (!window.confirm(`Call ${next.patientName} (Queue #${next.queueNumber})?`)) return;
    doAction(next._id, 'call', 'Call patient');
  };

  const totalActive = (queue.waiting?.length || 0) + (queue.inConsultation?.length || 0) + (queue.skipped?.length || 0);

  if (loading) return <PageLoader />;

  const renderQueueTable = (entries = [], title, emptyMsg, showActions) => (
    <Card style={{ marginBottom: 20 }}>
      <CardHeader
        title={title}
        subtitle={`${entries.length} patient${entries.length !== 1 ? 's' : ''}`}
      />
      {entries.length === 0 ? (
        <CardBody>
          <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>{emptyMsg}</p>
        </CardBody>
      ) : (
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['#', 'Patient', 'Type', 'Time', 'Est. Wait', 'Status', ...(showActions ? ['Actions'] : [])].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry._id} style={{ borderTop: '1px solid var(--color-border)', background: idx === 0 && title === 'Waiting Queue' ? 'var(--color-primary-light)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem' }}>#{entry.queueNumber}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{entry.patientName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999, background: entry.entryType === 'appointment' ? 'var(--color-teal-light)' : '#f1f5f9', color: entry.entryType === 'appointment' ? 'var(--color-teal)' : 'var(--color-slate)', textTransform: 'capitalize', fontWeight: 600 }}>
                      {entry.entryType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-slate)', fontSize: '0.8rem' }}>
                    {entry.scheduledTime ? formatTime(entry.scheduledTime) : formatTime(entry.registrationTime)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {entry.status === 'waiting' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.8rem' }}>
                        <Clock size={13} />
                        {formatWaitTime(entry.estimatedWaitingMinutes)}
                      </div>
                    ) : entry.status === 'in-consultation' && entry.consultationStartTime ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-info)' }}>Since {formatTime(entry.consultationStartTime)}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={entry.status} /></td>
                  {showActions && (
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {entry.status === 'waiting' && (
                          <>
                            <QueueActionButton icon={PhoneCall} label="Call" variant="primary" onClick={() => doAction(entry._id, 'call', 'Call patient')} />
                            <QueueActionButton icon={SkipForward} label="Skip" variant="warning" onClick={() => doAction(entry._id, 'skip', 'Skip patient')} />
                            <QueueActionButton icon={XCircle} label="Cancel" variant="danger" onClick={() => { if (window.confirm(`Cancel queue entry for ${entry.patientName}?`)) doAction(entry._id, 'cancel', 'Cancel'); }} />
                          </>
                        )}
                        {entry.status === 'in-consultation' && (
                          <QueueActionButton icon={CheckCircle} label="Complete" variant="success" onClick={() => doAction(entry._id, 'complete', 'Complete consultation')} />
                        )}
                        {entry.status === 'skipped' && (
                          <>
                            <QueueActionButton icon={RotateCcw} label="Return" variant="primary" onClick={() => doAction(entry._id, 'return', 'Return to queue')} />
                            <QueueActionButton icon={XCircle} label="Cancel" variant="danger" onClick={() => { if (window.confirm(`Cancel queue entry for ${entry.patientName}?`)) doAction(entry._id, 'cancel', 'Cancel'); }} />
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>Queue Management</h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', marginTop: 2 }}>
            {getTodayStr()} · {totalActive} active in queue
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={fetchQueue} icon={<RefreshCw size={14} />} size="sm">Refresh</Button>
          <Button onClick={callNext} icon={<PhoneCall size={14} />} disabled={queue.waiting?.length === 0}>Call Next</Button>
          <Button variant="success" onClick={() => setWalkInOpen(true)} icon={<UserPlus size={14} />}>Walk-in</Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Waiting', value: queue.waiting?.length || 0, color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
          { label: 'In Consultation', value: queue.inConsultation?.length || 0, color: 'var(--color-info)', bg: 'var(--color-info-light)' },
          { label: 'Skipped', value: queue.skipped?.length || 0, color: 'var(--color-purple)', bg: 'var(--color-purple-light)' },
          { label: 'Completed', value: queue.completed?.length || 0, color: 'var(--color-success)', bg: 'var(--color-success-light)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 'var(--radius)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 120px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color }}>{value}</span>
            <span style={{ fontSize: '0.8rem', color, fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {renderQueueTable(queue.inConsultation, 'In Consultation', 'No patients currently in consultation', true)}
      {renderQueueTable(queue.waiting, 'Waiting Queue', 'No patients waiting — use Walk-in or Check In an appointment', true)}
      {renderQueueTable(queue.skipped, 'Skipped Patients', 'No skipped patients', true)}

      {/* Recent completed entries */}
      {queue.completed?.length > 0 && renderQueueTable(queue.completed.slice(0, 5), 'Completed Today (Recent 5)', 'None', false)}

      <Modal isOpen={walkInOpen} onClose={() => setWalkInOpen(false)} title="Register Walk-in Patient" size="sm">
        <WalkInForm onSuccess={() => { setWalkInOpen(false); fetchQueue(); }} onClose={() => setWalkInOpen(false)} />
      </Modal>

      <style>{`
        @media (max-width: 640px) {
          .action-label { display: none; }
        }
      `}</style>
    </div>
  );
};

export default QueuePage;
