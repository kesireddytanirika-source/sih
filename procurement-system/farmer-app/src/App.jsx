import React, { useState, useEffect } from 'react';
import {
  Sprout, ChevronRight, CheckCircle2, Clock, ArrowLeft, Plus, User, Phone,
  MapPin, Wheat, AlertCircle, LogOut, Warehouse, RefreshCw, Home as HomeIcon,
  CalendarPlus, ClipboardList, Ticket, QrCode
} from 'lucide-react';
import { apiFetch } from './api.js';
import ChatWidget from './ChatWidget.jsx';
import { LangContext, useLang, LanguageSwitcher, STATUS_KEY, translate as translateWith } from './i18n.jsx';

const CROPS = ['Paddy', 'Cotton', 'Maize', 'Turmeric', 'Chilli', 'Groundnut'];
const SLOTS = ['6:00 – 9:00 AM', '9:00 – 12:00 PM', '12:00 – 3:00 PM', '3:00 – 6:00 PM'];

// The six stages a booking moves through. Order matters — it drives the
// timeline and progress bar. Only the centre app can ever change this;
// the farmer app only ever reads and displays it.
const STATUS_FLOW = [
  'Appointment Booked', 'Checked In at Centre', 'Quality Inspection',
  'Weighing Complete', 'Payment Processing', 'Payment Completed',
];
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
function nextDays(n) {
  const out = []; const now = new Date();
  for (let i = 0; i < n; i++) { const d = new Date(now); d.setDate(now.getDate() + i); out.push(d.toISOString().slice(0, 10)); }
  return out;
}
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function StatusPill({ status }) {
  const { t } = useLang();
  const label = STATUS_KEY[status] ? t(STATUS_KEY[status]) : status;
  return <span className="pill" style={{ '--pill-color': STATUS_COLOR[status] || '#33513C' }}>{label}</span>;
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

const TABS = [
  { id: 'home', labelKey: 'nav_home', icon: HomeIcon },
  { id: 'booking', labelKey: 'nav_booking', icon: CalendarPlus },
  { id: 'status', labelKey: 'nav_status', icon: ClipboardList },
  { id: 'queue', labelKey: 'nav_queue', icon: Ticket },
];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('farmer_token'));
  const [farmer, setFarmer] = useState(() => {
    const raw = localStorage.getItem('farmer_profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [lang, setLang] = useState(() => localStorage.getItem('farmer_lang') || 'en');
  useEffect(() => { localStorage.setItem('farmer_lang', lang); }, [lang]);
  const t = (key, vars) => translateWith(lang, key, vars);

  // Which bottom-nav tab is active.
  const [tab, setTab] = useState('home');
  const [error, setError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [centres, setCentres] = useState([]);
  const [draft, setDraft] = useState({});
  // Step within the Booking tab's own flow.
  const [bookingStep, setBookingStep] = useState('addCrop');
  const [justBookedId, setJustBookedId] = useState(null);
  // Which appointment is open on the Status tab (null = list view).
  const [statusApptId, setStatusApptId] = useState(null);
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
    setToken(null); setFarmer(null); setTab('home'); setAppointments([]); setDraft({});
    setBookingStep('addCrop'); setJustBookedId(null); setStatusApptId(null);
  };

  // Nav bar always starts the booking tab at a fresh booking.
  const goToBooking = async () => {
    setDraft({}); setJustBookedId(null); setBookingStep('addCrop');
    await loadCentres();
    setTab('booking');
  };
  const openStatus = (apptId) => { setStatusApptId(apptId); setTab('status'); };

  if (!authed) return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <AuthScreen onAuthed={(tok, f) => {
        localStorage.setItem('farmer_token', tok); localStorage.setItem('farmer_profile', JSON.stringify(f));
        setToken(tok); setFarmer(f);
      }} />
    </LangContext.Provider>
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
    <div className="app-shell has-bottom-nav">
      <header className="topbar">
        <div className="brand"><Wheat size={20} /><span>Kisan Setu <em>{t('brand_tagline')}</em></span></div>
        <div className="who">
          <LanguageSwitcher compact />
          <span>{farmer.name}</span>
          <button onClick={logout} className="logout-btn"><LogOut size={15} /> {t('logout')}</button>
        </div>
      </header>

      {error && <div className="banner-error"><AlertCircle size={14} /> {error} <button onClick={() => setError('')}>×</button></div>}

      {tab === 'home' && (
        <HomeTab
          farmer={farmer}
          appointments={appointments}
          onBookNew={goToBooking}
          onOpenStatus={openStatus}
          onViewAllStatus={() => { setStatusApptId(null); setTab('status'); }}
          onViewQueue={() => setTab('queue')}
        />
      )}

      {tab === 'booking' && (
        <BookingTab
          token={token}
          draft={draft}
          setDraft={setDraft}
          centres={centres}
          loadCentres={loadCentres}
          step={bookingStep}
          setStep={setBookingStep}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          justBookedId={justBookedId}
          setJustBookedId={setJustBookedId}
          onBooked={loadAppointments}
          onTrackBooking={(id) => openStatus(id)}
          onBookAnother={() => { setDraft({}); setJustBookedId(null); setBookingStep('addCrop'); }}
        />
      )}

      {tab === 'status' && (
        statusApptId
          ? <StatusDetail id={statusApptId} token={token} onBack={() => setStatusApptId(null)} />
          : <StatusList appointments={appointments} onSelect={(id) => setStatusApptId(id)} onBookNew={goToBooking} />
      )}

      {tab === 'queue' && <LiveQueueTab token={token} />}

      <nav className="bottom-nav">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            className={'bottom-nav-btn' + (tab === id ? ' active' : '')}
            onClick={() => {
              if (id === 'booking') goToBooking();
              else if (id === 'status') { setStatusApptId(null); setTab('status'); }
              else setTab(id);
            }}
          >
            <Icon size={19} />
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </nav>

      <ChatWidget token={token} lang={lang} />
    </div>
    </LangContext.Provider>
  );
}

function HomeTab({ farmer, appointments, onBookNew, onOpenStatus, onViewAllStatus, onViewQueue }) {
  const { t } = useLang();
  const recent = appointments.filter(a => a.status !== 'Rejected' && a.status !== 'No Show').slice(0, 3);
  const activeCount = appointments.filter(a => !CLOSED_STATUSES.includes(a.status)).length;

  return (
    <Screen title={t('home_greeting', { name: farmer.name })} sub={t('home_sub')}>
      <div className="profile-card">
        <User size={16} /> {farmer.name} &nbsp;•&nbsp; <Phone size={14} /> {farmer.phone}
        {farmer.village && <> &nbsp;•&nbsp; <MapPin size={14} /> {farmer.village}</>}
      </div>

      <div className="stat-grid-2">
        <button className="home-stat" onClick={onViewAllStatus}>
          <span className="home-stat-value">{appointments.length}</span>
          <span className="home-stat-label">{t('total_bookings')}</span>
        </button>
        <button className="home-stat" onClick={onViewQueue}>
          <span className="home-stat-value">{activeCount}</span>
          <span className="home-stat-label">{t('currently_active')}</span>
        </button>
      </div>

      <button className="primary-btn wide" onClick={onBookNew}>
        <Plus size={16} /> {t('book_new_slot')}
      </button>

      <h3 className="section-label">{t('recent_bookings')}</h3>
      {appointments.length === 0 && <EmptyState text={t('no_bookings_yet')} />}
      <div className="appt-list">
        {recent.map(a => (
          <button key={a.id} className="appt-row" style={{ '--pill-color': STATUS_COLOR[a.status] }} onClick={() => onOpenStatus(a.id)}>
            <div className="appt-token">{a.token}</div>
            <div className="appt-mid">
              <strong>{a.crop_type}</strong> · {a.crop_qty} qtl
              <div className="muted">{a.centre_name} · {fmtDate(a.slot_date)} · {a.slot_time}</div>
            </div>
            <StatusPill status={a.status} />
          </button>
        ))}
      </div>
      {appointments.length > 3 && (
        <button className="ghost-btn wide" onClick={onViewAllStatus}>{t('see_all_bookings')} <ChevronRight size={16} /></button>
      )}
    </Screen>
  );
}

function BookingTab({
  token, draft, setDraft, centres, loadCentres, step, setStep, loading, setLoading,
  setError, justBookedId, setJustBookedId, onBooked, onTrackBooking, onBookAnother,
}) {
  const { t } = useLang();
  useEffect(() => { if (centres.length === 0) loadCentres(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'addCrop') {
    return (
      <Screen title={t('add_crop_title')} sub={t('step_of', { n: 1 })}>
        <CropForm initial={draft.crop} onNext={(crop) => { setDraft(d => ({ ...d, crop })); setStep('selectCentre'); }} />
      </Screen>
    );
  }

  if (step === 'selectCentre') {
    return (
      <Screen title={t('select_centre_title')} sub={t('step_of', { n: 2 })} onBack={() => setStep('addCrop')}>
        <div className="centre-list">
          {centres.map(c => (
            <button key={c.id} className="centre-pick" onClick={() => { setDraft(d => ({ ...d, centreId: c.id, centreName: c.name, capacityPerSlot: c.capacityPerSlot })); setStep('selectSlot'); }}>
              <Warehouse size={20} />
              <div><strong>{c.name}</strong><div className="muted"><MapPin size={13} /> {c.location}</div></div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </Screen>
    );
  }

  if (step === 'selectSlot') {
    return (
      <Screen title={t('select_slot_title')} sub={t('step_of', { n: 3 })} onBack={() => setStep('selectCentre')}>
        <SlotPicker draft={draft} token={token} onPick={(slotDate, slotTime) => { setDraft(d => ({ ...d, slotDate, slotTime })); setStep('confirm'); }} />
      </Screen>
    );
  }

  if (step === 'confirm') {
    return (
      <Screen title={t('confirm_booking_title')} sub={t('step_of', { n: 4 })} onBack={() => setStep('selectSlot')}>
        <div className="confirm-card">
          <Row label={t('crop_row_label')} value={`${draft.crop?.type} — ${draft.crop?.qty} quintals, grade ${draft.crop?.grade}`} />
          <Row label={t('centre_row_label')} value={draft.centreName} />
          <Row label={t('date_row_label')} value={fmtDate(draft.slotDate)} />
          <Row label={t('slot_row_label')} value={draft.slotTime} />
        </div>
        <button className="primary-btn wide" disabled={loading} onClick={async () => {
          setLoading(true); setError('');
          try {
            const res = await apiFetch('/farmer/appointments', {
              method: 'POST', token,
              body: { centreId: draft.centreId, cropType: draft.crop.type, cropQty: draft.crop.qty, cropGrade: draft.crop.grade, slotDate: draft.slotDate, slotTime: draft.slotTime },
            });
            await onBooked();
            setJustBookedId(res.id);
            setStep('token');
          } catch (e) { setError(e.message); }
          setLoading(false);
        }}>{loading ? t('booking_in_progress') : <>{t('confirm_btn')} <ChevronRight size={16} /></>}</button>
      </Screen>
    );
  }

  // step === 'token'
  return (
    <BookingResult
      id={justBookedId}
      token={token}
      onTrack={() => onTrackBooking(justBookedId)}
      onBookAnother={onBookAnother}
    />
  );
}

// A small deterministic pixel-pattern derived from the token, purely as a
// visual "fingerprint" for the e-token card — not a scannable barcode.
function tokenPattern(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
  const cells = [];
  for (let i = 0; i < 49; i++) { cells.push((h >> (i % 24)) & 1); h = (h * 1103515245 + 12345) >>> 0; }
  return cells;
}

function ETokenCard({ appt }) {
  const { t } = useLang();
  const pattern = tokenPattern(appt.token);
  return (
    <div className="etoken-card">
      <div className="etoken-head">
        <QrCode size={16} /> <span>{t('your_e_token')}</span>
      </div>
      <div className="etoken-body">
        <div className="etoken-pattern" aria-hidden="true">
          {pattern.map((on, i) => <span key={i} className={on ? 'cell on' : 'cell'} />)}
        </div>
        <div className="etoken-info">
          <span className="etoken-number">{appt.token}</span>
          <span className="etoken-sub">{appt.centre_name} · {fmtDate(appt.slot_date)} · {appt.slot_time}</span>
          <div className="etoken-live"><span className="live-dot" /> {t('live_status_note')}: <StatusPill status={appt.status} /></div>
        </div>
      </div>
    </div>
  );
}

function BookingResult({ id, token, onTrack, onBookAnother }) {
  const { t } = useLang();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/farmer/appointments/${id}`, { token }).then(setAppt).finally(() => setLoading(false));
    // Poll so the e-token card reflects the centre's latest status right away.
    const timer = setInterval(() => {
      apiFetch(`/farmer/appointments/${id}`, { token }).then(setAppt).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [id]);

  if (loading) return <Screen title={t('loading')}><RefreshCw size={18} className="spin" /></Screen>;
  if (!appt) return <Screen title={t('not_found')}><EmptyState text={t('booking_not_found')} /></Screen>;

  return (
    <Screen title={t('youre_booked')}>
      <ETokenCard appt={appt} />
      <button className="primary-btn wide" onClick={onTrack}>{t('track_status_btn')} <ChevronRight size={16} /></button>
      <button className="ghost-btn wide" onClick={onBookAnother}><Plus size={15} /> {t('book_another_btn')}</button>
    </Screen>
  );
}

function StatusList({ appointments, onSelect, onBookNew }) {
  const { t } = useLang();
  return (
    <Screen title={t('procurement_status_title')} sub={t('all_bookings_sub')}>
      {appointments.length === 0 && <EmptyState text={t('no_bookings_yet')} />}
      <div className="appt-list">
        {appointments.map(a => (
          <button key={a.id} className="appt-row" style={{ '--pill-color': STATUS_COLOR[a.status] }} onClick={() => onSelect(a.id)}>
            <div className="appt-token">{a.token}</div>
            <div className="appt-mid">
              <strong>{a.crop_type}</strong> · {a.crop_qty} qtl
              <div className="muted">{a.centre_name} · {fmtDate(a.slot_date)} · {a.slot_time}</div>
            </div>
            <StatusPill status={a.status} />
          </button>
        ))}
      </div>
      {appointments.length === 0 && (
        <button className="primary-btn wide" onClick={onBookNew}><Plus size={16} /> {t('book_new_slot')}</button>
      )}
    </Screen>
  );
}

function StatusDetail({ id, token, onBack }) {
  const { t } = useLang();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); apiFetch(`/farmer/appointments/${id}`, { token }).then(setAppt).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [id]);

  if (loading) return <Screen title={t('loading')} onBack={onBack}><RefreshCw size={18} className="spin" /></Screen>;
  if (!appt) return <Screen title={t('not_found')} onBack={onBack}><EmptyState text={t('booking_not_found')} /></Screen>;

  const stepIndex = STATUS_FLOW.indexOf(appt.status);
  const isClosedException = appt.status === 'Rejected' || appt.status === 'No Show';

  return (
    <Screen title={t('procurement_status_title')} onBack={onBack}>
      <div className="token-stub small"><span className="stub-number">{appt.token}</span><StatusPill status={appt.status} /></div>

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

      <div className="confirm-card">
        <Row label={t('crop_row_label')} value={`${appt.crop_type} — ${appt.crop_qty} qtl, grade ${appt.crop_grade}`} />
        <Row label={t('centre_row_label')} value={appt.centre_name} />
        <Row label={t('slot_row_label')} value={`${fmtDate(appt.slot_date)} · ${appt.slot_time}`} />
        {appt.procurement && (
          <>
            <Row label={t('weighed_qty_label')} value={`${appt.procurement.qty} qtl`} />
            <Row label={t('rate_label')} value={`₹${appt.procurement.price} / qtl`} />
            <Row label={t('total_payable_label')} value={`₹${(appt.procurement.qty * appt.procurement.price).toLocaleString('en-IN')}`} />
          </>
        )}
      </div>
      <p className="muted" style={{ marginTop: 4 }}>{t('status_note')}</p>
      <h3 className="section-label">{t('timeline_label')}</h3>
      <div className="timeline">
        {appt.history.map((h, i) => (
          <div key={i} className="tl-item">
            <span className="tl-dot" style={{ '--dot-color': STATUS_COLOR[h.status] }} />
            <div><strong>{STATUS_KEY[h.status] ? t(STATUS_KEY[h.status]) : h.status}</strong><div className="muted">{new Date(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{h.note ? ` · ${h.note}` : ''}</div></div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function LiveQueueTab({ token }) {
  const { t } = useLang();
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    apiFetch('/farmer/live-queue', { token }).then((q) => { setQueue(q); setError(''); }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000); // auto-refresh so the position stays current
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title={t('live_queue_title')} sub={t('live_queue_sub')}>
      <button className="ghost-btn wide" onClick={load}><RefreshCw size={15} /> {t('refresh_btn')}</button>
      {error && <div className="error" style={{ marginTop: 10 }}><AlertCircle size={14} /> {error}</div>}
      {queue === null && !error && <EmptyState text={t('loading')} />}
      {queue && queue.length === 0 && <EmptyState text={t('no_active_bookings')} />}
      {queue && queue.length > 0 && (
        <div className="queue-list">
          {queue.map(q => {
            const ahead = q.peopleAhead ?? Math.max(0, q.position - 1);
            return (
              <div key={q.id} className="queue-card" style={{ '--pill-color': STATUS_COLOR[q.status] }}>
                <div className="queue-card-head">
                  <span className="appt-token">{q.token}</span>
                  <StatusPill status={q.status} />
                </div>
                <div className="muted">{q.centreName} · {fmtDate(q.slotDate)} · {q.slotTime}</div>
                <div className="queue-position">
                  <span className="queue-position-num">{q.position}</span>
                  <span className="muted"> {t('in_queue_today_suffix', { total: q.totalInQueue })}</span>
                </div>
                <div className={ahead === 0 ? 'queue-ahead-badge next' : 'queue-ahead-badge'}>
                  {ahead === 0 ? t('queue_next_up') : t('people_ahead_label', { count: ahead })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}

function AuthScreen({ onAuthed }) {
  const { t } = useLang();
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
      <header className="topbar">
        <div className="brand"><Wheat size={20} /><span>Kisan Setu <em>{t('brand_tagline')}</em></span></div>
        <LanguageSwitcher compact />
      </header>
      <Screen title={mode === 'login' ? t('login_title') : t('register_title')} sub={t('auth_sub')}>
        <div className="tab-row">
          <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>{t('login_tab')}</button>
          <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>{t('register_tab')}</button>
        </div>
        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <label>{t('full_name_label')}<input value={name} onChange={e => setName(e.target.value)} placeholder={t('full_name_placeholder')} required /></label>
          )}
          <label>{t('phone_label')}<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder={t('phone_placeholder')} maxLength={10} required /></label>
          {mode === 'register' && (
            <label>{t('village_label')} <span className="optional">{t('optional_suffix')}</span><input value={village} onChange={e => setVillage(e.target.value)} placeholder={t('village_placeholder')} /></label>
          )}
          <label>{t('password_label')}<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password_placeholder')} required /></label>
          {error && <div className="error"><AlertCircle size={14} /> {error}</div>}
          <button className="primary-btn wide" type="submit" disabled={loading}>
            {loading ? t('please_wait') : <>{mode === 'login' ? t('login_tab') : t('create_account_btn')} <ChevronRight size={16} /></>}
          </button>
        </form>
      </Screen>
    </div>
  );
}

function CropForm({ initial, onNext }) {
  const { t } = useLang();
  const [type, setType] = useState(initial?.type || CROPS[0]);
  const [qty, setQty] = useState(initial?.qty || '');
  const [grade, setGrade] = useState(initial?.grade || 'A');
  const submit = (e) => { e.preventDefault(); if (!qty || Number(qty) <= 0) return; onNext({ type, qty: Number(qty), grade }); };
  return (
    <form className="form" onSubmit={submit}>
      <label>{t('crop_type_label')}<select value={type} onChange={e => setType(e.target.value)}>{CROPS.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label>{t('quantity_label')}<input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 25" /></label>
      <label>{t('grade_label')}<select value={grade} onChange={e => setGrade(e.target.value)}>
        <option value="A">{t('grade_a')}</option><option value="B">{t('grade_b')}</option><option value="C">{t('grade_c')}</option>
      </select></label>
      <button className="primary-btn wide" type="submit">{t('next_select_centre')} <ChevronRight size={16} /></button>
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




