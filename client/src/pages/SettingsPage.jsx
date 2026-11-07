import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, ShieldAlert, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import FormField, { inputStyle } from '../components/FormField';
import { PageLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const QUEUE_POLICIES = [
  { value: 'appointment-first', label: 'Appointments First (Prioritize scheduled appointments)' },
  { value: 'fifo', label: 'FIFO (Strict first-come, first-served order)' },
  { value: 'walk-in-first', label: 'Walk-ins First (Prioritize urgent walk-ins)' },
  { value: 'mixed', label: 'Mixed / Balanced (Alternating appointments & walk-ins)' },
];

const SettingsPage = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    clinicName: '',
    averageServiceDurationMinutes: 10,
    openingHours: { open: '08:00', close: '18:00' },
    queuePolicy: 'appointment-first',
    consultationRooms: 1,
    maxDisplayWaitingMinutes: 120,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.data) {
          setForm({
            clinicName: res.data.data.clinicName || '',
            averageServiceDurationMinutes: res.data.data.averageServiceDurationMinutes || 10,
            openingHours: {
              open: res.data.data.openingHours?.open || '08:00',
              close: res.data.data.openingHours?.close || '18:00',
            },
            queuePolicy: res.data.data.queuePolicy || 'appointment-first',
            consultationRooms: res.data.data.consultationRooms || 1,
            maxDisplayWaitingMinutes: res.data.data.maxDisplayWaitingMinutes || 120,
          });
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.clinicName.trim()) errs.clinicName = 'Clinic name is required';
    if (!form.averageServiceDurationMinutes || form.averageServiceDurationMinutes < 1 || form.averageServiceDurationMinutes > 120) {
      errs.averageServiceDurationMinutes = 'Must be between 1 and 120 minutes';
    }
    if (!form.consultationRooms || form.consultationRooms < 1 || form.consultationRooms > 10) {
      errs.consultationRooms = 'Must be between 1 and 10 rooms';
    }
    if (!form.maxDisplayWaitingMinutes || form.maxDisplayWaitingMinutes < 10) {
      errs.maxDisplayWaitingMinutes = 'Must be at least 10 minutes';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Clinic settings updated successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const isAdmin = user?.role === 'admin';

  return (
    <div className="fade-in" style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
          Clinic Settings
        </h1>
        <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', marginTop: 2 }}>
          Configure queue behavior, consultation duration, and operating policies.
        </p>
      </div>

      {!isAdmin && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--color-warning-light)',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            color: '#92400e',
            marginBottom: 20,
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShieldAlert size={18} />
          <span>You have view-only access. Only administrator accounts can modify clinic settings.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="General Clinic Details" subtitle="Displayed across patient tickets, display boards, and status screens." />
          <CardBody>
            <FormField label="Clinic Name" required error={errors.clinicName} id="set-clinic-name">
              <input
                id="set-clinic-name"
                type="text"
                value={form.clinicName}
                onChange={(e) => setForm((p) => ({ ...p, clinicName: e.target.value }))}
                style={inputStyle(!!errors.clinicName)}
                disabled={!isAdmin}
                placeholder="e.g. City Health Family Clinic"
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Opening Time" id="set-open-time">
                <input
                  id="set-open-time"
                  type="time"
                  value={form.openingHours.open}
                  onChange={(e) => setForm((p) => ({ ...p, openingHours: { ...p.openingHours, open: e.target.value } }))}
                  style={inputStyle(false)}
                  disabled={!isAdmin}
                />
              </FormField>
              <FormField label="Closing Time" id="set-close-time">
                <input
                  id="set-close-time"
                  type="time"
                  value={form.openingHours.close}
                  onChange={(e) => setForm((p) => ({ ...p, openingHours: { ...p.openingHours, close: e.target.value } }))}
                  style={inputStyle(false)}
                  disabled={!isAdmin}
                />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Queue & Waiting Time Policy" subtitle="Controls how waiting times are estimated and how patients are sequenced." />
          <CardBody>
            <FormField
              label="Average Consultation Duration (minutes)"
              required
              error={errors.averageServiceDurationMinutes}
              id="set-duration"
              hint="Used as base unit in the waiting time estimation formula: Remaining consultation time + sum(patients ahead)."
            >
              <input
                id="set-duration"
                type="number"
                value={form.averageServiceDurationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, averageServiceDurationMinutes: Number(e.target.value) }))}
                style={inputStyle(!!errors.averageServiceDurationMinutes)}
                disabled={!isAdmin}
                min={1}
                max={120}
              />
            </FormField>

            <FormField
              label="Default Queue Policy"
              required
              id="set-policy"
              hint="Determines how upcoming appointments and walk-in arrivals are prioritized in the waiting list."
            >
              <select
                id="set-policy"
                value={form.queuePolicy}
                onChange={(e) => setForm((p) => ({ ...p, queuePolicy: e.target.value }))}
                style={inputStyle(false)}
                disabled={!isAdmin}
              >
                {QUEUE_POLICIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField
                label="Consultation Rooms"
                required
                error={errors.consultationRooms}
                id="set-rooms"
                hint="Number of simultaneous active consultations supported."
              >
                <input
                  id="set-rooms"
                  type="number"
                  value={form.consultationRooms}
                  onChange={(e) => setForm((p) => ({ ...p, consultationRooms: Number(e.target.value) }))}
                  style={inputStyle(!!errors.consultationRooms)}
                  disabled={!isAdmin}
                  min={1}
                  max={10}
                />
              </FormField>

              <FormField
                label="Max Waiting Time Display (minutes)"
                required
                error={errors.maxDisplayWaitingMinutes}
                id="set-max-wait"
                hint="Caps the displayed waiting time to avoid discouraging extreme estimates."
              >
                <input
                  id="set-max-wait"
                  type="number"
                  value={form.maxDisplayWaitingMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, maxDisplayWaitingMinutes: Number(e.target.value) }))}
                  style={inputStyle(!!errors.maxDisplayWaitingMinutes)}
                  disabled={!isAdmin}
                  min={10}
                  max={480}
                />
              </FormField>
            </div>
          </CardBody>
        </Card>

        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button type="submit" loading={saving} icon={<Save size={16} />}>
              Save Settings
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default SettingsPage;
