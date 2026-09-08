import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

// Returns middleware that only allows a token issued for the given role.
// This is what keeps the farmer site and centre site from being able to
// call each other's endpoints even if someone copies a token.
export function requireRole(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const decoded = jwt.verify(token, SECRET);
      if (decoded.role !== role) return res.status(403).json({ error: 'Token is not valid for this app' });
      req.user = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired session, please log in again' });
    }
  };
}
