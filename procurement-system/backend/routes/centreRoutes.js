import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireRole('centre'));

// Every query below is scoped WHERE centre_id = req.user.id, so a centre
// can only ever see and update farmers who booked into ITS OWN queue.

// Same lifecycle the farmer app displays (see farmerRoutes.js). Only this
// app is ever allowed to move a booking along it.
const STATUS_FLOW = [
  'Appointment Booked',
  'Checked In at Centre',
  'Quality Inspection',
  'Weighing Complete',
  'Payment Processing',
  'Payment Completed',
];
const CLOSED_STATUSES = ['Payment Completed', 'Rejected', 'No Show'];
const ACTIVE_STATUSES = ['Appointment Booked', 'Checked In at Centre', 'Quality Inspection', 'Weighing Complete', 'Payment Processing'];
// 'Weighing Complete' is only ever set via /procure below, since it must
// carry a quantity and price — it isn't a plain PATCH /status transition.
const PATCHABLE_STATUSES = ['Checked In at Centre', 'Quality Inspection', 'Payment Processing', 'Payment Completed', 'Rejected', 'No Show'];

// Chronological order of the day's slots (this is display order, not
// alphabetical — "12:00 – 3:00 PM" must sort after "9:00 – 12:00 PM").
// The queue is always ordered by this rank first, then by token, so it
// matches the order the centre actually works through the day.
const SLOT_ORDER = ['6:00 – 9:00 AM', '9:00 – 12:00 PM', '12:00 – 3:00 PM', '3:00 – 6:00 PM'];
function slotRank(slotTime) {
  const i = SLOT_ORDER.indexOf(slotTime);
  return i === -1 ? SLOT_ORDER.length : i;
}
function byQueueOrder(a, b) {
  return String(a.slot_date).localeCompare(String(b.slot_date))
    || (slotRank(a.slot_time) - slotRank(b.slot_time))
    || String(a.token).localeCompare(String(b.token));
}

router.get('/me', (req, res) => {
  const c = db.prepare('SELECT id, code, name, location, capacity_per_slot as capacityPerSlot FROM centres WHERE id = ?').get(req.user.id);
  res.json(c);
});

router.get('/appointments', (req, res) => {
  const { date, activeOnly } = req.query;
  let query = `SELECT a.*, f.name as farmer_name, f.phone as farmer_phone, f.village as farmer_village
               FROM appointments a JOIN farmers f ON f.id = a.farmer_id WHERE a.centre_id = ?`;
  const params = [req.user.id];
  if (date) { query += ' AND a.slot_date = ?'; params.push(date); }
  if (activeOnly === 'true') {
    query += ` AND a.status IN (${ACTIVE_STATUSES.map(() => '?').join(',')})`;
    params.push(...ACTIVE_STATUSES);
  }
  const rows = db.prepare(query).all(...params);
  rows.sort(byQueueOrder);
  res.json(rows);
});

router.get('/appointments/:id', (req, res) => {
  const appt = db.prepare(
    `SELECT a.*, f.name as farmer_name, f.phone as farmer_phone, f.village as farmer_village
     FROM appointments a JOIN farmers f ON f.id = a.farmer_id WHERE a.id = ?`
  ).get(req.params.id);
  if (!appt || appt.centre_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const history = db.prepare('SELECT * FROM status_history WHERE appointment_id = ? ORDER BY created_at ASC').all(appt.id);
  const procurement = db.prepare('SELECT * FROM procurements WHERE appointment_id = ?').get(appt.id);
  res.json({ ...appt, history, procurement });
});

// This is the ONLY place in the whole system that ever writes to
// appointments.status (aside from /procure just below it). The farmer app
// has no route that can touch it — status changes are one-way, centre -> DB.
router.patch('/appointments/:id/status', (req, res) => {
  const { status, note } = req.body || {};
  if (!PATCHABLE_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt || appt.centre_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  if (CLOSED_STATUSES.includes(appt.status)) return res.status(409).json({ error: 'This appointment is already closed and cannot be updated.' });

  if ((status === 'Payment Processing' || status === 'Payment Completed')) {
    const procurement = db.prepare('SELECT * FROM procurements WHERE appointment_id = ?').get(appt.id);
    if (!procurement) return res.status(409).json({ error: 'Record the weighed quantity and rate before moving to a payment stage.' });
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, appt.id);
  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(appt.id, status, note || `Set to ${status} by centre`, Date.now());
  res.json({ ok: true });
});

// Records the weighed quantity/rate and advances the booking to
// 'Weighing Complete' in one step (it needs qty & price, so it can't be a
// plain PATCH /status call). Only reachable from the centre app.
router.post('/appointments/:id/procure', (req, res) => {
  const { qty, price } = req.body || {};
  if (!qty || !price || qty <= 0 || price <= 0) return res.status(400).json({ error: 'Quantity and price must be positive numbers.' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt || appt.centre_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  if (CLOSED_STATUSES.includes(appt.status)) return res.status(409).json({ error: 'This appointment is already closed.' });
  if (appt.status !== 'Quality Inspection') return res.status(409).json({ error: 'Weighing can only be recorded after quality inspection.' });

  const now = Date.now();
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('Weighing Complete', appt.id);
  const existing = db.prepare('SELECT id FROM procurements WHERE appointment_id = ?').get(appt.id);
  if (existing) {
    db.prepare('UPDATE procurements SET qty = ?, price = ?, created_at = ? WHERE appointment_id = ?').run(qty, price, now, appt.id);
  } else {
    db.prepare('INSERT INTO procurements (appointment_id, qty, price, created_at) VALUES (?,?,?,?)').run(appt.id, qty, price, now);
  }
  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(appt.id, 'Weighing Complete', `Weighed ${qty} qtl @ ₹${price}/qtl`, now);
  res.json({ ok: true });
});

router.get('/analytics', (req, res) => {
  const appts = db.prepare(
    `SELECT a.*, p.qty as p_qty, p.price as p_price FROM appointments a
     LEFT JOIN procurements p ON p.appointment_id = a.id WHERE a.centre_id = ?`
  ).all(req.user.id);
  res.json(appts);
});

export default router;
