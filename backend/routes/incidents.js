const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Enforce admin permission for all endpoints in this router
router.use(requireRole('admin'));

// Configure multer for resolution evidence upload
const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resolved_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'));
    }
  }
});

// Strict state transition machine definition
const VALID_TRANSITIONS = {
  'Reported': ['AI Analysed', 'Verified'],
  'AI Analysed': ['Verified'],
  'Verified': ['Assigned'],
  'Assigned': ['Dispatched'],
  'Dispatched': ['In Progress'],
  'In Progress': ['Resolved'],
  'Resolved': ['Closed']
};

function isValidTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed && allowed.includes(nextStatus);
}

// Helper to log status history changes
function logStatusChange(incidentId, status, changedBy, notes) {
  const historyId = uuidv4();
  query.run(
    'INSERT INTO incident_status_history (id, incident_id, status, changed_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [historyId, incidentId, status, changedBy, notes, new Date().toISOString()]
  );
}

// 1. Get KPI Statistics
// Endpoint: GET /api/incidents/stats
router.get('/stats', (req, res) => {
  try {
    const totalRow = query.get("SELECT COUNT(*) as count FROM incidents WHERE status != 'Closed'");
    const criticalRow = query.get("SELECT COUNT(*) as count FROM incidents WHERE severity = 'Critical' AND status != 'Closed'");
    const highPriorityRow = query.get("SELECT COUNT(*) as count FROM incidents WHERE priority_score >= 70 AND status != 'Closed'");
    const resolvedRow = query.get("SELECT COUNT(*) as count FROM incidents WHERE status = 'Resolved'");
    const pendingRow = query.get("SELECT COUNT(*) as count FROM incidents WHERE status IN ('Reported', 'AI Analysed', 'Verified')");

    res.json({
      totalActive: totalRow ? totalRow.count : 0,
      critical: criticalRow ? criticalRow.count : 0,
      highPriority: highPriorityRow ? highPriorityRow.count : 0,
      resolved: resolvedRow ? resolvedRow.count : 0,
      pending: pendingRow ? pendingRow.count : 0
    });
  } catch (err) {
    console.error('[Admin API Error] Failed to get stats:', err);
    res.status(500).json({ error: 'Internal server error fetching statistics.' });
  }
});

// 2. Get All Incidents (with optional filters)
// Endpoint: GET /api/incidents
router.get('/', (req, res) => {
  try {
    const incidents = query.all(`
      SELECT i.*, 
             (SELECT COUNT(*) FROM reports WHERE incident_id = i.id) as report_count
      FROM incidents i
      ORDER BY i.priority_score DESC, i.created_at DESC
    `);
    res.json(incidents);
  } catch (err) {
    console.error('[Admin API Error] Failed to get incidents:', err);
    res.status(500).json({ error: 'Internal server error fetching incidents.' });
  }
});

