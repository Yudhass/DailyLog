import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const pub = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  try {
    const user = await User.create({ name, email: email.toLowerCase(), password: await bcrypt.hash(password, 10) });
    res.status(201).json(pub(user));
  } catch {
    res.status(409).json({ error: 'Email sudah terdaftar' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ where: { email: (email || '').toLowerCase() } });
  if (!user || !(await bcrypt.compare(password || '', user.password)))
    return res.status(401).json({ error: 'Email atau password salah' });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: pub(user) });
});

router.put('/profile', authRequired, async (req, res) => {
  const { name, password } = req.body || {};
  const data = {};
  if (name) data.name = name;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
    data.password = await bcrypt.hash(password, 10);
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Tidak ada perubahan' });
  const user = await User.findByPk(req.user.id);
  await user.update(data);
  res.json(pub(user));
});

export default router;
