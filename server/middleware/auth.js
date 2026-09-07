const jwt = require('jsonwebtoken');
const { db } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'apex_care_opd_secret_key_2026_super_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from database
    const user = db.prepare('SELECT id, username, role, full_name, email, mobile_number, status FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: 'User account is inactive or no longer exists.' });
    }

    req.user = user;

    // If user is a doctor, attach doctor profile info
    if (user.role === 'doctor') {
      const doctor = db.prepare('SELECT id as doctor_id, doctor_code, department_id, specialization, consultation_fee FROM doctors WHERE user_id = ?').get(user.id);
      if (doctor) {
        req.user.doctor_id = doctor.doctor_id;
        req.user.doctor_code = doctor.doctor_code;
        req.user.department_id = doctor.department_id;
      }
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access forbidden: Required role is [${roles.join(', ')}], but your role is '${req.user.role}'.` 
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
