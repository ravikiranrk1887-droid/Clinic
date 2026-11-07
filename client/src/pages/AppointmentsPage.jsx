import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, X, Calendar } from 'lucide-react';
import api from '../services/api';
import { formatDate, formatTime, getTodayStr, getApiErrorMessage } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';
import EmptyState from '../components/EmptyState';
import { PageLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUSES = ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'];

const defaultForm = { patientName: '', patientPhone: '', appointmentDate: getTodayStr(), appointmentTime: '09:00', notes: '' };

const AppointmentForm = ({ form, setForm, errors, onSubmit, loading, onClose, isEdit }) => (
  <form onSubmit={onSubmit} noValidate>
    <FormField label="Patient Name" required error={errors.patientName} id="appt-name">
      <input id="appt-name" type="text" value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} style={inputStyle(!!errors.patientName)} placeholder="Full name" />
    </FormField>
    <FormField label="Phone Number" error={errors.patientPhone} id="appt-phone" hint="Optional">
      <input id="appt-phone" type="tel" value={form.patientPhone} onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))} style={inputStyle(!!errors.patientPhone)} placeholder="+1 555 000 0000" />
    </FormField>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <FormField label="Date" required error={errors.appointmentDate} id="appt-date">
        <input id="appt-date" type="date" value={form.appointmentDate} onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))} style={inputStyle(!!errors.appointmentDate)} min={getTodayStr()} />
      </FormField>
      <FormField label="Time" required error={errors.appointmentTime} id="appt-time">
        <input id="appt-time" type="time" value={form.appointmentTime} onChange={e => setForm(p => ({ ...p, appointmentTime: e.target.value }))} style={inputStyle(!!errors.appointmentTime)} />
      </FormField>
    </div>
    <FormField label="Notes" id="appt-notes" hint="Optional — max 500 characters">
      <textarea id="appt-notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle(false), minHeight: 80, resize: 'vertical' }} placeholder="Any additional notes..." maxLength={500} />
    </FormField>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
      <Button type="submit" loading={loading}>{isEdit ? 'Update Appointment' : 'Create Appointment'}</Button>
    </div>
  </form>
);

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;
      if (search) params.search = search;
      params.page = pagination.page;
      params.limit = 20;
      const res = await api.get('/appointments', { params });
      setAppointments(res.data.data);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: res.data.data.length });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus, search, pagination.page]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const validateForm = () => {
    const errs = {};
    if (!form.patientName.trim()) errs.patientName = 'Patient name is required';
    if (!form.appointmentDate) errs.appointmentDate = 'Date is required';
    if (!form.appointmentTime) errs.appointmentTime = 'Time is required';
    if (form.patientPhone && !/^[+]?[\d\s\-().]{7,20}$/.test(form.patientPhone)) {
      errs.patientPhone = 'Invalid phone number format';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    setEditingAppt(null);
    setForm(defaultForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (appt) => {
    setEditingAppt(appt);
    setForm({ patientName: appt.patientName, patientPhone: appt.patientPhone || '', appointmentDate: appt.appointmentDate, appointmentTime: appt.appointmentTime, notes: appt.notes || '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingAppt) {
        await api.put(`/appointments/${editingAppt._id}`, form);
        toast.success('Appointment updated');
      } else {
        await api.post('/appointments', form);
        toast.success('Appointment created');
      }
      setModalOpen(false);
      fetchAppointments();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      if (err?.response?.data?.errors) {
        const serverErrs = {};
        err.response.data.errors.forEach(e => { serverErrs[e.field] = e.message; });
        setFormErrors(serverErrs);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (appt) => {
    if (!window.confirm(`Cancel appointment for ${appt.patientName}?`)) return;
    try {
      await api.patch(`/appointments/${appt._id}/status`, { status: 'cancelled' });
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const handleCheckIn = async (appt) => {
    try {
      const res = await api.post('/queue/check-in', { appointmentId: appt._id });
      toast.success(`Checked in — Queue #${res.data.data.queueNumber}, Access Code: ${res.data.data.accessCode}`);
      fetchAppointments();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>Appointments</h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', marginTop: 2 }}>{pagination.total} appointment{pagination.total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>New Appointment</Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-light)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name..." style={{ ...inputStyle(false), paddingLeft: 32 }} />
            </div>
            <div style={{ position: 'relative' }}>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={inputStyle(false)} />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle(false), width: 'auto' }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
            </select>
            {(search || filterStatus || filterDate !== getTodayStr()) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterDate(getTodayStr()); }} style={{ background: 'none', border: 'none', color: 'var(--color-slate)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        {loading ? <PageLoader /> : appointments.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments found" description="No appointments match your current filters." action={<Button onClick={openCreate} icon={<Plus size={14} />} size="sm">New Appointment</Button>} />
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['Patient', 'Date', 'Time', 'Phone', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt._id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{appt.patientName}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-slate)' }}>{formatDate(appt.appointmentDate)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatTime(appt.appointmentTime)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-slate)' }}>{appt.patientPhone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={appt.status} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {appt.status === 'scheduled' && (
                          <>
                            <Button size="xs" variant="secondary" onClick={() => openEdit(appt)} icon={<Edit2 size={12} />}>Edit</Button>
                            <Button size="xs" variant="success" onClick={() => handleCheckIn(appt)}>Check In</Button>
                            <Button size="xs" variant="danger" onClick={() => handleCancel(appt)} icon={<X size={12} />}>Cancel</Button>
                          </>
                        )}
                        {appt.status === 'checked-in' && <span style={{ fontSize: '0.8rem', color: 'var(--color-teal)', fontWeight: 600 }}>In Queue</span>}
                        {['completed', 'cancelled', 'no-show'].includes(appt.status) && <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: p === pagination.page ? 'var(--color-primary)' : 'white', color: p === pagination.page ? 'white' : 'var(--color-navy)', fontWeight: p === pagination.page ? 700 : 400, cursor: 'pointer', fontSize: '0.875rem' }}>{p}</button>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAppt ? 'Edit Appointment' : 'New Appointment'}>
        <AppointmentForm form={form} setForm={setForm} errors={formErrors} onSubmit={handleSubmit} loading={submitting} onClose={() => setModalOpen(false)} isEdit={!!editingAppt} />
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
