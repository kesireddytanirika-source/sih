import { Router } from 'express';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireRole('farmer'));

// A farmer can only ever query rows WHERE farmer_id = req.user.id.
// That row-level scoping (not just hiding things in the UI) is what
// actually stops one farmer from seeing another farmer's data.

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
  const rows = db.prepare(
    `SELECT slot_time, COUNT(*) as count FROM appointments
     WHERE centre_id = ? AND slot_date = ? AND status IN ('Booked','Confirmed','In Queue')
     GROUP BY slot_time`
  ).all(centreId, date);
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

  const activeCount = db.prepare(
    `SELECT COUNT(*) as c FROM appointments
     WHERE centre_id=? AND slot_date=? AND slot_time=? AND status IN ('Booked','Confirmed','In Queue')`
  ).get(centreId, slotDate, slotTime).c;
  if (activeCount >= centre.capacity_per_slot) {
    return res.status(409).json({ error: 'That slot just filled up. Please pick another.' });
  }

  const seq = db.prepare('SELECT COUNT(*) as c FROM appointments WHERE centre_id=? AND slot_date=?').get(centreId, slotDate).c + 1;
  const token = `${centre.code}-${slotDate.slice(5).replace('-', '')}-${String(seq).padStart(3, '0')}`;
  const now = Date.now();

  const info = db.prepare(
    `INSERT INTO appointments (token, farmer_id, centre_id, crop_type, crop_qty, crop_grade, slot_date, slot_time, status, created_at)
     VALUES (?,?,?,?,?,?,?,?, 'Booked', ?)`
  ).run(token, req.user.id, centreId, cropType, cropQty, cropGrade || 'A', slotDate, slotTime, now);

  db.prepare('INSERT INTO status_history (appointment_id, status, note, created_at) VALUES (?,?,?,?)')
    .run(info.lastInsertRowid, 'Booked', 'Booked by farmer', now);

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

export default router;
