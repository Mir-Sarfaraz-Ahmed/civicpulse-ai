import React, { useState, useEffect } from 'react';
import { Shield, Eye, Flame, MapPin, CheckCircle, ArrowLeft, ArrowRight, Loader, User, Calendar, FileText, Clipboard, Truck, Wrench, Check, CheckSquare, Upload, AlertTriangle, Users, X, ZoomIn, Maximize2, ExternalLink } from 'lucide-react';
import MapComponent from './MapComponent';

const API_BASE = 'http://localhost:5000/api';

const PREDEFINED_WORKERS = [
  "Amit Sharma (PWD Road Repair)",
  "Suresh Gupta (Delhi Jal Board)",
  "Rahul Kumar (BSES Electrical)",
  "Vikram Singh (MCD Sanitation)",
  "Traffic Police Dispatch Unit 4"
];

const PREDEFINED_DISPATCH = [
  "Deploying pothole patching unit with asphalt mixer.",
  "Dispatched electrical repair team with ladder truck.",
  "Sewer clearance truck with high-pressure jetting sent.",
  "Trash clearance loader and container truck dispatched.",
  "Traffic warden team dispatched for manual routing."
];

export default function AdminDashboard({ token, onBackToLanding }) {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({ totalActive: 0, critical: 0, highPriority: 0, resolved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Form Inputs for Actions
  const [workerName, setWorkerName] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Image Lightbox Popup Modal State
  const [modalImage, setModalImage] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchIncidentDetails(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE}/incidents/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // 2. Fetch Incidents List
      const listRes = await fetch(`${API_BASE}/incidents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      if (listRes.ok) setIncidents(listData);

    } catch (err) {
      console.error('[Admin Dashboard Error] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentDetails = async (id) => {
    setLoadingDetails(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDetails(data);
      } else {
        setActionError(data.error || 'Failed to load details.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Network error loading details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Perform PATCH actions for state transitions
  const handleTransition = async (endpoint, payload = {}) => {
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Status successfully transitioned to: ${data.status}`);
        // Reset forms
        setWorkerName('');
        setDispatchNotes('');
        setActionNotes('');
        // Reload dashboard list & details
        fetchDashboardData();
        fetchIncidentDetails(selectedIncidentId);
      } else {
        setActionError(data.error || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Network error performing action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Special handler for Resolve Upload action (needs multipart formdata)
  const handleResolveUpload = async (e) => {
    e.preventDefault();
    if (!evidenceFile) {
      setActionError('Please select a resolution proof image file.');
      return;
    }

    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    const formData = new FormData();
    formData.append('evidence', evidenceFile);
    formData.append('notes', actionNotes || 'Resolved during verification.');

    try {
      const res = await fetch(`${API_BASE}/incidents/${selectedIncidentId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setActionSuccess('Incident resolved successfully! Evidence photo registered.');
        setEvidenceFile(null);
        setActionNotes('');
        fetchDashboardData();
        fetchIncidentDetails(selectedIncidentId);
      } else {
        setActionError(data.error || 'Failed to resolve incident.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Network error resolving incident.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'badge-low';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Reported': return '#9ca3af';
      case 'AI Analysed': return '#9b51e0';
      case 'Verified': return '#4facfe';
      case 'Assigned': return '#00f2fe';
      case 'Dispatched': return '#ffcc00';
      case 'In Progress': return '#ff6b00';
      case 'Resolved': return '#00e676';
      case 'Closed': return '#059669';
      default: return '#fff';
    }
  };

  return (
    <div className="admin-dashboard container" style={{ paddingTop: '30px', paddingBottom: '80px' }}>
      
      {/* Dashboard Top Header */}
      <div className="flex-row-between" style={{ marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <button onClick={onBackToLanding} className="btn btn-secondary" style={{ padding: '8px 12px', marginBottom: '10px' }}>
            <ArrowLeft size={16} /> Exit Dashboard
          </button>
          <h1 style={{ fontSize: '2.2rem' }} className="text-gradient">Authority Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>AI-powered Incident Priorities and Grouping Dashboard</p>
        </div>

        <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ display: 'flex', gap: '8px' }}>
          Refresh Feeds
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Incidents</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-neon)' }}>{stats.totalActive}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'rgba(255, 0, 85, 0.2)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Critical Issues</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-critical)' }}>{stats.critical}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'rgba(255, 107, 0, 0.2)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>High Priority</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-high)' }}>{stats.highPriority}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'rgba(0, 230, 118, 0.2)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Resolved</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-low)' }}>{stats.resolved}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{stats.pending}</div>
        </div>
      </div>

      {/* Main Split Grid (List & Map vs. Details View) */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedIncidentId ? '1.2fr 1fr' : '1fr', gap: '24px' }}>
        
        {/* Left Side: Incidents Feed & Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Map Layer */}
          <div className="glass-card" style={{ padding: '12px', height: '400px' }}>
            <MapComponent 
              mode="view"
              incidents={incidents}
              activeIncidentId={selectedIncidentId}
              onIncidentSelect={(id) => setSelectedIncidentId(id)}
            />
          </div>

          {/* Incidents Table List */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Priority Incidents Feed</h2>
            
            {loading ? (
              <div className="flex-row-center" style={{ minHeight: '150px' }}>
                <Loader className="pulse-glow" style={{ animation: 'spin 1.5s infinite linear', color: 'var(--primary-neon)' }} />
              </div>
            ) : incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No active incidents reported in database.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 8px' }}>Priority</th>
                      <th style={{ padding: '10px 8px' }}>Category</th>
                      <th style={{ padding: '10px 8px' }}>Reports</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                      <th style={{ padding: '10px 8px' }}>Worker</th>
                      <th style={{ padding: '10px 8px' }}>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr 
                        key={inc.id}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        style={{ 
                          borderBottom: '1px solid var(--border-light)', 
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          background: selectedIncidentId === inc.id ? 'rgba(0, 242, 254, 0.04)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        className="incident-row"
                      >
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ 
                            fontWeight: 800, 
                            fontSize: '0.9rem',
                            color: inc.priority_score >= 70 ? 'var(--color-critical)' : '#fff' 
                          }}>
                            {inc.priority_score}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{inc.category}</div>
                          <div>
                            <span className={`badge ${getSeverityBadgeClass(inc.severity)}`} style={{ padding: '1px 5px', fontSize: '0.65rem' }}>
                              {inc.severity}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} /> {inc.report_count}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: getStatusColor(inc.status) }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(inc.status) }} />
                            {inc.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>
                          {inc.assigned_worker || 'Unassigned'}
                        </td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inc.address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Drilling Incident detail panel */}
        {selectedIncidentId && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignSelf: 'start', position: 'sticky', top: '90px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            
            {/* Detail panel header */}
            <div className="flex-row-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <div>
                <span className="form-label" style={{ marginBottom: '2px' }}>INCIDENT DETAILED DOSSIER</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedIncidentId}</span>
              </div>
              <button 
                onClick={() => { setSelectedIncidentId(null); setSelectedDetails(null); }} 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Close Panel
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex-row-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '15px' }}>
                <Loader style={{ animation: 'spin 1.5s infinite linear', color: 'var(--primary-neon)' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Accessing data logs...</span>
              </div>
            ) : selectedDetails ? (
              <>
                {/* Incident General Info Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  
                  {/* Left block info */}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>{selectedDetails.incident.category}</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span className={`badge ${getSeverityBadgeClass(selectedDetails.incident.severity)}`}>
                        {selectedDetails.incident.severity}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        Status: <strong style={{ color: getStatusColor(selectedDetails.incident.status) }}>{selectedDetails.incident.status}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', flexDirection: 'column' }}>
                      <div><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{selectedDetails.incident.address}</div>
                      <div>Lat/Lng: {selectedDetails.incident.latitude.toFixed(5)}, {selectedDetails.incident.longitude.toFixed(5)}</div>
                      <div>Created: {new Date(selectedDetails.incident.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Priority Indicator Block */}
                  <div className="flex-row-center" style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRIORITY</span>
                    <div className="priority-circle text-gradient" style={{ width: '70px', height: '70px', fontSize: '1.75rem', border: '1.5px solid var(--primary-neon)', boxShadow: '0 0 15px rgba(0, 242, 254, 0.15)', margin: '8px 0' }}>
                      {selectedDetails.incident.priority_score}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deterministic Score</span>
                  </div>

                </div>

                {/* Worker and Dispatch block */}
                <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                    <div>
                      <strong>Field Worker:</strong>
                      <div style={{ color: 'var(--primary-neon)', fontWeight: 600, marginTop: '4px' }}>
                        {selectedDetails.incident.assigned_worker || 'Not Assigned'}
                      </div>
                    </div>
                    <div>
                      <strong>Dispatch Notes:</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                        {selectedDetails.incident.dispatch_notes || 'No dispatch logs.'}
                      </div>
                    </div>
                  </div>
                  
                  {selectedDetails.incident.resolution_evidence_url && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong>Resolution Evidence Proof:</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-neon)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ZoomIn size={14} /> Click to Enlarge
                        </span>
                      </div>
                      <div 
                        onClick={() => setModalImage({
                          url: `http://localhost:5000${selectedDetails.incident.resolution_evidence_url}`,
                          title: 'Resolution Proof Evidence',
                          subtitle: selectedDetails.incident.assigned_worker ? `Resolved by ${selectedDetails.incident.assigned_worker}` : 'Authority Resolution Evidence',
                          description: selectedDetails.incident.dispatch_notes || 'Official proof of work completion.',
                          badge: 'Resolution Proof'
                        })}
                        style={{ 
                          width: '100%', 
                          height: '150px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '1px solid var(--border-light)', 
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'transform 0.2s ease, border-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary-neon)';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-light)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img 
                          src={`http://localhost:5000${selectedDetails.incident.resolution_evidence_url}`} 
                          alt="Resolution Proof" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', 
                          padding: '6px 10px', 
                          fontSize: '0.75rem', 
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Maximize2 size={13} style={{ color: 'var(--primary-neon)' }} /> View Full Image
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Forms / Workflow transitions Panel */}
                <div className="glass-card" style={{ borderColor: 'rgba(155, 81, 224, 0.25)', background: 'rgba(155, 81, 224, 0.01)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary-neon)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    Dispatch Control Actions
                  </h4>

                  {actionError && (
                    <div style={{ color: '#ff4d88', fontSize: '0.8rem', marginBottom: '10px' }}>
                      ⚠️ {actionError}
                    </div>
                  )}
                  {actionSuccess && (
                    <div style={{ color: 'var(--color-low)', fontSize: '0.8rem', marginBottom: '10px' }}>
                      ✓ {actionSuccess}
                    </div>
                  )}

                  {/* 1. Step: AI Analysed -> Verify */}
                  {selectedDetails.incident.status === 'Reported' || selectedDetails.incident.status === 'AI Analysed' ? (
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Verify the incident to acknowledge the civic intelligence and push to workflow.
                      </p>
                      <button 
                        onClick={() => handleTransition('verify')}
                        disabled={submittingAction}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Verify Incident Presence
                      </button>
                    </div>
                  ) : null}

                  {/* 2. Step: Verified -> Assign */}
                  {selectedDetails.incident.status === 'Verified' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <select 
                        onChange={(e) => setWorkerName(e.target.value)}
                        value={workerName}
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'var(--bg-main)', color: '#fff' }}
                      >
                        <option value="">-- Suggest Predefined Worker --</option>
                        {PREDEFINED_WORKERS.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Or enter custom worker name..."
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                      <button 
                        onClick={() => handleTransition('assign', { workerName })}
                        disabled={submittingAction || !workerName}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Assign Field Worker
                      </button>
                    </div>
                  ) : null}

                  {/* 3. Step: Assigned -> Dispatch */}
                  {selectedDetails.incident.status === 'Assigned' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <select 
                        onChange={(e) => setDispatchNotes(e.target.value)}
                        value={dispatchNotes}
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'var(--bg-main)', color: '#fff' }}
                      >
                        <option value="">-- Suggest Predefined Team Directive --</option>
                        {PREDEFINED_DISPATCH.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <textarea 
                        placeholder="Or enter custom team dispatch directives..."
                        value={dispatchNotes}
                        onChange={(e) => setDispatchNotes(e.target.value)}
                        className="form-input"
                        rows="2"
                        style={{ padding: '8px 12px', fontSize: '0.85rem', resize: 'none' }}
                      />
                      <button 
                        onClick={() => handleTransition('dispatch', { dispatchNotes })}
                        disabled={submittingAction || !dispatchNotes}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Dispatch Field Team
                      </button>
                    </div>
                  ) : null}

                  {/* 4. Step: Dispatched -> In Progress */}
                  {selectedDetails.incident.status === 'Dispatched' ? (
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Confirm that the dispatched team has arrived on site and work is active.
                      </p>
                      <button 
                        onClick={() => handleTransition('start-work')}
                        disabled={submittingAction}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Mark In Progress
                      </button>
                    </div>
                  ) : null}

                  {/* 5. Step: In Progress -> Resolved */}
                  {selectedDetails.incident.status === 'In Progress' ? (
                    <form onSubmit={handleResolveUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span className="form-label" style={{ fontSize: '0.7rem' }}>Resolution Photo Proof (Required)</span>
                      
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setEvidenceFile(e.target.files[0])}
                        style={{ fontSize: '0.8rem' }}
                        required
                      />
                      
                      <input 
                        type="text" 
                        placeholder="Resolution summary notes..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        className="form-input"
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                      
                      <button 
                        type="submit"
                        disabled={submittingAction || !evidenceFile}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Resolve & Upload Evidence
                      </button>
                    </form>
                  ) : null}

                  {/* 6. Step: Resolved -> Closed */}
                  {selectedDetails.incident.status === 'Resolved' ? (
                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Verify the resolution evidence photo. Close incident to archive.
                      </p>
                      <button 
                        onClick={() => handleTransition('close')}
                        disabled={submittingAction}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Approve & Close Incident
                      </button>
                    </div>
                  ) : null}

                  {selectedDetails.incident.status === 'Closed' ? (
                    <div style={{ color: 'var(--color-low)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                      ✓ This incident is closed and archived.
                    </div>
                  ) : null}
                </div>

                {/* List of grouped citizen reports */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Users size={16} /> Grouped Reports ({selectedDetails.reports.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedDetails.reports.map((rep) => (
                      <div 
                        key={rep.id} 
                        style={{ 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '10px', 
                          padding: '12px',
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr',
                          gap: '12px',
                          alignItems: 'start'
                        }}
                      >
                        {/* Clickable Image Thumbnail with Zoom Overlay */}
                        <div 
                          onClick={() => setModalImage({
                            url: `http://localhost:5000${rep.image_url}`,
                            title: `Citizen Evidence — ${rep.citizen_name}`,
                            subtitle: `Reported on ${new Date(rep.created_at).toLocaleString()}`,
                            description: rep.description || 'No additional user notes provided.',
                            summary: rep.ai_summary,
                            badge: 'Citizen Evidence',
                            problem: rep.ai_problem,
                            category: rep.ai_category,
                            severity: rep.ai_severity
                          })}
                          style={{ 
                            height: '80px', 
                            borderRadius: '8px', 
                            overflow: 'hidden', 
                            border: '1px solid var(--border-light)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            background: 'rgba(0,0,0,0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-neon)';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-light)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          title="Click to view full-size image"
                        >
                          <img 
                            src={`http://localhost:5000${rep.image_url}`} 
                            alt="Citizen evidence" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                          >
                            <ZoomIn size={20} color="#fff" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }} />
                          </div>
                        </div>
                        
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: '#fff' }}>{rep.citizen_name}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              {new Date(rep.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '6px', fontStyle: 'italic' }}>
                            "{rep.description || 'No description'}"
                          </div>
                          <div style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,242,254,0.1)', padding: '5px 8px', borderRadius: '6px', color: 'var(--primary-neon)', lineHeight: 1.4 }}>
                            <strong>AI Summary:</strong> {rep.ai_summary}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit status history log */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Incident Status Logs</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '1px solid var(--border-light)', paddingLeft: '14px', marginLeft: '6px' }}>
                    {selectedDetails.history.map((hist) => (
                      <div key={hist.id} style={{ fontSize: '0.78rem', position: 'relative' }}>
                        {/* Dot indicator */}
                        <div style={{ 
                          position: 'absolute', 
                          left: '-18px', 
                          top: '4px', 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: getStatusColor(hist.status)
                        }} />
                        
                        <div>
                          <strong style={{ color: getStatusColor(hist.status) }}>{hist.status}</strong>
                          <span style={{ color: 'var(--text-muted)' }}> by {hist.actor_name}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {new Date(hist.created_at).toLocaleString()}
                        </div>
                        <div style={{ color: '#fff', marginTop: '2px' }}>
                          {hist.notes}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

          </div>
        )}

      </div>

      {/* ─── Lightbox Image Popup Modal ─── */}
      {modalImage && (
        <div 
          onClick={() => setModalImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="glass-card"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              overflow: 'hidden',
              background: 'var(--bg-main)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.15)',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-light)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: modalImage.badge === 'Resolution Proof' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                  color: modalImage.badge === 'Resolution Proof' ? 'var(--color-low)' : 'var(--primary-neon)',
                  border: `1px solid ${modalImage.badge === 'Resolution Proof' ? 'rgba(0, 230, 118, 0.3)' : 'rgba(0, 242, 254, 0.3)'}`
                }}>
                  {modalImage.badge}
                </span>
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: '#fff', margin: 0 }}>
                    {modalImage.title}
                  </h3>
                  {modalImage.subtitle && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {modalImage.subtitle}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a 
                  href={modalImage.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={13} /> Open Tab
                </a>
                <button 
                  onClick={() => setModalImage(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 0, 85, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image Area */}
            <div style={{
              background: '#070b13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxHeight: '58vh',
              overflow: 'hidden',
              padding: '12px'
            }}>
              <img 
                src={modalImage.url} 
                alt="Enlarged Evidence" 
                style={{
                  maxWidth: '100%',
                  maxHeight: '55vh',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}
              />
            </div>

            {/* Modal Details / Meta Info */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-light)',
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: '0.85rem'
            }}>
              {modalImage.description && (
                <div style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#fff' }}>User Description:</strong> "{modalImage.description}"
                </div>
              )}
              {modalImage.summary && (
                <div style={{
                  background: 'rgba(0, 242, 254, 0.06)',
                  border: '1px solid rgba(0, 242, 254, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--primary-neon)',
                  fontSize: '0.8rem',
                  lineHeight: 1.4
                }}>
                  <strong>AI Analysis Summary:</strong> {modalImage.summary}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
