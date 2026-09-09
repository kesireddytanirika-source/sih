import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireRole('farmer'));

// A farmer can only ever query rows WHERE farmer_id = req.user.id.
// That row-level scoping (not just hiding things in the UI) is what
// actually stops one farmer from seeing another farmer's data.

// The full lifecycle a booking moves through. Only the centre app can
// advance a booking along this list (see centreRoutes.js) — the farmer
// app is read-only on status everywhere below.
export const STATUS_FLOW = [
  'Appointment Booked',
  'Checked In at Centre',
  'Quality Inspection',
  'Weighing Complete',
  'Payment Processing',
  'Payment Completed',
];
// Statuses that still occupy a slot / still count as "in the queue".
const ACTIVE_STATUSES = ['Appointment Booked', 'Checked In at Centre', 'Quality Inspection', 'Weighing Complete', 'Payment Processing'];
const CLOSED_STATUSES = ['Payment Completed', 'Rejected', 'No Show'];

router.get('/me', (req, res) => {
  const f = db.prepare('SELECT id, name, phone, village FROM farmers WHERE id = ?').get(req.user.id);
  res.json(f);
});

router.get('/centres', (req, res) => {
  const centres = db.prepare(
    'SELECT id, code, name, location, capacity_per_slot as capacityPerSlot FROM centres ORDER BY name'
  ).all();
  res.json(centres);
});

