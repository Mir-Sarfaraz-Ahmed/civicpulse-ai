import React, { useState, useEffect } from 'react';
import { Camera, Image, MapPin, Search, PlusCircle, List, ArrowLeft, ArrowRight, Loader, Check, Trash2, HelpCircle } from 'lucide-react';
import MapComponent from './MapComponent';

const API_BASE = 'http://localhost:5000/api';

export default function CivilianPortal({ token, onBackToLanding }) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'report'
  const [reports, setReports] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form Reporting States
  const [reportStep, setReportStep] = useState(1); // 1: Image, 2: Location, 3: AI Analysis, 4: Success
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState({ lat: 28.6139, lng: 77.2295, address: 'Delhi, India' });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // Action Loading states
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch civilian reports on load
  useEffect(() => {
    if (activeTab === 'list') {
      fetchMyReports();
    }
  }, [activeTab]);

  const fetchMyReports = async () => {
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE}/reports/my-reports`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setReports(data);
      } else {
        setErrorMsg(data.error || 'Failed to load reports.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error fetching reports.');
    } finally {
      setLoadingList(false);
    }
  };

  // Handle Image picker change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErrorMsg(null);
    }
  };

  // Trigger server-side AI analysis
  const handleRunAnalysis = async () => {
    if (!selectedImage) {
      setErrorMsg('Please select or capture an image first.');
      return;
    }
    setAnalyzing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('description', description);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);

    try {
      const response = await fetch(`${API_BASE}/reports/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setAiAnalysis(data.analysis);
        setReportStep(3); // move to review step
      } else {
        setErrorMsg(data.error || 'AI analysis failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error during AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit final report to database
  const handleSubmitReport = async () => {
    if (!aiAnalysis) return;
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      imageUrl: aiAnalysis.imageUrl || '', // returned from analyze step as temporary url
      description,
      latitude: location.lat,
      longitude: location.lng,
      address: location.address,
      ai_problem: aiAnalysis.problem,
      ai_category: aiAnalysis.category,
      ai_severity: aiAnalysis.severity,
      ai_summary: aiAnalysis.summary
    };

    // If image url is not in analysis root, let's use the analysis request result url
    if (aiAnalysis.imageUrl === undefined) {
      // Find the url returned alongside analysis
      // In the backend response: { imageUrl: "/uploads/file.png", analysis: { problem: ... } }
      // So we must handle how the analysis state was saved.
      // We will look for how we set state in handleRunAnalysis
    }

    try {
      // Set image url correctly from our state structure
      // Wait, in handleRunAnalysis: setAiAnalysis(data.analysis); and image url was data.imageUrl.
      // Let's pass the correct imageUrl from response
      const response = await fetch(`${API_BASE}/reports/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payload,
          imageUrl: selectedImage ? (window.lastUploadedUrl || aiAnalysis.imageUrl || '') : ''
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setTrackingId(data.reportId);
        setReportStep(4); // Success step
      } else {
        setErrorMsg(data.error || 'Submission failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Modify handleRunAnalysis to store the uploaded image URL returned from Express
  const handleRunAnalysisAndUpload = async () => {
    if (!selectedImage) {
      setErrorMsg('Please select or capture an image first.');
      return;
    }
    setAnalyzing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('description', description);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);

    try {
      const response = await fetch(`${API_BASE}/reports/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        // Save the image URL in a global or state variable so we can use it in final submission
        window.lastUploadedUrl = data.imageUrl;
        setAiAnalysis(data.analysis);
        setReportStep(3); // Move to review step
      } else {
        setErrorMsg(data.error || 'AI analysis failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error during AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Withdraw/Delete report
  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to permanently delete/withdraw this report? This action is irreversible.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        fetchMyReports(); // reload list
      } else {
        alert(data.error || 'Failed to delete report.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting report.');
    }
  };

  // Clean form and restart
  const resetForm = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setDescription('');
    setLocation({ lat: 28.6139, lng: 77.2295, address: 'Delhi, India' });
    setAiAnalysis(null);
    setTrackingId(null);
    setReportStep(1);
    setErrorMsg(null);
    setActiveTab('list');
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
    <div className="civilian-portal container" style={{ paddingTop: '30px', paddingBottom: '80px' }}>
      
      {/* Portal Header */}
      <div className="flex-row-between" style={{ marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <button onClick={onBackToLanding} className="btn btn-secondary" style={{ padding: '8px 12px', marginBottom: '10px' }}>
            <ArrowLeft size={16} /> Back to Home
          </button>
          <h1 style={{ fontSize: '2rem' }}>Civilian Reporting Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Submit and monitor local urban incidents</p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
          <button 
            onClick={() => setActiveTab('list')} 
            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', boxShadow: activeTab === 'list' ? 'var(--shadow-neon)' : 'none' }}
          >
            <List size={16} /> My Submissions
          </button>
          <button 
            onClick={() => { setActiveTab('report'); resetForm(); }} 
            className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem', border: 'none', boxShadow: activeTab === 'report' ? 'var(--shadow-neon)' : 'none' }}
          >
            <PlusCircle size={16} /> File New Report
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(255,0,85,0.1)', border: '1px solid rgba(255,0,85,0.3)', color: '#ff4d88', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.9rem' }}>
          <strong>Error: </strong>{errorMsg}
        </div>
      )}

      {/* --- TAB 1: LIST MY REPORTS --- */}
      {activeTab === 'list' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Your Filed Incidents</h2>

          {loadingList ? (
            <div className="flex-row-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '15px' }}>
              <Loader className="pulse-glow" style={{ animation: 'spin 1.5s infinite linear', color: 'var(--primary-neon)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Retrieving submitted reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <HelpCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '1rem', marginBottom: '20px' }}>You have not submitted any reports yet.</p>
              <button onClick={() => setActiveTab('report')} className="btn btn-primary">
                File Your First Report <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 8px' }}>Tracking ID</th>
                    <th style={{ padding: '12px 8px' }}>Issue Class</th>
                    <th style={{ padding: '12px 8px' }}>Address</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Priority</th>
                    <th style={{ padding: '12px 8px' }}>Submitted</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--primary-neon)' }}>
                        {rep.id.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontWeight: 600 }}>{rep.ai_problem}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.ai_category}</div>
                      </td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rep.address}
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: getStatusColor(rep.status) }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(rep.status) }} />
                          {rep.status || 'Reported'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        {rep.priority_score !== null ? (
                          <span style={{ fontWeight: 700, color: rep.priority_score >= 70 ? 'var(--color-critical)' : '#fff' }}>
                            {rep.priority_score}/100
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(rep.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteReport(rep.id)} 
                          className="btn btn-danger" 
                          title="Withdraw Report"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: MULTI-STEP REPORT FLOW --- */}
      {activeTab === 'report' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Step Progress indicators */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '2px', background: 'var(--border-light)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '15px', left: '10%', width: reportStep === 2 ? '40%' : reportStep >= 3 ? '80%' : '0%', height: '2px', background: 'var(--primary-neon)', zIndex: 2, transition: 'width 0.3s' }} />

            <div style={{ zIndex: 3, textAlign: 'center', width: '20%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reportStep >= 1 ? 'var(--primary-neon)' : 'var(--bg-main)', border: '2px solid var(--primary-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: '#070913', fontWeight: 700 }}>
                {reportStep > 1 ? <Check size={16} /> : '1'}
              </div>
              <span style={{ fontSize: '0.75rem', color: reportStep >= 1 ? '#fff' : 'var(--text-muted)' }}>Evidence</span>
            </div>

            <div style={{ zIndex: 3, textAlign: 'center', width: '20%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reportStep >= 2 ? 'var(--primary-neon)' : 'var(--bg-main)', border: '2px solid ' + (reportStep >= 2 ? 'var(--primary-neon)' : 'var(--border-light)'), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: reportStep >= 2 ? '#070913' : 'var(--text-muted)', fontWeight: 700 }}>
                {reportStep > 2 ? <Check size={16} /> : '2'}
              </div>
              <span style={{ fontSize: '0.75rem', color: reportStep >= 2 ? '#fff' : 'var(--text-muted)' }}>Location</span>
            </div>

            <div style={{ zIndex: 3, textAlign: 'center', width: '20%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reportStep >= 3 ? 'var(--primary-neon)' : 'var(--bg-main)', border: '2px solid ' + (reportStep >= 3 ? 'var(--primary-neon)' : 'var(--border-light)'), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: reportStep >= 3 ? '#070913' : 'var(--text-muted)', fontWeight: 700 }}>
                {reportStep > 3 ? <Check size={16} /> : '3'}
              </div>
              <span style={{ fontSize: '0.75rem', color: reportStep >= 3 ? '#fff' : 'var(--text-muted)' }}>Review</span>
            </div>

            <div style={{ zIndex: 3, textAlign: 'center', width: '20%' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: reportStep >= 4 ? 'var(--primary-neon)' : 'var(--bg-main)', border: '2px solid ' + (reportStep >= 4 ? 'var(--primary-neon)' : 'var(--border-light)'), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: reportStep >= 4 ? '#070913' : 'var(--text-muted)', fontWeight: 700 }}>
                {reportStep >= 4 ? <Check size={16} /> : '4'}
              </div>
              <span style={{ fontSize: '0.75rem', color: reportStep >= 4 ? '#fff' : 'var(--text-muted)' }}>Success</span>
            </div>
          </div>

          {/* --- STEP 1: IMAGE CAPTURE / UPLOAD --- */}
          {reportStep === 1 && (
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 1: Upload Incident Photo</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Provide visual evidence of the civic issue. Camera capture is supported on mobile devices.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', margin: '30px 0' }}>
                {imagePreview ? (
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', height: '240px', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => { setSelectedImage(null); setImagePreview(null); }} 
                      className="btn btn-danger"
                      style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Replace Image
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '400px', flexDirection: 'column' }}>
                    {/* Camera Capture Option */}
                    <label className="btn btn-secondary" style={{ padding: '24px', flexDirection: 'column', height: '120px', borderStyle: 'dashed', borderColor: 'var(--primary-neon)' }}>
                      <Camera size={32} className="neon-text" style={{ marginBottom: '8px' }} />
                      <span>Take Photo (Camera)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    
                    {/* Gallery Upload Option */}
                    <label className="btn btn-secondary" style={{ padding: '20px', flexDirection: 'column', height: '100px', borderStyle: 'dashed' }}>
                      <Image size={24} style={{ marginBottom: '8px', color: 'var(--text-muted)' }} />
                      <span>Choose from Gallery</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                )}

                {/* Description Input */}
                <div style={{ width: '100%', marginTop: '20px' }}>
                  <label className="form-label">Optional Description / Details</label>
                  <textarea 
                    placeholder="Enter details like landmarks, description of damage, or specific safety concerns (e.g. near school gate)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                    rows="3"
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div className="flex-row-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '30px' }}>
                <span />
                <button 
                  onClick={() => setReportStep(2)} 
                  disabled={!selectedImage}
                  className="btn btn-primary"
                >
                  Next: Add Location <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 2: LOCATION SELECT --- */}
          {reportStep === 2 && (
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 2: Pinpoint Location</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Move the map marker, search, or auto-detect your coordinates inside Delhi/India.</p>
              
              <div style={{ height: '380px', width: '100%', marginBottom: '20px' }}>
                <MapComponent 
                  mode="pick"
                  value={location}
                  onChange={(newLoc) => setLocation(prev => ({ ...prev, ...newLoc }))}
                />
              </div>

              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', marginBottom: '24px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--primary-neon)', marginBottom: '4px' }}>Selected Coordinates:</div>
                <div style={{ fontFamily: 'monospace' }}>Lat: {location.lat.toFixed(6)} | Lng: {location.lng.toFixed(6)}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Address: {location.address}</div>
              </div>

              <div className="flex-row-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '30px' }}>
                <button onClick={() => setReportStep(1)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
                <button 
                  onClick={handleRunAnalysisAndUpload} 
                  disabled={analyzing}
                  className="btn btn-primary"
                >
                  {analyzing ? (
                    <>
                      <Loader style={{ animation: 'spin 1.5s infinite linear' }} size={16} />
                      Analyzing Issue...
                    </>
                  ) : (
                    <>
                      Run AI Analysis <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 3: REVIEW AI ANALYSIS --- */}
          {reportStep === 3 && aiAnalysis && (
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 3: Review AI Diagnosis</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Confirm the Gemini AI structured classification and submit.</p>
              
              <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
                
                {/* Image & Description Block */}
                <div>
                  <div style={{ width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)', marginBottom: '12px' }}>
                    <img src={imagePreview} alt="Incident" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    <strong>User Notes: </strong>{description || 'No notes provided.'}
                  </div>
                </div>

                {/* AI diagnosis block */}
                <div className="glass-card" style={{ borderColor: 'rgba(0,242,254,0.2)', background: 'rgba(0, 242, 254, 0.02)' }}>
                  <div style={{ color: 'var(--primary-neon)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                    🤖 GEMINI MULTIMODAL DIAGNOSIS
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Detected Issue</label>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{aiAnalysis.problem}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ marginBottom: '4px' }}>Category</label>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{aiAnalysis.category}</div>
                    </div>
                    <div>
                      <label className="form-label" style={{ marginBottom: '4px' }}>AI Severity</label>
                      <span className={`badge badge-${aiAnalysis.severity.toLowerCase()}`}>
                        {aiAnalysis.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom: '4px' }}>Summary</label>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {aiAnalysis.summary}
                    </div>
                  </div>
                </div>

              </div>

              {aiAnalysis.isFallback && (
                <div style={{ background: 'rgba(255,204,0,0.05)', border: '1px solid rgba(255,204,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--color-medium)' }}>
                  💡 <strong>Demo Mode Note:</strong> Gemini API Key was unconfigured or inaccessible. Analysis was processed via local heuristic backup engine.
                </div>
              )}

              <div className="flex-row-between" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '30px' }}>
                <button onClick={() => setReportStep(2)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
                <button 
                  onClick={handleSubmitReport} 
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (
                    <>
                      <Loader style={{ animation: 'spin 1.5s infinite linear' }} size={16} />
                      Submitting Report...
                    </>
                  ) : (
                    <>
                      Submit Report & Calculate Priority <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 4: SUCCESS TRACKING --- */}
          {reportStep === 4 && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--color-low)', border: '2px solid var(--color-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={32} />
              </div>
              
              <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Report Successfully Submitted!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 30px', lineHeight: 1.6 }}>
                CivicPulse has registered the issue. Our duplicate grouping detector and priority score engines have queued this incident for authority action.
              </p>

              <div className="glass-card" style={{ maxWidth: '450px', margin: '0 auto 30px', padding: '20px', borderColor: 'var(--primary-neon)' }}>
                <span className="form-label" style={{ marginBottom: '6px' }}>Your Incident Tracking ID</span>
                <div style={{ fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-neon)', background: 'rgba(0,242,254,0.05)', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(0,242,254,0.3)', letterSpacing: '0.05em' }}>
                  {trackingId}
                </div>
              </div>

              <div className="flex-row-center" style={{ gap: '12px' }}>
                <button onClick={resetForm} className="btn btn-primary">
                  View My Submissions
                </button>
                <button 
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setDescription('');
                    setLocation({ lat: 28.6139, lng: 77.2295, address: 'Delhi, India' });
                    setAiAnalysis(null);
                    setTrackingId(null);
                    setReportStep(1);
                    setErrorMsg(null);
                  }} 
                  className="btn btn-secondary"
                >
                  File Another Report
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
