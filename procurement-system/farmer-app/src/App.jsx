import React, { useState, useEffect } from 'react';
import {
  Sprout, ChevronRight, CheckCircle2, Clock, ArrowLeft, Plus, User, Phone,
  MapPin, Wheat, AlertCircle, LogOut, Warehouse, RefreshCw
} from 'lucide-react';
import { apiFetch } from './api.js';
import ChatWidget from './ChatWidget.jsx';

const CROPS = ['Paddy', 'Cotton', 'Maize', 'Turmeric', 'Chilli', 'Groundnut'];
const SLOTS = ['6:00 – 9:00 AM', '9:00 – 12:00 PM', '12:00 – 3:00 PM', '3:00 – 6:00 PM'];

const STATUS_COLOR = {
  Booked: '#8A7A46', Confirmed: '#33513C', 'In Queue': '#B98A2E',
  Procured: '#2E6B3E', Rejected: '#A34D2C', 'No Show': '#7A6A55',
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nextDays(n) {
  const out = []; const now = new Date();
  for (let i = 0; i < n; i++) { const d = new Date(now); d.setDate(now.getDate() + i); out.push(d.toISOString().slice(0, 10)); }
  return out;
}
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function StatusPill({ status }) {
  return <span className="pill" style={{ '--pill-color': STATUS_COLOR[status] || '#33513C' }}>{status}</span>;
}
function Row({ label, value }) {
  return <div className="info-row"><span className="muted">{label}</span><span>{value}</span></div>;
}
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
  const [token, setToken] = useState(() => localStorage.getItem('farmer_token'));
  const [farmer, setFarmer] = useState(() => {
    const raw = localStorage.getItem('farmer_profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState('home');
  const [error, setError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [centres, setCentres] = useState([]);
  const [draft, setDraft] = useState({});
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [loading, setLoading] = useState(false);

  const authed = Boolean(token && farmer);

  useEffect(() => { if (authed) loadAppointments(); }, [authed]);

  const loadAppointments = async () => {
    try { setAppointments(await apiFetch('/farmer/appointments', { token })); }
    catch (e) { handleAuthError(e); }
  };
  const loadCentres = async () => {
    try { setCentres(await apiFetch('/farmer/centres', { token })); }
    catch (e) { handleAuthError(e); }
  };
  const handleAuthError = (e) => {
    if (String(e.message).toLowerCase().includes('session') || String(e.message).toLowerCase().includes('token')) logout();
    else setError(e.message);
  };

  const logout = () => {
    localStorage.removeItem('farmer_token'); localStorage.removeItem('farmer_profile');
    setToken(null); setFarmer(null); setView('home'); setAppointments([]); setDraft({});
  };

  if (!authed) return <AuthScreen onAuthed={(t, f) => {
    localStorage.setItem('farmer_token', t); localStorage.setItem('farmer_profile', JSON.stringify(f));
    setToken(t); setFarmer(f);
  }} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><Wheat size={20} /><span>Kisan Setu <em>Farmer</em></span></div>
        <div className="who"><span>{farmer.name}</span><button onClick={logout} className="logout-btn"><LogOut size={15} /> Log out</button></div>
      </header>

      {error && <div className="banner-error"><AlertCircle size={14} /> {error} <button onClick={() => setError('')}>×</button></div>}

      {view === 'home' && (
        <Screen title={`Namaste, ${farmer.name}`} sub="Your profile and bookings only — no other farmer's data is visible here.">
          <div className="profile-card">
            <User size={16} /> {farmer.name} &nbsp;•&nbsp; <Phone size={14} /> {farmer.phone}
            {farmer.village && <> &nbsp;•&nbsp; <MapPin size={14} /> {farmer.village}</>}
          </div>
          <button className="primary-btn wide" onClick={async () => { setDraft({}); await loadCentres(); setView('addCrop'); }}>
            <Plus size={16} /> Book a new procurement slot
          </button>
          <h3 className="section-label">Your bookings</h3>
          {appointments.length === 0 && <EmptyState text="No bookings yet. Add a crop to get your first token." />}
          <div className="appt-list">
            {appointments.map(a => (
              <button key={a.id} className="appt-row" onClick={() => { setSelectedAppt(a.id); setView('status'); }}>
                <div className="appt-token">{a.token}</div>
                <div className="appt-mid">
                  <strong>{a.crop_type}</strong> · {a.crop_qty} qtl
                  <div className="muted">{a.centre_name} · {fmtDate(a.slot_date)} · {a.slot_time}</div>
                </div>
                <StatusPill status={a.status} />
              </button>
            ))}
          </div>
        </Screen>
      )}

      {view === 'addCrop' && (
        <Screen title="Add your crop" sub="Step 1 of 4" onBack={() => setView('home')}>
          <CropForm initial={draft.crop} onNext={(crop) => { setDraft(d => ({ ...d, crop })); setView('selectCentre'); }} />
        </Screen>
      )}

      {view === 'selectCentre' && (
        <Screen title="Select a centre" sub="Step 2 of 4" onBack={() => setView('addCrop')}>
          <div className="centre-list">
            {centres.map(c => (
              <button key={c.id} className="centre-pick" onClick={() => { setDraft(d => ({ ...d, centreId: c.id, centreName: c.name, capacityPerSlot: c.capacityPerSlot })); setView('selectSlot'); }}>
                <Warehouse size={20} />
                <div><strong>{c.name}</strong><div className="muted"><MapPin size={13} /> {c.location}</div></div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Screen>
      )}

      {view === 'selectSlot' && (
        <Screen title="Select date & slot" sub="Step 3 of 4" onBack={() => setView('selectCentre')}>
          <SlotPicker draft={draft} token={token} onPick={(slotDate, slotTime) => { setDraft(d => ({ ...d, slotDate, slotTime })); setView('confirm'); }} />
        </Screen>
      )}

      {view === 'confirm' && (
        <Screen title="Confirm booking" sub="Step 4 of 4" onBack={() => setView('selectSlot')}>
          <div className="confirm-card">
            <Row label="Crop" value={`${draft.crop?.type} — ${draft.crop?.qty} quintals, grade ${draft.crop?.grade}`} />
            <Row label="Centre" value={draft.centreName} />
            <Row label="Date" value={fmtDate(draft.slotDate)} />
            <Row label="Slot" value={draft.slotTime} />
          </div>
          <button className="primary-btn wide" disabled={loading} onClick={async () => {
            setLoading(true); setError('');
            try {
              const res = await apiFetch('/farmer/appointments', {
                method: 'POST', token,
                body: { centreId: draft.centreId, cropType: draft.crop.type, cropQty: draft.crop.qty, cropGrade: draft.crop.grade, slotDate: draft.slotDate, slotTime: draft.slotTime },
              });
              await loadAppointments();
              setSelectedAppt(res.id);
              setView('token');
            } catch (e) { setError(e.message); }
            setLoading(false);
          }}>{loading ? 'Booking…' : <>Confirm booking <ChevronRight size={16} /></>}</button>
        </Screen>
      )}

      {(view === 'token' || view === 'status') && (
        <ApptDetail id={selectedAppt} token={token} view={view} setView={setView} onBack={() => setView('home')} />
      )}

      <ChatWidget token={token} />
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiFetch('/auth/farmer/login', { method: 'POST', body: { phone, password } });
        onAuthed(res.token, res.farmer);
      } else {
        const res = await apiFetch('/auth/farmer/register', { method: 'POST', body: { name, phone, password, village } });
        onAuthed(res.token, res.farmer);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand"><Wheat size={20} /><span>Kisan Setu <em>Farmer</em></span></div></header>
      <Screen title={mode === 'login' ? 'Log in' : 'Create your account'} sub="Only your own profile and bookings will ever be visible to you.">
        <div className="tab-row">
          <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>Log in</button>
          <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>New farmer</button>
        </div>
        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ramesh Reddy" required /></label>
          )}
          <label>Phone number<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" maxLength={10} required /></label>
          {mode === 'register' && (
            <label>Village <span className="optional">(optional)</span><input value={village} onChange={e => setVillage(e.target.value)} placeholder="e.g. Ravulapalli" /></label>
          )}
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required /></label>
          {error && <div className="error"><AlertCircle size={14} /> {error}</div>}
          <button className="primary-btn wide" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : <>{mode === 'login' ? 'Log in' : 'Create account'} <ChevronRight size={16} /></>}
          </button>
        </form>
      </Screen>
    </div>
  );
}

function CropForm({ initial, onNext }) {
  const [type, setType] = useState(initial?.type || CROPS[0]);
  const [qty, setQty] = useState(initial?.qty || '');
  const [grade, setGrade] = useState(initial?.grade || 'A');
  const submit = (e) => { e.preventDefault(); if (!qty || Number(qty) <= 0) return; onNext({ type, qty: Number(qty), grade }); };
  return (
    <form className="form" onSubmit={submit}>
      <label>Crop type<select value={type} onChange={e => setType(e.target.value)}>{CROPS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>Quantity (quintals)<input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 25" /></label>
      <label>Grade<select value={grade} onChange={e => setGrade(e.target.value)}>
        <option value="A">A — Premium</option><option value="B">B — Standard</option><option value="C">C — Basic</option>
      </select></label>
      <button className="primary-btn wide" type="submit">Next: select centre <ChevronRight size={16} /></button>
    </form>
  );
}

function SlotPicker({ draft, token, onPick }) {
  const [date, setDate] = useState(todayISO());
  const [avail, setAvail] = useState({ capacityPerSlot: 0, counts: {} });
  const days = nextDays(7);

  useEffect(() => {
    apiFetch(`/farmer/availability?centreId=${draft.centreId}&date=${date}`, { token }).then(setAvail).catch(() => {});
  }, [date, draft.centreId]);

  return (
    <div>
      <div className="day-strip">
        {days.map(d => (
          <button key={d} className={'day-chip' + (d === date ? ' active' : '')} onClick={() => setDate(d)}>
            <span>{fmtDate(d).split(' ')[0]}</span><strong>{fmtDate(d).split(' ')[1]}</strong>
          </button>
        ))}
      </div>
      <div className="slot-list">
        {SLOTS.map(s => {
          const used = avail.counts[s] || 0;
          const full = used >= (avail.capacityPerSlot || draft.capacityPerSlot || 0);
          return (
            <button key={s} disabled={full} className="slot-row" onClick={() => onPick(date, s)}>
              <Clock size={16} /><span className="slot-time">{s}</span>
              <span className="slot-cap">{full ? 'Full' : `${(avail.capacityPerSlot || draft.capacityPerSlot) - used} left`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApptDetail({ id, token, view, setView, onBack }) {
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); apiFetch(`/farmer/appointments/${id}`, { token }).then(setAppt).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Screen title="Loading…" onBack={onBack}><RefreshCw size={18} className="spin" /></Screen>;
  if (!appt) return <Screen title="Not found" onBack={onBack}><EmptyState text="Booking not found." /></Screen>;

  if (view === 'token') {
    return (
      <Screen title="You're booked" onBack={onBack}>
        <div className="token-stub">
          <span className="stub-label">Your token</span>
          <span className="stub-number">{appt.token}</span>
          <span className="stub-sub">{appt.centre_name} · {fmtDate(appt.slot_date)} · {appt.slot_time}</span>
        </div>
        <button className="primary-btn wide" onClick={() => setView('status')}>Track procurement status <ChevronRight size={16} /></button>
        <button className="ghost-btn wide" onClick={onBack}>Back to home</button>
      </Screen>
    );
  }

  return (
    <Screen title="Procurement status" onBack={onBack}>
      <div className="token-stub small"><span className="stub-number">{appt.token}</span><StatusPill status={appt.status} /></div>
      <div className="confirm-card">
        <Row label="Crop" value={`${appt.crop_type} — ${appt.crop_qty} qtl, grade ${appt.crop_grade}`} />
        <Row label="Centre" value={appt.centre_name} />
        <Row label="Slot" value={`${fmtDate(appt.slot_date)} · ${appt.slot_time}`} />
        {appt.procurement && (
          <>
            <Row label="Procured qty" value={`${appt.procurement.qty} qtl`} />
            <Row label="Rate" value={`₹${appt.procurement.price} / qtl`} />
            <Row label="Total payable" value={`₹${(appt.procurement.qty * appt.procurement.price).toLocaleString('en-IN')}`} />
          </>
        )}
      </div>
      <h3 className="section-label">Timeline</h3>
      <div className="timeline">
        {appt.history.map((h, i) => (
          <div key={i} className="tl-item">
            <span className="tl-dot" style={{ '--dot-color': STATUS_COLOR[h.status] }} />
            <div><strong>{h.status}</strong><div className="muted">{new Date(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{h.note ? ` · ${h.note}` : ''}</div></div>
          </div>
        ))}
      </div>
    </Screen>
  );
}
