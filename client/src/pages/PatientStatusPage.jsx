import React, { useState, useEffect } from 'react';
import { Activity, Clock, Users, Search, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { formatWaitTime, getTodayStr, getApiErrorMessage } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import FormField, { inputStyle } from '../components/FormField';
import StatusBadge from '../components/StatusBadge';

const PatientStatusPage = () => {
  const [queueNumber, setQueueNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/patient-status/overview');
      setOverview(res.data.data);
    } catch {
      // overview is non-blocking
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    if (!queueNumber.trim()) {
      setError('Please enter your queue number');
      return;
    }
    if (!accessCode.trim()) {
      setError('Please enter your 6-character access code');
      return;
    }
    setError('');
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/patient-status/${queueNumber.trim()}`, {
        params: { code: accessCode.trim().toUpperCase(), date: getTodayStr() }
      });
      setPatientData(res.data.data);
    } catch (err) {
      setPatientData(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal))',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(14,165,233,0.25)',
            }}
          >
            <Activity size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
            {overview?.clinicName || 'ClinicQueue Lite'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-slate)', marginTop: 4 }}>
            Live Patient Queue & Waiting Time Status
          </p>
        </div>

        {/* Public Clinic Overview Card */}
        {overview && (
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--color-border)',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', fontWeight: 600, textTransform: 'uppercase' }}>Currently Serving</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: 4 }}>
                {overview.currentlyServing?.length > 0 ? `#${overview.currentlyServing.join(', #')}` : 'None'}
              </div>
            </div>
            <div style={{ width: 1, background: 'var(--color-border)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', fontWeight: 600, textTransform: 'uppercase' }}>In Waiting Queue</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: 4 }}>
                {overview.waitingCount ?? 0}
              </div>
            </div>
          </div>
        )}

        {/* Status Lookup Form */}
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Check Your Queue Status" subtitle="Enter the details printed on your queue slip or walk-in confirmation." />
          <CardBody>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-danger-light)',
                  color: '#991b1b',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  marginBottom: 16,
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLookup} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Queue Number" required id="p-queue-no">
                  <input
                    id="p-queue-no"
                    type="number"
                    value={queueNumber}
                    onChange={(e) => setQueueNumber(e.target.value)}
                    placeholder="e.g. 5"
                    style={inputStyle(false)}
                    min={1}
                  />
                </FormField>
                <FormField label="Access Code" required id="p-access-code" hint="6-char code">
                  <input
                    id="p-access-code"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 4F9B2C"
                    style={{ ...inputStyle(false), textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    maxLength={6}
                  />
                </FormField>
              </div>

              <Button type="submit" loading={loading} icon={<Search size={15} />} style={{ width: '100%', marginTop: 8 }}>
                Check Status
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Patient Status Result */}
        {patientData && (
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid var(--color-primary-light)',
              marginBottom: 20,
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Queue Number</span>
                <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1, marginTop: 4 }}>
                  #{patientData.queueNumber}
                </div>
              </div>
              <StatusBadge status={patientData.status} size="lg" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'var(--color-bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-slate)', fontSize: '0.75rem' }}>
                  <Users size={14} /> Patients Ahead
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: 4 }}>
                  {patientData.status === 'waiting' ? patientData.patientsAhead : '—'}
                </div>
              </div>

              <div style={{ background: 'var(--color-bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-slate)', fontSize: '0.75rem' }}>
                  <Clock size={14} /> Est. Waiting Time
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: 4 }}>
                  {patientData.status === 'waiting' ? formatWaitTime(patientData.estimatedWaitingMinutes) : '—'}
                </div>
              </div>
            </div>

            {patientData.status === 'in-consultation' && (
              <div style={{ padding: '12px 16px', background: 'var(--color-info-light)', borderRadius: 'var(--radius)', color: 'var(--color-info)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} /> Please proceed to the consultation room!
              </div>
            )}

            {patientData.status === 'skipped' && (
              <div style={{ padding: '12px 16px', background: 'var(--color-purple-light)', borderRadius: 'var(--radius)', color: 'var(--color-purple)', fontWeight: 600, fontSize: '0.875rem', marginBottom: 16 }}>
                Your turn was skipped. Please approach the clinic reception counter.
              </div>
            )}

            <button
              onClick={() => handleLookup()}
              style={{
                width: '100%',
                padding: '8px',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                color: 'var(--color-slate)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} /> Refresh My Status
            </button>
          </div>
        )}

        {/* Disclaimer Notice */}
        <div
          style={{
            padding: '12px 16px',
            background: 'white',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.75rem',
            color: 'var(--color-slate)',
            lineHeight: 1.5,
          }}
        >
          <strong>Notice:</strong> Waiting times are estimates based on active queue volume and average consultation length. Actual waiting times may vary based on clinical needs. This service provides operational queue status only and does not provide medical triage or advice.
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem' }}>
          <a href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Clinic Staff Login →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PatientStatusPage;
