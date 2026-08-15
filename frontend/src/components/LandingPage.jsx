import React from 'react';
import { Shield, Eye, Flame, MapPin, CheckCircle, ArrowRight, Zap, RefreshCw, BarChart2 } from 'lucide-react';

export default function LandingPage({ onNavigate, user, onLogout }) {
  return (
    <div className="landing-page" style={{ paddingBottom: '80px' }}>
      
      {/* 1. Navbar */}
      <header className="navbar">
        <div className="container flex-row-between" style={{ height: '100%' }}>
          <div className="nav-logo">
            <Zap size={22} className="neon-text" />
            <span>Civic<span className="neon-text">Pulse</span> <span style={{ fontSize: '0.75rem', verticalAlign: 'super', background: 'rgba(0,242,254,0.1)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary-neon)' }}>AI</span></span>
          </div>
          
          <nav className="nav-links">
            {user ? (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Logged in as <strong style={{ color: '#fff' }}>{user.name}</strong> ({user.role})
                </span>
                
                {user.role === 'civilian' ? (
                  <button onClick={() => onNavigate('civilian')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    My Portal
                  </button>
                ) : (
                  <button onClick={() => onNavigate('admin')} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    Dashboard
                  </button>
                )}

                <button onClick={onLogout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => onNavigate('login')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Sign In
                </button>
                <button onClick={() => onNavigate('register')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', boxShadow: 'none' }}>
                  Register
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="hero container">
        <div style={{ display: 'inline-block', background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '6px 16px', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-neon)', letterSpacing: '0.05em', marginBottom: '24px' }}>
          NEXT-GEN CIVIC INTELLIGENCE PLATFORM
        </div>
        <h1 className="text-gradient" style={{ fontSize: '3.6rem', marginBottom: '20px', lineHeight: 1.15 }}>
          AI-Powered Urban Intelligence <br />& Civic Response
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '750px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Citizens report problems. AI analyzes and classifies the severity. CivicPulse priority engines compute response rankings, allowing authorities to act efficiently.
        </p>
        
        <div className="flex-row-center" style={{ gap: '16px', flexWrap: 'wrap' }}>
          {user && user.role === 'admin' ? (
            <button onClick={() => onNavigate('admin')} className="btn btn-primary" style={{ padding: '14px 28px' }}>
              Access Admin Console <ArrowRight size={18} />
            </button>
          ) : (
            <button onClick={() => onNavigate(user ? 'civilian' : 'login')} className="btn btn-primary" style={{ padding: '14px 28px' }}>
              Report a Civic Issue <ArrowRight size={18} />
            </button>
          )}
          
          {!user && (
            <button onClick={() => onNavigate('login', { defaultAdmin: true })} className="btn btn-secondary" style={{ padding: '14px 28px' }}>
              Authority Portal
            </button>
          )}
        </div>
      </section>

      {/* 3. Core Value Proposition Banner */}
      <section className="container" style={{ marginTop: '40px', marginBottom: '60px' }}>
        <div className="glass-card flex-row-center" style={{ padding: '24px 40px', textAlign: 'center', borderColor: 'rgba(155, 81, 224, 0.2)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.5 }}>
            ⚡ <span className="neon-text" style={{ fontWeight: 700 }}>CivicPulse AI</span> converts raw complaints into structured, prioritized, actionable urban intelligence.
          </h3>
        </div>
      </section>

      {/* 4. Core Problems & AI Solutions */}
      <section className="container grid-2" style={{ marginBottom: '80px', gap: '30px' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(255, 0, 85, 0.1)', color: 'var(--color-critical)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Flame size={24} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>The Legacy Problem</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Traditional complaint forms store unstructured reports in endless queues. They fail to understand what the issue is, ignore physical proximity duplicates, and provide no logical prioritization. As a result, critical safety hazards remain unaddressed for weeks while trivial complaints jam the system.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderColor: 'rgba(0, 242, 254, 0.2)' }}>
          <div style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary-neon)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Eye size={24} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>The CivicPulse Solution</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            CivicPulse feeds photos and descriptions directly into an AI model for category and severity detection. A mathematical engine calculates a priority score (0–100) based on location risks, while a spatial clustering algorithm automatically groups multiple citizen reports into a single, unified civic incident.
          </p>
        </div>
      </section>

      {/* 5. How It Works - Step Workflow */}
      <section className="container" style={{ marginBottom: '80px' }}>
        <h2 style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '40px' }} className="text-gradient">
          System Workflow Architecture
        </h2>
        
        <div className="grid-3" style={{ gap: '20px' }}>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-neon)', marginBottom: '10px' }}>01</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Citizen Submission</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Upload or snap a photo of the incident, write a description, and select the location on our interactive Delhi map.
            </p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', borderColor: 'rgba(155,81,224,0.15)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary-neon)', marginBottom: '10px' }}>02</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Multimodal AI Scan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              The server sends assets to Gemini AI to extract the issue class, verify severity, and generate structured summaries.
            </p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-neon)', marginBottom: '10px' }}>03</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Priority & Grouping</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              The backend groups coordinates within 100 meters, computes the 0–100 priority score, and alerts the admin team.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Highlight: Math Priority Engine */}
      <section className="container" style={{ marginBottom: '80px' }}>
        <div className="glass-card grid-2" style={{ alignItems: 'center', padding: '40px', gap: '30px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary-neon)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
              <BarChart2 size={16} /> Deterministic Priority Algorithm
            </div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', lineHeight: 1.2 }}>
              Priority scores calculated on factors, not guesses
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Our proprietary scoring system calculates priority scores dynamically using structured metrics rather than qualitative models:
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '20px', lineHeight: 1.8 }}>
              <li><strong>Base Weights</strong>: Assigned by problem category and detected severity level.</li>
              <li><strong>Vulnerability Multiplier</strong>: Boosts score by 10 points if near metro stations, hospitals, schools, or highways.</li>
              <li><strong>Citizen Count Bonus</strong>: Increments priority as duplicate reports cluster, emphasizing popular concerns.</li>
            </ul>
          </div>
          
          <div className="flex-row-center" style={{ background: 'rgba(10,15,30,0.6)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '40px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span className="badge badge-critical">Critical Severity (50)</span>
              <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>+</span>
              <span className="badge badge-low" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary-neon)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>Road Infra (25)</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>Proximity: School (+10) | Duplicates: 3 (+10)</div>
            <div className="priority-circle text-gradient" style={{ width: '120px', height: '120px', fontSize: '2.5rem', border: '2px solid var(--primary-neon)', boxShadow: '0 0 25px rgba(0, 242, 254, 0.25)', margin: '15px 0' }}>
              95
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>Civic Priority Score</div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', paddingTop: '30px', marginTop: '60px' }}>
        <div className="container flex-row-between" style={{ flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            &copy; 2026 CivicPulse AI. Developed for <strong>BrainWave 2026 Hackathon</strong>.
          </div>
          <div style={{ fontSize: '0.85rem', display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" onClick={() => { onNavigate('login', { defaultAdmin: true }) }} style={{ color: 'var(--primary-neon)', textDecoration: 'none', fontWeight: 600 }}>Authority Login</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
