import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ArrowLeft, CheckCircle2, Ticket, ClipboardList, TrendingUp,
  Users, Package, LogOut, Wheat, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { apiFetch } from './api.js';
import { LangContext, useLang, LanguageSwitcher, STATUS_KEY, translate as translateWith } from './i18n.jsx';

const STATUS_ORDER = [
  'Appointment Booked', 'Checked In at Centre', 'Quality Inspection',
  'Weighing Complete', 'Payment Processing', 'Payment Completed', 'Rejected', 'No Show',
];
// The six controllable stages, in order. This drives the progress bar on the
// update screen. Only this app (centre) is ever allowed to move a booking
// along it — see PATCH /centre/appointments/:id/status on the backend.
const STATUS_FLOW = [
  'Appointment Booked', 'Checked In at Centre', 'Quality Inspection',
  'Weighing Complete', 'Payment Processing', 'Payment Completed',
];
const ACTIVE_STATUSES = ['Appointment Booked', 'Checked In at Centre', 'Quality Inspection', 'Weighing Complete', 'Payment Processing'];
const CLOSED_STATUSES = ['Payment Completed', 'Rejected', 'No Show'];
const STATUS_COLOR = {
  'Appointment Booked': '#8A7A46',
  'Checked In at Centre': '#6E7F9E',
  'Quality Inspection': '#B98A2E',
  'Weighing Complete': '#4E7A66',
  'Payment Processing': '#8A5FA8',
  'Payment Completed': '#2E6B3E',
  Rejected: '#A34D2C',
  'No Show': '#7A6A55',
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
function StatusPill({ status }) {
  const { t } = useLang();
  const label = STATUS_KEY[status] ? t(STATUS_KEY[status]) : status;
  return <span className="pill" style={{ '--pill-color': STATUS_COLOR[status] || '#33513C' }}>{label}</span>;
}
function Row({ label, value }) { return <div className="info-row"><span className="muted">{label}</span><span>{value}</span></div>; }
function EmptyState({ text }) { return <div className="empty-state">{text}</div>; }

function Screen({ children, onBack, title, sub }) {
  return (
    <div className="screen">
      <div className="screen-head">
        {onBack && <button className="back-btn" onClick={onBack}><ArrowLeft size={18} /></button>}
        <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
      </div>
      <div className="screen-body">{children}</div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('centre_token'));
  const [centre, setCentre] = useState(() => {
    const raw = localStorage.getItem('centre_profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState('dashboard');
  const [appts, setAppts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState(() => localStorage.getItem('centre_lang') || 'en');
  useEffect(() => { localStorage.setItem('centre_lang', lang); }, [lang]);
  const t = (key, vars) => translateWith(lang, key, vars);

  const authed = Boolean(token && centre);

  const loadAll = async () => {
    try { setAppts(await apiFetch('/centre/appointments', { token })); }
    catch (e) { handleAuthError(e); }
  };
  const handleAuthError = (e) => {
    if (String(e.message).toLowerCase().includes('session') || String(e.message).toLowerCase().includes('token')) logout();
    else setError(e.message);
  };
  const logout = () => {
    localStorage.removeItem('centre_token'); localStorage.removeItem('centre_profile');
    setToken(null); setCentre(null); setView('dashboard');
  };

  useEffect(() => { if (authed) loadAll(); }, [authed]);

  if (!authed) return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <CentreLogin onAuthed={(tok, c) => {
        localStorage.setItem('centre_token', tok); localStorage.setItem('centre_profile', JSON.stringify(c));
        setToken(tok); setCentre(c);
      }} />
    </LangContext.Provider>
  );

  const today = todayISO();
  const todaysAppts = appts.filter(a => a.slot_date === today).sort((a, b) => a.token.localeCompare(b.token));
  const activeAppts = appts.filter(a => ACTIVE_STATUSES.includes(a.status)).sort((a, b) => a.token.localeCompare(b.token));

  const updateStatus = async (id, status, note) => {
    try { await apiFetch(`/centre/appointments/${id}/status`, { method: 'PATCH', token, body: { status, note } }); await loadAll(); }
    catch (e) { setError(e.message); }
  };
  const procure = async (id, qty, price) => {
    try { await apiFetch(`/centre/appointments/${id}/procure`, { method: 'POST', token, body: { qty, price } }); await loadAll(); setView('queue'); }
    catch (e) { setError(e.message); }
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><Wheat size={20} /><span>Kisan Setu <em>{t('brand_tagline')}</em></span></div>
        <div className="who">
          <LanguageSwitcher compact />
          <span>{centre.name}</span>
          <button onClick={logout} className="logout-btn"><LogOut size={15} /> {t('logout')}</button>
        </div>
      </header>

      {error && <div className="banner-error"><AlertCircle size={14} /> {error} <button onClick={() => setError('')}>×</button></div>}

      {view === 'dashboard' && (
        <Screen title={centre.name} sub={centre.location}>
          <div className="stat-grid">
            <StatCard icon={<ClipboardList size={18} />} label={t('todays_appointments')} value={todaysAppts.length} onClick={() => setView('today')} />
            <StatCard icon={<Ticket size={18} />} label={t('active_in_queue')} value={activeAppts.length} onClick={() => setView('queue')} />
            <StatCard icon={<CheckCircle2 size={18} />} label={t('payments_completed')} value={appts.filter(a => a.status === 'Payment Completed').length} />
            <StatCard icon={<Users size={18} />} label={t('farmers_served')} value={new Set(appts.map(a => a.farmer_phone)).size} />
          </div>
          <div className="nav-grid">
            <button className="nav-card" onClick={() => setView('today')}><ClipboardList size={20} /> {t('todays_appointments')}<ChevronRight size={16} /></button>
            <button className="nav-card" onClick={() => setView('queue')}><Ticket size={20} /> {t('live_queue_nav')}<ChevronRight size={16} /></button>
            <button className="nav-card" onClick={() => setView('analytics')}><TrendingUp size={20} /> {t('analytics_nav')}<ChevronRight size={16} /></button>
          </div>
        </Screen>
      )}

      {view === 'today' && (
        <Screen title={t('todays_appointments')} sub={fmtDate(today)} onBack={() => setView('dashboard')}>
          <AppointmentTable appts={todaysAppts} onSelect={(id) => { setSelectedId(id); setView('update'); }} />
        </Screen>
      )}

      {view === 'queue' && (
        <Screen title={t('live_queue_nav')} sub={t('sorted_by_token')} onBack={() => setView('dashboard')}>
          <AppointmentTable appts={activeAppts} showPosition onSelect={(id) => { setSelectedId(id); setView('update'); }} />
        </Screen>
      )}

      {view === 'update' && (
        <UpdateStatus
          appt={appts.find(a => a.id === selectedId)}
          onBack={() => setView('queue')}
          onStatus={(status, note) => updateStatus(selectedId, status, note)}
          onProcure={(qty, price) => procure(selectedId, qty, price)}
        />
      )}

      {view === 'analytics' && (
        <Screen title={t('analytics_nav')} sub={centre.name} onBack={() => setView('dashboard')}>
          <Analytics appts={appts} />
        </Screen>
      )}
    </div>
    </LangContext.Provider>
  );
}

function CentreLogin({ onAuthed }) {
  const { t } = useLang();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await apiFetch('/auth/centre/login', { method: 'POST', body: { code, password } });
      onAuthed(res.token, res.centre);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><Wheat size={20} /><span>Kisan Setu <em>{t('brand_tagline')}</em></span></div>
        <LanguageSwitcher compact />
      </header>
      <Screen title={t('centre_login_title')} sub={t('centre_login_sub')}>
        <form className="form" onSubmit={submit}>
          <label>{t('centre_code_label')}<input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={t('centre_code_placeholder')} maxLength={5} required /></label>
          <label>{t('pin_label')}<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('pin_placeholder')} required /></label>
          {error && <div className="error"><AlertCircle size={14} /> {error}</div>}
          <button className="primary-btn wide" type="submit" disabled={loading}>{loading ? t('please_wait') : <>{t('enter_dashboard_btn')} <ChevronRight size={16} /></>}</button>
        </form>
      </Screen>
    </div>
  );
}

function StatCard({ icon, label, value, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="stat-card" onClick={onClick}>
      <div className="stat-icon">{icon}</div>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </Tag>
  );
}

function AppointmentTable({ appts, onSelect, showPosition }) {
  const { t } = useLang();
  if (appts.length === 0) return <EmptyState text={t('nothing_here_yet')} />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          {showPosition && <th>{t('col_hash')}</th>}
          <th>{t('col_token')}</th><th>{t('col_farmer')}</th><th>{t('col_crop')}</th><th>{t('col_slot')}</th><th>{t('col_status')}</th>
        </tr></thead>
        <tbody>
          {appts.map((a, i) => (
            <tr key={a.id} onClick={() => onSelect(a.id)}>
              {showPosition && <td className="muted">{i + 1}</td>}
              <td className="mono">{a.token}</td>
              <td><strong>{a.farmer_name}</strong>{a.farmer_village && <div className="muted">{a.farmer_village}</div>}</td>
              <td>{a.crop_type}<div className="muted">{a.crop_qty} qtl · {t('grade_prefix')} {a.crop_grade}</div></td>
              <td>{a.slot_time}</td>
              <td><StatusPill status={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpdateStatus({ appt, onBack, onStatus, onProcure }) {
  const { t } = useLang();
  const [qty, setQty] = useState(appt?.crop_qty || '');
  const [price, setPrice] = useState('');
  if (!appt) return <Screen title={t('not_found')} onBack={onBack}><EmptyState text={t('select_from_queue')} /></Screen>;

  const closed = CLOSED_STATUSES.includes(appt.status);
  const isClosedException = appt.status === 'Rejected' || appt.status === 'No Show';
  const stepIndex = STATUS_FLOW.indexOf(appt.status);

  return (
    <Screen title={`Token ${appt.token}`} sub={appt.farmer_name} onBack={onBack}>
      <div className="confirm-card">
        <Row label={t('farmer_label')} value={`${appt.farmer_name} · ${appt.farmer_village || '—'} · ${appt.farmer_phone}`} />
        <Row label={t('crop_label')} value={`${appt.crop_type} — ${appt.crop_qty} qtl, ${t('grade_prefix')} ${appt.crop_grade}`} />
        <Row label={t('slot_label')} value={`${fmtDate(appt.slot_date)} · ${appt.slot_time}`} />
        <Row label={t('current_status_label')} value={<StatusPill status={appt.status} />} />
      </div>

      {!isClosedException && (
        <div className="progress-track">
          {STATUS_FLOW.map((s, i) => (
            <div key={s} className={'progress-step' + (i <= stepIndex ? ' done' : '')}>
              <span className="progress-dot" style={i <= stepIndex ? { '--dot-color': STATUS_COLOR[s] } : undefined} />
              <span className="progress-label">{t(STATUS_KEY[s])}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="section-label">{t('weighing_details_title')}</h3>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{t('weighing_details_sub')}</p>
      <div className="form">
        <label>{t('quantity_accepted_label')}<input type="number" value={qty} onChange={e => setQty(e.target.value)} /></label>
        <label>{t('rate_label')}<input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 2100" /></label>
      </div>

      <h3 className="section-label">{t('move_status_title')}</h3>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{t('move_status_sub')}</p>
      <div className="status-actions status-actions-stack">
        <button className="status-btn" disabled={appt.status !== 'Appointment Booked'} onClick={() => onStatus('Checked In at Centre', 'Farmer checked in at centre')}>{t('status_checked_in')}</button>
        <button className="status-btn" disabled={appt.status !== 'Checked In at Centre'} onClick={() => onStatus('Quality Inspection', 'Sent for quality inspection')}>{t('status_quality_inspection')}</button>
        <button className="status-btn" disabled={appt.status !== 'Quality Inspection'} onClick={() => onProcure(Number(qty), Number(price))}>{t('status_weighing_complete')}</button>
        <button className="status-btn" disabled={appt.status !== 'Weighing Complete'} onClick={() => onStatus('Payment Processing', 'Payment processing started')}>{t('status_payment_processing')}</button>
        <button className="status-btn" disabled={appt.status !== 'Payment Processing'} onClick={() => onStatus('Payment Completed', 'Payment completed')}>{t('status_payment_completed')}</button>
      </div>

      <h3 className="section-label">{t('exceptions_title')}</h3>
      <div className="status-actions">
        <button className="status-btn warn" disabled={closed} onClick={() => onStatus('No Show', 'Marked no-show')}>{t('no_show_btn')}</button>
        <button className="status-btn danger" disabled={closed} onClick={() => onStatus('Rejected', 'Rejected by centre')}>{t('reject_btn')}</button>
      </div>
    </Screen>
  );
}

function Analytics({ appts }) {
  const { t } = useLang();
  const byStatus = STATUS_ORDER.map(s => ({ name: t(STATUS_KEY[s]), value: appts.filter(a => a.status === s).length })).filter(d => d.value > 0);
  const statusColorByLabel = Object.fromEntries(STATUS_ORDER.map(s => [t(STATUS_KEY[s]), STATUS_COLOR[s]]));
  const byCrop = {};
  appts.filter(a => a.status === 'Payment Completed').forEach(a => { byCrop[a.crop_type] = (byCrop[a.crop_type] || 0) + (a.p_qty || 0); });
  const cropData = Object.entries(byCrop).map(([name, qty]) => ({ name, qty }));
  const totalValue = appts.filter(a => a.status === 'Payment Completed').reduce((sum, a) => sum + (a.p_qty || 0) * (a.p_price || 0), 0);

  if (appts.length === 0) return <EmptyState text={t('no_data_yet')} />;

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon={<Package size={18} />} label={t('total_quintals_procured')} value={Object.values(byCrop).reduce((a, b) => a + b, 0)} />
        <StatCard icon={<TrendingUp size={18} />} label={t('total_value')} value={`₹${totalValue.toLocaleString('en-IN')}`} />
      </div>
      {cropData.length > 0 && (
        <div className="chart-card">
          <h3 className="section-label">{t('procured_qty_by_crop')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cropData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8CFA9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4A4632' }} />
              <YAxis tick={{ fontSize: 12, fill: '#4A4632' }} />
              <Tooltip contentStyle={{ fontFamily: 'inherit', fontSize: 13 }} />
              <Bar dataKey="qty" fill="#33513C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {byStatus.length > 0 && (
        <div className="chart-card">
          <h3 className="section-label">{t('status_mix')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(d) => `${d.name} (${d.value})`}>
                {byStatus.map((d, i) => <Cell key={i} fill={statusColorByLabel[d.name]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
