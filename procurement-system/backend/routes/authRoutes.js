import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { sign } from '../middleware/auth.js';

const router = Router();

router.post('/farmer/register', (req, res) => {
  const { name, phone, password, village } = req.body || {};
  if (!name || !phone || !password || phone.length < 10) {
    return res.status(400).json({ error: 'Name, a 10-digit phone number, and a password are required.' });
  }
  const existing = db.prepare('SELECT id FROM farmers WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ error: 'That phone number is already registered. Please log in instead.' });

  const hash = bcrypt.hashSync(password, 8);
  const info = db.prepare(
    'INSERT INTO farmers (phone, name, village, password_hash, created_at) VALUES (?,?,?,?,?)'
  ).run(phone, name, village || '', hash, Date.now());

  const token = sign({ id: info.lastInsertRowid, role: 'farmer', name, phone });
  res.json({ token, farmer: { id: info.lastInsertRowid, name, phone, village: village || '' } });
});

router.post('/farmer/login', (req, res) => {
  const { phone, password } = req.body || {};
  const farmer = db.prepare('SELECT * FROM farmers WHERE phone = ?').get(phone);
  if (!farmer || !bcrypt.compareSync(password || '', farmer.password_hash)) {
    return res.status(401).json({ error: 'Incorrect phone number or password.' });
  }
  const token = sign({ id: farmer.id, role: 'farmer', name: farmer.name, phone: farmer.phone });
  res.json({ token, farmer: { id: farmer.id, name: farmer.name, phone: farmer.phone, village: farmer.village } });
});

router.post('/centre/login', (req, res) => {
  const { code, password } = req.body || {};
  const centre = db.prepare('SELECT * FROM centres WHERE code = ?').get((code || '').toUpperCase());
  if (!centre || !bcrypt.compareSync(password || '', centre.password_hash)) {
    return res.status(401).json({ error: 'Incorrect centre code or PIN.' });
  }
  const token = sign({ id: centre.id, role: 'centre', name: centre.name, code: centre.code });
  res.json({
    token,
    centre: { id: centre.id, code: centre.code, name: centre.name, location: centre.location, capacityPerSlot: centre.capacity_per_slot },
  });
});

export default router;
