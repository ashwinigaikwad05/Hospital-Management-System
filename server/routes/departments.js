const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/departments - list departments
router.get('/', authenticateToken, (req, res) => {
  const includeAll = req.query.all === 'true' && req.user.role === 'admin';
  
  const query = includeAll
    ? `SELECT d.*, COUNT(doc.id) as doctor_count 
       FROM departments d 
       LEFT JOIN doctors doc ON d.id = doc.department_id 
       GROUP BY d.id 
       ORDER BY d.department_name ASC`
    : `SELECT d.*, COUNT(doc.id) as doctor_count 
       FROM departments d 
       LEFT JOIN doctors doc ON d.id = doc.department_id AND doc.status = 'active'
       WHERE d.status = 'active'
       GROUP BY d.id 
       ORDER BY d.department_name ASC`;

  const departments = db.prepare(query).all();
  res.json({ departments });
});

// GET /api/departments/:id
router.get('/:id', authenticateToken, (req, res) => {
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) {
    return res.status(404).json({ error: 'Department not found.' });
  }

  const doctors = db.prepare(`
    SELECT id, doctor_code, first_name, last_name, specialization, consultation_fee, status 
    FROM doctors WHERE department_id = ?
  `).all(req.params.id);

  res.json({ department: dept, doctors });
});

// POST /api/departments (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { department_name, description, status = 'active' } = req.body;

  if (!department_name || !department_name.trim()) {
    return res.status(400).json({ error: 'Department name is required.' });
  }

  const existing = db.prepare('SELECT id FROM departments WHERE department_name = ? COLLATE NOCASE').get(department_name.trim());
  if (existing) {
    return res.status(400).json({ error: 'A department with this name already exists.' });
  }

  const result = db.prepare(`
    INSERT INTO departments (department_name, description, status) 
    VALUES (?, ?, ?)
  `).run(department_name.trim(), description ? description.trim() : null, status);

  const newDept = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Department created successfully', department: newDept });
});

// PUT /api/departments/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { department_name, description, status } = req.body;
  const id = req.params.id;

  const current = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ error: 'Department not found.' });
  }

  if (department_name && department_name.trim() !== current.department_name) {
    const existing = db.prepare('SELECT id FROM departments WHERE department_name = ? COLLATE NOCASE AND id != ?').get(department_name.trim(), id);
    if (existing) {
      return res.status(400).json({ error: 'Another department with this name already exists.' });
    }
  }

  db.prepare(`
    UPDATE departments 
    SET department_name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    department_name ? department_name.trim() : current.department_name,
    description !== undefined ? description : current.description,
    status || current.status,
    id
  );

  const updated = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  res.json({ message: 'Department updated successfully', department: updated });
});

// DELETE /api/departments/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const id = req.params.id;

  const assignedDoctors = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE department_id = ?').get(id).count;
  if (assignedDoctors > 0) {
    return res.status(400).json({ 
      error: `Cannot delete department: There are ${assignedDoctors} doctor(s) assigned to this department. Please deactivate the department or reassign the doctors first.` 
    });
  }

  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  res.json({ message: 'Department deleted successfully.' });
});

module.exports = router;
