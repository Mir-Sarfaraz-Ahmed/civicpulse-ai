const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

const router = express.Router();

// 1x1 pixel base64 PNG data for clean local placeholder images
const base64Images = {
  pothole: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+FbfQAI2wMXN86ZkwAAAABJRU5ErkJggg==', // grey
  garbage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaGD4DwACbQE9f0J8HAAAAABJRU5ErkJggg==', // green
  light: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',   // yellow
  water: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADEgGP7Lw2CwAAAABJRU5ErkJggg==',   // blue
  wire: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AABwAEhQGAhKmMIQAAAABJRU5ErkJggg==',    // orange
  resolved: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkiPj/DwADFAEP7Lw2CwAAAABJRU5ErkJggg=='  // bright green
};

function writeDemoImage(name, colorKey) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, `${name}.png`);
  if (!fs.existsSync(filePath)) {
    const data = base64Images[colorKey] || base64Images.pothole;
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
  }
  return `/uploads/${name}.png`;
}

// Seed Route (Public, to initialize hackathon review easily)
// Endpoint: POST /api/demo/seed
router.post('/seed', (req, res) => {
  try {
    console.log('[Demo Seed] Starting database seeding...');

    // 1. Temporarily disable foreign key constraints to wipe cleanly
    query.exec('PRAGMA foreign_keys = OFF;');
    query.exec('DELETE FROM incident_status_history;');
    query.exec('DELETE FROM reports;');
    query.exec('DELETE FROM incidents;');
    query.exec('DELETE FROM users;');
    query.exec('PRAGMA foreign_keys = ON;');

    // 2. Write demo images
    const imgPothole = writeDemoImage('demo_pothole', 'pothole');
    const imgGarbage = writeDemoImage('demo_garbage', 'garbage');
    const imgLight = writeDemoImage('demo_light', 'light');
    const imgWater = writeDemoImage('demo_water', 'water');
    const imgWire = writeDemoImage('demo_wire', 'wire');
    const imgResolved = writeDemoImage('demo_resolved', 'resolved');

    // 3. Create Seed Users
    const citizenId = uuidv4();
    const secondCitizenId = uuidv4();
    const adminId = uuidv4();

    const hashCivilian = bcrypt.hashSync('Password123', 10);
    const hashAdmin = bcrypt.hashSync('AdminSecurePassword123', 10);

    query.run(
      'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
      [citizenId, 'civilian@civilpulse.gov.in', hashCivilian, 'civilian', 'Rajesh Kumar']
    );
    query.run(
      'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
      [secondCitizenId, 'amit.verma@example.com', hashCivilian, 'civilian', 'Amit Verma']
    );
    query.run(
      'INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'admin@civilpulse.gov.in', hashAdmin, 'admin', 'Civic Admin']
    );

    // Helper to insert incident, report, and initial status history
    function seedIncidentAndReports({
      incidentId = uuidv4(),
      category,
      severity,
      priorityScore,
      status,
      lat,
      lng,
      address,
      assignedWorker = null,
      dispatchNotes = null,
      resolvedEvidence = null,
      reports = []
    }) {
      // Create Incident
      query.run(
        `INSERT INTO incidents (id, category, severity, priority_score, status, latitude, longitude, address, assigned_worker, dispatch_notes, resolution_evidence_url, resolved_at, closed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          incidentId,
          category,
          severity,
          priorityScore,
          status,
          lat,
          lng,
          address,
          assignedWorker,
          dispatchNotes,
          resolvedEvidence,
          status === 'Resolved' || status === 'Closed' ? new Date(Date.now() - 2 * 3600 * 1000).toISOString() : null,
          status === 'Closed' ? new Date(Date.now() - 1 * 3600 * 1000).toISOString() : null,
          new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          new Date().toISOString()
        ]
      );

      // Create status history logs
      const hist1 = uuidv4();
      query.run(
        `INSERT INTO incident_status_history (id, incident_id, status, changed_by, notes, created_at)
         VALUES (?, ?, 'Reported', ?, 'System generated seed report.', ?)`,
        [hist1, incidentId, citizenId, new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()]
      );

      if (status !== 'Reported') {
        const hist2 = uuidv4();
        query.run(
          `INSERT INTO incident_status_history (id, incident_id, status, changed_by, notes, created_at)
           VALUES (?, ?, ?, ?, 'State transitioned in demo configuration.', ?)`,
          [hist2, incidentId, status, adminId, new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()]
        );
      }

      // Create reports
      reports.forEach((rep, idx) => {
        const reportId = uuidv4();
        query.run(
          `INSERT INTO reports (id, citizen_id, incident_id, image_url, description, latitude, longitude, address, ai_problem, ai_category, ai_severity, ai_summary, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reportId,
            rep.citizen || citizenId,
            incidentId,
            rep.imageUrl,
            rep.desc,
            rep.lat,
            rep.lng,
            address,
            rep.problem,
            category,
            rep.severity,
            rep.summary,
            new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
          ]
        );
      });
    }

    // --- SEED INCIDENTS ---

    // 1. Pothole near India Gate (Grouped duplicates, Status: Assigned)
    seedIncidentAndReports({
      category: 'Road Infrastructure',
      severity: 'High',
      priorityScore: 85,
      status: 'Assigned',
      lat: 28.6129,
      lng: 77.2295,
      address: 'India Gate Circular Road, Delhi',
      assignedWorker: 'Amit Sharma',
      reports: [
        {
          imageUrl: imgPothole,
          desc: 'Very large pothole near India Gate roundabout, causing motorbikes to skid.',
          lat: 28.6130,
          lng: 77.2294,
          problem: 'Deep Pothole',
          severity: 'High',
          summary: 'Large deep pothole on the public roadway near a heavy traffic roundabout.'
        },
        {
          imageUrl: imgPothole,
          desc: 'Second lane has a massive road crack and pothole, India Gate area.',
          lat: 28.6128,
          lng: 77.2296,
          problem: 'Pothole',
          severity: 'Medium',
          summary: 'Road surface disintegration and cracking observed.'
        }
      ]
    });

    // 2. Garbage dump near Connaught Place (Single Report, Status: Reported)
    seedIncidentAndReports({
      category: 'Garbage / Dumping',
      severity: 'Medium',
      priorityScore: 35,
      status: 'Reported',
      lat: 28.6304,
      lng: 77.2177,
      address: 'Outer Circle, Connaught Place, Delhi',
      reports: [
        {
          imageUrl: imgGarbage,
          desc: 'Huge garbage pile overflowing near the block E entrance. Rotten smell.',
          lat: 28.6304,
          lng: 77.2177,
          problem: 'Garbage Dump',
          severity: 'Medium',
          summary: 'Overflowing commercial waste dump reported on the pedestrian footpath.'
        }
      ]
    });

    // 3. Broken Streetlight near Red Fort (Single Report, Status: In Progress)
    seedIncidentAndReports({
      category: 'Safety Hazards',
      severity: 'Medium',
      priorityScore: 50,
      status: 'In Progress',
      lat: 28.6562,
      lng: 77.2410,
      address: 'Netaji Subhash Marg near Red Fort, Delhi',
      assignedWorker: 'Rahul Kumar',
      reports: [
        {
          imageUrl: imgLight,
          desc: 'Three streetlights are not working, the highway near Red Fort is completely dark.',
          lat: 28.6562,
          lng: 77.2410,
          problem: 'Broken Streetlight',
          severity: 'Medium',
          summary: 'Multiple consecutive non-functional streetlights resulting in poor road visibility.'
        }
      ]
    });

    // 4. Major Water Leakage near AIIMS Hospital (Grouped duplicates, Status: Dispatched)
    seedIncidentAndReports({
      category: 'Water Leakage',
      severity: 'High',
      priorityScore: 90,
      status: 'Dispatched',
      lat: 28.5672,
      lng: 77.2100,
      address: 'Aurobindo Marg near AIIMS Metro gate, Delhi',
      assignedWorker: 'Suresh Gupta',
      dispatchNotes: 'Dispatched plumbing team with replacement pipe valves.',
      reports: [
        {
          imageUrl: imgWater,
          desc: 'Water pipe burst near AIIMS Hospital, clean water flooding the metro entry.',
          lat: 28.5671,
          lng: 77.2101,
          problem: 'Water Pipe Burst',
          severity: 'High',
          summary: 'Active pipeline failure causing high water volume discharge and flooding.'
        },
        {
          imageUrl: imgWater,
          desc: 'Huge puddle of water on road next to AIIMS, water seems to be leaking from underground.',
          lat: 28.5673,
          lng: 77.2099,
          problem: 'Underground Leak',
          severity: 'Medium',
          summary: 'Underground water line fracture causing street-level pooling.'
        }
      ]
    });

    // 5. Dangerous open electric wire near Lajpat Nagar Market (Grouped, Status: Verified)
    seedIncidentAndReports({
      category: 'Safety Hazards',
      severity: 'Critical',
      priorityScore: 95,
      status: 'Verified',
      lat: 28.5708,
      lng: 77.2412,
      address: 'Block D, Lajpat Nagar Central Market, Delhi',
      reports: [
        {
          imageUrl: imgWire,
          desc: 'Loose, naked electric wires hanging down from transformer right above the busy shopping lane.',
          lat: 28.5708,
          lng: 77.2412,
          problem: 'Exposed High-Voltage Wires',
          severity: 'Critical',
          summary: 'High risk hazard involving live overhead electricity cables sagging within pedestrian reach.'
        },
        {
          imageUrl: imgWire,
          desc: 'Sparking wire hanging near shop entrance. Highly dangerous!',
          lat: 28.5709,
          lng: 77.2411,
          problem: 'Sparking Electrical Cable',
          severity: 'Critical',
          summary: 'Active electrical discharge from damaged overhead utility line.'
        }
      ]
    });

    // 6. Traffic Blockage near Karol Bagh Metro (Single Report, Status: Resolved)
    seedIncidentAndReports({
      category: 'Traffic',
      severity: 'High',
      priorityScore: 70,
      status: 'Resolved',
      lat: 28.6425,
      lng: 77.1885,
      address: 'Pusa Road, Karol Bagh, Delhi',
      assignedWorker: 'Traffic Police Unit 4',
      resolvedEvidence: imgResolved,
      reports: [
        {
          imageUrl: imgPothole, // reported incident image
          desc: 'An abandoned container is blocking two main lanes on Pusa Road, causing heavy traffic jams.',
          lat: 28.6425,
          lng: 77.1885,
          problem: 'Road Blockage',
          severity: 'High',
          summary: 'Lane obstruction due to large abandoned cargo object on an arterial road.'
        }
      ]
    });

    // 7. Waterlogging near Saket Metro (Grouped, Status: Reported)
    seedIncidentAndReports({
      category: 'Water Leakage',
      severity: 'High',
      priorityScore: 80,
      status: 'Reported',
      lat: 28.5222,
      lng: 77.2066,
      address: 'Saket Metro Station road, Delhi',
      reports: [
        {
          imageUrl: imgWater,
          desc: 'Heavy waterlogging near metro stairs. Commuters cannot cross.',
          lat: 28.5222,
          lng: 77.2066,
          problem: 'Waterlogging',
          severity: 'High',
          summary: 'Severe localized flooding disrupting public transit access.'
        },
        {
          imageUrl: imgWater,
          desc: 'Drain is clogged, water is standing 1 foot deep near Saket Metro.',
          lat: 28.5221,
          lng: 77.2065,
          problem: 'Clogged Storm Drain',
          severity: 'High',
          summary: 'Inoperative drainage inlet resulting in surface accumulation.'
        }
      ]
    });

    // 8. Damaged Footpath near Delhi University (Single, Status: Closed)
    seedIncidentAndReports({
      category: 'Road Infrastructure',
      severity: 'Low',
      priorityScore: 45,
      status: 'Closed',
      lat: 28.6890,
      lng: 77.2103,
      address: 'North Campus, Delhi University, Delhi',
      assignedWorker: 'PWD Zone 1',
      resolvedEvidence: imgResolved,
      reports: [
        {
          imageUrl: imgPothole,
          desc: 'Broken pavement tiles make walking difficult for students near DU gate.',
          lat: 28.6890,
          lng: 77.2103,
          problem: 'Broken Footpath Tiles',
          severity: 'Low',
          summary: 'Minor pedestrian surface tiles damage near school/college zone.'
        }
      ]
    });

    // 9. Clogged sewage line near Noida Sector 15 (Single, Status: Resolved)
    seedIncidentAndReports({
      category: 'Water Leakage',
      severity: 'High',
      priorityScore: 75,
      status: 'Resolved',
      lat: 28.5830,
      lng: 77.3110,
      address: 'Sector 15 Main Road, Noida',
      assignedWorker: 'Noida Sewer Dept',
      resolvedEvidence: imgResolved,
      reports: [
        {
          imageUrl: imgWater,
          desc: 'Sewage water backing up and overflowing onto the main market entry road.',
          lat: 28.5830,
          lng: 77.3110,
          problem: 'Sewer Line Overflow',
          severity: 'High',
          summary: 'Blackwater sewage backflow discharging onto public streets.'
        }
      ]
    });

    // 10. Large Garbage Pile near Dwarka Sector 10 (Single, Status: Reported)
    seedIncidentAndReports({
      category: 'Garbage / Dumping',
      severity: 'Low',
      priorityScore: 20,
      status: 'Reported',
      lat: 28.5812,
      lng: 77.0590,
      address: 'Dwarka Sector 10 Market, Delhi',
      reports: [
        {
          imageUrl: imgGarbage,
          desc: 'Plastic boxes and cardboard dumped behind the vegetable market stalls.',
          lat: 28.5812,
          lng: 77.0590,
          problem: 'Commercial Dumping',
          severity: 'Low',
          summary: 'Littering of secondary packing material behind retail market.'
        }
      ]
    });

    console.log('[Demo Seed] Database seeded successfully with 10 incidents and users.');
    res.json({
      success: true,
      message: 'Demo database seeded successfully.',
      credentials: {
        civilian: { email: 'civilian@civilpulse.gov.in', password: 'Password123' },
        admin: { email: 'admin@civilpulse.gov.in', password: 'AdminSecurePassword123' }
      }
    });

  } catch (err) {
    console.error('[Demo Seed Error] Seeding failed:', err);
    res.status(500).json({ error: 'Internal server error seeding database.' });
  }
});

module.exports = router;
