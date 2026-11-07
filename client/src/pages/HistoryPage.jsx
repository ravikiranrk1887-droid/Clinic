import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Calendar, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { formatDate, formatTime, getTodayStr, getApiErrorMessage } from '../utils/helpers';
import Card, { CardHeader, CardBody } from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { inputStyle } from '../components/FormField';
import { PageLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [queueNumber, setQueueNumber] = useState('');
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 20 };
      if (filterDate) params.date = filterDate;
      if (queueNumber) params.queueNumber = queueNumber;
      if (status) params.status = status;

      const res = await api.get('/history', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: res.data.data.length });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterDate, queueNumber, status, pagination.page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>Queue History</h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', marginTop: 2 }}>
            Historical queue records ({pagination.total} records found)
          </p>
        </div>
        <Button variant="secondary" onClick={fetchHistory} icon={<RefreshCw size={14} />} size="sm">
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 20 }}>
        <CardBody style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="h-date" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate)' }}>Date:</label>
              <input
                id="h-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={inputStyle(false)}
              />
            </div>

            <div style={{ position: 'relative', width: 140 }}>
              <input
                type="number"
                value={queueNumber}
                onChange={(e) => setQueueNumber(e.target.value)}
                placeholder="Queue #"
                style={inputStyle(false)}
                min={1}
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle(false), width: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {(queueNumber || status || filterDate !== getTodayStr()) && (
              <button
                onClick={() => { setQueueNumber(''); setStatus(''); setFilterDate(getTodayStr()); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-slate)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoader />
        ) : records.length === 0 ? (
          <EmptyState
            icon={History}
            title="No history records found"
            description="Try selecting a different date or clearing your filter criteria."
          />
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['Queue #', 'Patient', 'Type', 'Registered', 'Consultation', 'Finished', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item._id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      #{item.queueNumber}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.patientName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999, background: item.entryType === 'appointment' ? 'var(--color-teal-light)' : '#f1f5f9', color: item.entryType === 'appointment' ? 'var(--color-teal)' : 'var(--color-slate)', textTransform: 'capitalize', fontWeight: 600 }}>
                        {item.entryType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-slate)', fontSize: '0.8rem' }}>
                      {formatTime(item.registrationTime)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-slate)', fontSize: '0.8rem' }}>
                      {item.consultationStartTime ? formatTime(item.consultationStartTime) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-slate)', fontSize: '0.8rem' }}>
                      {item.consultationEndTime ? formatTime(item.consultationEndTime) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={item.status} />
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
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: p === pagination.page ? 'var(--color-primary)' : 'white',
                color: p === pagination.page ? 'white' : 'var(--color-navy)',
                fontWeight: p === pagination.page ? 700 : 400,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