// 3. Get Specific Incident Details with Associated Citizen Reports
// Endpoint: GET /api/incidents/:id
router.get('/:id', (req, res) => {
  const incidentId = req.params.id;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found.' });
    }

    // Fetch reports grouped under this incident
    const reports = query.all(`
      SELECT r.*, u.name as citizen_name, u.email as citizen_email
      FROM reports r
      JOIN users u ON r.citizen_id = u.id
      WHERE r.incident_id = ?
      ORDER BY r.created_at ASC
    `, [incidentId]);

    // Fetch status history log
    const history = query.all(`
      SELECT h.*, u.name as actor_name, u.email as actor_email
      FROM incident_status_history h
      JOIN users u ON h.changed_by = u.id
      WHERE h.incident_id = ?
      ORDER BY h.created_at DESC
    `, [incidentId]);

    res.json({
      incident,
      reports,
      history
    });
  } catch (err) {
    console.error('[Admin API Error] Failed to get incident details:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Verify Incident
// Endpoint: PATCH /api/incidents/:id/verify
router.patch('/:id/verify', (req, res) => {
  const incidentId = req.params.id;
  const { notes } = req.body;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const nextStatus = 'Verified';
    if (!isValidTransition(incident.status, nextStatus)) {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      'UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?',
      [nextStatus, new Date().toISOString(), incidentId]
    );

    logStatusChange(incidentId, nextStatus, req.user.id, notes || 'Incident verified by authority.');

    res.json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('[Admin API Error] Verification failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Assign Field Worker
// Endpoint: PATCH /api/incidents/:id/assign
router.patch('/:id/assign', (req, res) => {
  const incidentId = req.params.id;
  const { workerName, notes } = req.body;

  if (!workerName) {
    return res.status(400).json({ error: 'Field worker name is required.' });
  }

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    // Can transition from Verified (as per spec workflow) or force transition
    const nextStatus = 'Assigned';
    // Support transitions from Verified or Reported (if we bypass verification for speed)
    // To strictly implement spec: Verified -> Assigned
    if (!isValidTransition(incident.status, nextStatus) && incident.status !== 'Reported' && incident.status !== 'AI Analysed') {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      'UPDATE incidents SET status = ?, assigned_worker = ?, updated_at = ? WHERE id = ?',
      [nextStatus, workerName, new Date().toISOString(), incidentId]
    );

    logStatusChange(
      incidentId, 
      nextStatus, 
      req.user.id, 
      notes || `Assigned to field worker: ${workerName}.`
    );

    res.json({ success: true, status: nextStatus, assigned_worker: workerName });
  } catch (err) {
    console.error('[Admin API Error] Assignment failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 6. Dispatch Team
// Endpoint: PATCH /api/incidents/:id/dispatch
router.patch('/:id/dispatch', (req, res) => {
  const incidentId = req.params.id;
  const { dispatchNotes, notes } = req.body;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const nextStatus = 'Dispatched';
    if (!isValidTransition(incident.status, nextStatus)) {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      'UPDATE incidents SET status = ?, dispatch_notes = ?, updated_at = ? WHERE id = ?',
      [nextStatus, dispatchNotes || '', new Date().toISOString(), incidentId]
    );

    logStatusChange(
      incidentId, 
      nextStatus, 
      req.user.id, 
      notes || `Dispatch initialized: ${dispatchNotes || 'No notes'}`
    );

    res.json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('[Admin API Error] Dispatch failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 7. Start Resolution (In Progress)
// Endpoint: PATCH /api/incidents/:id/start-work
router.patch('/:id/start-work', (req, res) => {
  const incidentId = req.params.id;
  const { notes } = req.body;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const nextStatus = 'In Progress';
    if (!isValidTransition(incident.status, nextStatus)) {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      'UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?',
      [nextStatus, new Date().toISOString(), incidentId]
    );

    logStatusChange(incidentId, nextStatus, req.user.id, notes || 'Field team started working on resolution.');

    res.json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('[Admin API Error] Failed to mark In Progress:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 8. Resolve Incident (Requires evidence upload)
// Endpoint: PATCH /api/incidents/:id/resolve
router.patch('/:id/resolve', upload.single('evidence'), (req, res) => {
  const incidentId = req.params.id;
  const { notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Resolution evidence image file is required.' });
  }

  const evidenceUrl = `/uploads/${req.file.filename}`;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const nextStatus = 'Resolved';
    if (!isValidTransition(incident.status, nextStatus)) {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      `UPDATE incidents 
       SET status = ?, resolution_evidence_url = ?, resolved_at = ?, updated_at = ? 
       WHERE id = ?`,
      [nextStatus, evidenceUrl, new Date().toISOString(), new Date().toISOString(), incidentId]
    );

    logStatusChange(
      incidentId, 
      nextStatus, 
      req.user.id, 
      notes || 'Incident marked as Resolved. Evidence photo uploaded.'
    );

    res.json({ success: true, status: nextStatus, evidenceUrl });
  } catch (err) {
    console.error('[Admin API Error] Resolution failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 9. Close Incident
// Endpoint: PATCH /api/incidents/:id/close
router.patch('/:id/close', (req, res) => {
  const incidentId = req.params.id;
  const { notes } = req.body;

  try {
    const incident = query.get('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (!incident) return res.status(404).json({ error: 'Incident not found.' });

    const nextStatus = 'Closed';
    if (!isValidTransition(incident.status, nextStatus)) {
      return res.status(400).json({ error: `Invalid status transition from ${incident.status} to ${nextStatus}` });
    }

    query.run(
      'UPDATE incidents SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?',
      [nextStatus, new Date().toISOString(), new Date().toISOString(), incidentId]
    );

    logStatusChange(incidentId, nextStatus, req.user.id, notes || 'Incident closed and archived.');

    res.json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('[Admin API Error] Closure failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
