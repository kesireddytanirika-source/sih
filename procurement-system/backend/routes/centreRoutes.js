import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireRole('centre'));

// Every query below is scoped WHERE centre_id = req.user.id, so a centre
// can only ever see and update farmers who booked into ITS OWN queue.

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
  if (activeOnly === 'true') { query += ` AND a.status IN ('Booked','Confirmed','In Queue')`; }
  query += ' ORDER BY a.token ASC';
  res.json(db.prepare(query).all(...params));
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

router.patch('/appointments/:id/status', (req, res) => {
  const { status, note } = req.body || {};
  const allowed = ['Confirmed', 'In Queue', 'Rejected', 'No Show'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt || appt.centre_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  if (appt.status === 'Procured') return res.status(409).json({ error: 'This appointment is already procured and closed.' });

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, appt.id);
  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(appt.id, status, note || `Set to ${status} by centre`, Date.now());
  res.json({ ok: true });
});

router.post('/appointments/:id/procure', (req, res) => {
  const { qty, price } = req.body || {};
  if (!qty || !price || qty <= 0 || price <= 0) return res.status(400).json({ error: 'Quantity and price must be positive numbers.' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt || appt.centre_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  if (appt.status === 'Procured') return res.status(409).json({ error: 'Already procured.' });

  const now = Date.now();
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('Procured', appt.id);
  db.prepare('INSERT INTO procurements (appointment_id, qty, price, created_at) VALUES (?,?,?,?)').run(appt.id, qty, price, now);
  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(appt.id, 'Procured', `Procured ${qty} qtl @ ₹${price}/qtl`, now);
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