router.get('/availability', (req, res) => {
  const { centreId, date } = req.query;
  const centre = db.prepare('SELECT * FROM centres WHERE id = ?').get(centreId);
  if (!centre) return res.status(404).json({ error: 'Centre not found' });
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT slot_time, COUNT(*) as count FROM appointments
     WHERE centre_id = ? AND slot_date = ? AND status IN (${placeholders})
     GROUP BY slot_time`
  ).all(centreId, date, ...ACTIVE_STATUSES);
  const counts = Object.fromEntries(rows.map((r) => [r.slot_time, r.count]));
  res.json({ capacityPerSlot: centre.capacity_per_slot, counts });
});

router.post('/appointments', (req, res) => {
  const { centreId, cropType, cropQty, cropGrade, slotDate, slotTime } = req.body || {};
  if (!centreId || !cropType || !cropQty || !slotDate || !slotTime) {
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }
  const centre = db.prepare('SELECT * FROM centres WHERE id = ?').get(centreId);
  if (!centre) return res.status(404).json({ error: 'Centre not found' });

  const activePlaceholders = ACTIVE_STATUSES.map(() => '?').join(',');
  const activeCount = db.prepare(
    `SELECT COUNT(*) as c FROM appointments
     WHERE centre_id=? AND slot_date=? AND slot_time=? AND status IN (${activePlaceholders})`
  ).get(centreId, slotDate, slotTime, ...ACTIVE_STATUSES).c;
  if (activeCount >= centre.capacity_per_slot) {
    return res.status(409).json({ error: 'That slot just filled up. Please pick another.' });
  }

  // Dynamic e-token: centre code + date + a random 4-digit suffix, so
  // tokens aren't sequentially guessable. Retry on the rare collision
  // (the DB's UNIQUE constraint on token is the final backstop either way).
  const genToken = () => {
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `E-${centre.code}-${slotDate.slice(5).replace('-', '')}-${rand}`;
  };
  let token = genToken();
  let tries = 0;
  while (db.prepare('SELECT id FROM appointments WHERE token = ?').get(token) && tries < 8) {
    token = genToken();
    tries += 1;
  }
  const now = Date.now();

  const info = db.prepare(
    `INSERT INTO appointments (token, farmer_id, centre_id, crop_type, crop_qty, crop_grade, slot_date, slot_time, status, created_at)
     VALUES (?,?,?,?,?,?,?,?, 'Appointment Booked', ?)`
  ).run(token, req.user.id, centreId, cropType, cropQty, cropGrade || 'A', slotDate, slotTime, now);

  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(info.lastInsertRowid, 'Appointment Booked', 'Booked by farmer', now);

  res.json({ id: info.lastInsertRowid, token });
});

router.get('/appointments', (req, res) => {
  const rows = db.prepare(
    `SELECT a.*, c.name as centre_name, c.location as centre_location
     FROM appointments a JOIN centres c ON c.id = a.centre_id
     WHERE a.farmer_id = ? ORDER BY a.created_at DESC`
  ).all(req.user.id);
  res.json(rows);
});

router.get('/appointments/:id', (req, res) => {
  const appt = db.prepare(
    `SELECT a.*, c.name as centre_name, c.location as centre_location
     FROM appointments a JOIN centres c ON c.id = a.centre_id WHERE a.id = ?`
  ).get(req.params.id);
  if (!appt || appt.farmer_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const history = db.prepare('SELECT * FROM status_history WHERE appointment_id = ? ORDER BY created_at ASC').all(appt.id);
  const procurement = db.prepare('SELECT * FROM procurements WHERE appointment_id = ?').get(appt.id);
  res.json({ ...appt, history, procurement });
});

// Live queue: for each of this farmer's still-active bookings, show how
// many bookings at that same centre/date are ahead of it and how many are
// in the queue in total. Only counts are returned — never other farmers'
// names, phones, or crop details — so nothing about anyone else leaks.
router.get('/live-queue', (req, res) => {
  const closedPlaceholders = CLOSED_STATUSES.map(() => '?').join(',');
  const mine = db.prepare(
    `SELECT a.*, c.name as centre_name FROM appointments a
     JOIN centres c ON c.id = a.centre_id
     WHERE a.farmer_id = ? AND a.status NOT IN (${closedPlaceholders})
     ORDER BY a.slot_date ASC, a.token ASC`
  ).all(req.user.id, ...CLOSED_STATUSES);

  const aheadStmt = db.prepare(
    `SELECT COUNT(*) as c FROM appointments
     WHERE centre_id = ? AND slot_date = ? AND status NOT IN (${closedPlaceholders}) AND token < ?`
  );
  const totalStmt = db.prepare(
    `SELECT COUNT(*) as c FROM appointments
     WHERE centre_id = ? AND slot_date = ? AND status NOT IN (${closedPlaceholders})`
  );

  const queue = mine.map((a) => ({
    id: a.id,
    token: a.token,
    status: a.status,
    centreName: a.centre_name,
    slotDate: a.slot_date,
    slotTime: a.slot_time,
    cropType: a.crop_type,
    cropQty: a.crop_qty,
    position: aheadStmt.get(a.centre_id, a.slot_date, ...CLOSED_STATUSES, a.token).c + 1,
    totalInQueue: totalStmt.get(a.centre_id, a.slot_date, ...CLOSED_STATUSES).c,
  }));

  res.json(queue);
});

// Chat assistant, grounded only in THIS farmer's own bookings.
// Nothing here queries outside WHERE farmer_id = req.user.id, so the
// model is never even shown another farmer's data to accidentally leak.
router.post('/chat', async (req, res) => {
  const { message, history, lang } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Chat is not configured on the server yet (missing ANTHROPIC_API_KEY).' });
  }

  const LANG_NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu' };
  const langName = LANG_NAMES[lang] || 'English';

  const farmer = db.prepare('SELECT name, village FROM farmers WHERE id = ?').get(req.user.id);
  const appts = db.prepare(
    `SELECT a.*, c.name as centre_name FROM appointments a
     JOIN centres c ON c.id = a.centre_id WHERE a.farmer_id = ? ORDER BY a.created_at DESC`
  ).all(req.user.id);

  const apptSummary = appts.length === 0
    ? 'This farmer has no bookings yet.'
    : appts.map((a) => {
        const proc = (a.status === 'Weighing Complete' || a.status === 'Payment Processing' || a.status === 'Payment Completed')
          ? (() => { const p = db.prepare('SELECT qty, price FROM procurements WHERE appointment_id = ?').get(a.id); return p ? ` — procured ${p.qty} qtl at ₹${p.price}/qtl` : ''; })()
          : '';
        return `- Token ${a.token}: ${a.crop_qty} qtl of ${a.crop_type} (grade ${a.crop_grade}) at ${a.centre_name}, slot ${a.slot_date} ${a.slot_time}, status: ${a.status}${proc}`;
      }).join('\n');

  const systemPrompt = `You are the in-app assistant for Kisan Setu, a crop procurement booking app. You are talking to the farmer ${farmer.name}${farmer.village ? ` from ${farmer.village}` : ''}.

You can only see this farmer's own bookings, listed below. You have no access to any other farmer's or any centre's data — never invent details about anyone else.

This farmer's bookings:
${apptSummary}

Answer questions about their bookings, token/queue position, procurement status, and how the app's status flow works (Appointment Booked -> Checked In at Centre -> Quality Inspection -> Weighing Complete -> Payment Processing -> Payment Completed, or Rejected / No Show at the centre's discretion). Only the procurement centre can change a booking's status — the farmer app is read-only on status. Keep answers short and conversational. If asked something outside this scope, say so honestly.

Respond ONLY in ${langName}, regardless of what language the farmer writes in, unless they explicitly ask you to switch languages. Use simple, everyday ${langName} suited to a farmer using a mobile app, not formal or technical language.`;

  const safeHistory = Array.isArray(history)
    ? history.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-10)
    : [];

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [...safeHistory, { role: 'user', content: message }],
      }),
    });
    const data = await apiRes.json();
    if (!apiRes.ok) throw new Error(data.error?.message || 'Chat request failed.');
    const reply = (data.content || []).map((b) => b.text || '').join('\n').trim() || "Sorry, I didn't catch that — could you rephrase?";
    res.json({ reply });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
