import React, { useState, useEffect } from 'react';
import { Shield, Eye, Flame, MapPin, CheckCircle, ArrowLeft, ArrowRight, Loader, Zap, Key, Mail, User, Info, Database } from 'lucide-react';
import LandingPage from './components/LandingPage';
import CivilianPortal from './components/CivilianPortal';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './supabaseClient';
import { API_BASE } from './config';

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'login', 'register', 'civilian', 'admin'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);


  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const resolveRole = (supaUser) => {
    if (!supaUser) return 'civilian';
    if (supaUser.user_metadata?.role === 'admin') return 'admin';
    const em = (supaUser.email || '').toLowerCase();
    if (em.includes('admin') || em.endsWith('@civilpulse.gov.in')) return 'admin';
    return 'civilian';
  };

  const resolveName = (supaUser) => {
    if (!supaUser) return 'Citizen';
    const metaName = supaUser.user_metadata?.name || supaUser.user_metadata?.full_name;
    if (metaName && metaName.trim() && !metaName.includes('@')) {
      return metaName.trim();
    }
    // Check locally saved name cache for this account
    try {
      const cached = localStorage.getItem(`civicpulse_name_${supaUser.id}`) || localStorage.getItem(`civicpulse_name_${supaUser.email}`);
      if (cached && cached.trim()) return cached.trim();
    } catch (e) {}

    // Formatted name from email prefix (e.g. mirsarfarazahmedpw -> Mir Sarfaraz Ahmed)
    const emailPrefix = (supaUser.email || '').split('@')[0] || '';
    if (emailPrefix) {
      const cleaned = emailPrefix.replace(/[._-]/g, ' ').replace(/\d+/g, '').replace(/pw$/i, '').trim();
      if (cleaned.length > 2) {
        return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
      return emailPrefix;
    }
    return 'Citizen';
  };

  // Verify Supabase session on load — protect private pages
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const sessionUser = session.user;
        const role = resolveRole(sessionUser);
        const displayName = resolveName(sessionUser);
        setToken(session.access_token);
        setUser({ id: sessionUser.id, email: sessionUser.email, name: displayName, role });
      } else {
        // No active Supabase session — clear any stale local data
        localStorage.removeItem('civicpulse_token');
        localStorage.removeItem('civicpulse_user');
        setToken(null);
        setUser(null);
        // If on a private page, kick back to login
        setPage((prev) => (prev === 'civilian' || prev === 'admin') ? 'login' : prev);
      }
    };
    checkSession();

    // Listen for auth state changes (e.g. sign-out in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setToken(null);
        setUser(null);
        setPage((prev) => (prev === 'civilian' || prev === 'admin') ? 'login' : prev);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (targetPage, options = {}) => {
    setErrorMsg(null);
    // Only clear successMsg if not explicitly keeping it (e.g. post-signup redirect)
    if (!options.keepSuccess) setSuccessMsg(null);
    setPage(targetPage);
    
    // Quick fill helper for admin login option
    if (targetPage === 'login') {
      if (options.defaultAdmin) {
        setEmail('admin@gmail.com');
        setPassword('31102006');
      } else if (!options.keepEmail) {
        // Only clear email if not coming from a signup redirect
        setEmail('');
        setPassword('');
      } else {
        // Keep email, clear password only
        setPassword('');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('civicpulse_token');
    localStorage.removeItem('civicpulse_user');
    setToken(null);
    setUser(null);
    setPage('landing');
  };

  const saveAuthSession = (tokenStr, userObj) => {
    localStorage.setItem('civicpulse_token', tokenStr);
    localStorage.setItem('civicpulse_user', JSON.stringify(userObj));
    setToken(tokenStr);
    setUser(userObj);
  };

  // Standard Email + Password Register (Civilian/Admin) — via Supabase Auth
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    const assignedRole = email.toLowerCase().includes('admin') || email.toLowerCase().endsWith('@civilpulse.gov.in') ? 'admin' : 'civilian';
    const submittedName = name.trim();

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: submittedName || email.split('@')[0],
            full_name: submittedName || email.split('@')[0],
            role: assignedRole
          }
        }
      });

      if (signUpError) {
        setErrorMsg(signUpError.message || 'Registration failed.');
        return;
      }

      // Cache name locally for immediate retrieval
      if (submittedName) {
        localStorage.setItem(`civicpulse_name_${email}`, submittedName);
        if (signUpData?.user?.id) {
          localStorage.setItem(`civicpulse_name_${signUpData.user.id}`, submittedName);
        }
      }

      // If Supabase returned a session directly (email confirmation disabled)
      if (signUpData.session) {
        const sessionUser = signUpData.user;
        const sessionToken = signUpData.session.access_token;
        const role = resolveRole(sessionUser);
        const displayName = submittedName || resolveName(sessionUser);
        saveAuthSession(sessionToken, { id: sessionUser.id, email: sessionUser.email, name: displayName, role });
        setPage(role === 'admin' ? 'admin' : 'civilian');
        return;
      }

      // No session → email confirmation is required.
      // Redirect to login with email pre-filled and a success message.
      setSuccessMsg('Your account has been created. Please check your email and verify your address before logging in.');
      handleNavigate('login', { keepEmail: true, keepSuccess: true });
    } catch (err) {
      console.error(err);
      setErrorMsg('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Standard Email + Password Login (Civilian/Admin) — via Supabase Auth
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMsg(error.message || 'Invalid credentials.');
      } else {
        const sessionUser = data.user;
        const sessionToken = data.session?.access_token || '';
        const role = resolveRole(sessionUser);
        const displayName = resolveName(sessionUser);
        saveAuthSession(sessionToken, { id: sessionUser.id, email: sessionUser.email, name: displayName, role });
        if (role === 'admin') {
          setPage('admin');
        } else {
          setPage('civilian');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network connection error.');
    } finally {
      setLoading(false);
    }
  };



  // Seed Demo Data directly from Login/Landing pages
  const handleTriggerSeeding = async () => {
    setSeedingLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`${API_BASE}/demo/seed`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Demo database seeded successfully! Mock incidents created.');
        // Set demo admin credentials automatically for ease
        setEmail('admin@gmail.com');
        setPassword('31102006');
      } else {
        setErrorMsg(data.error || 'Seeding failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error executing seeder.');
    } finally {
      setSeedingLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Root Router Page Switch */}
      {page === 'landing' && (
        <LandingPage 
          user={user} 
          onNavigate={handleNavigate} 
          onLogout={handleLogout} 
        />
      )}

      {page === 'civilian' && token && (
        <CivilianPortal 
          token={token} 
          user={user}
          onLogout={handleLogout}
          onBackToHome={() => setPage('landing')} 
        />
      )}

      {page === 'admin' && token && (
        <AdminDashboard 
          token={token} 
          user={user}
          onLogout={handleLogout}
          onBackToHome={() => setPage('landing')} 
        />
      )}

      {/* Auth Pages (Login & Register) */}
      {(page === 'login' || page === 'register') && (
        <div className="flex-row-center" style={{ flexGrow: 1, padding: '40px 20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px' }}>
            
            {/* Form Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Zap size={32} className="neon-text" style={{ marginBottom: '12px' }} />
              <h2 style={{ fontSize: '1.6rem' }}>
                {page === 'login' ? 'Access CivicPulse' : 'Create Citizen Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {page === 'login' ? 'Login to file reports or manage issues' : 'Register to report local civic problems'}
              </p>
            </div>

            {errorMsg && (
              <div style={{ color: '#ff4d88', background: 'rgba(255,0,85,0.05)', border: '1px solid rgba(255,0,85,0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ color: 'var(--color-low)', background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '16px' }}>
                ✓ {successMsg}
              </div>
            )}

            <form onSubmit={page === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {page === 'register' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="Enter your name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="form-input" 
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@domain.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                {loading ? <Loader style={{ animation: 'spin 1.5s infinite linear' }} size={16} /> : (page === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>



            {/* Toggle Login/Register */}
            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {page === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <a href="#" onClick={() => handleNavigate('register')} style={{ color: 'var(--primary-neon)', textDecoration: 'none', fontWeight: 600 }}>
                    Register
                  </a>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <a href="#" onClick={() => handleNavigate('login')} style={{ color: 'var(--primary-neon)', textDecoration: 'none', fontWeight: 600 }}>
                    Sign In
                  </a>
                </>
              )}
            </div>

            {/* Hackathon Judging Helper Controls Box */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--primary-neon)', fontWeight: 600, marginBottom: '10px' }}>
                <Database size={14} /> Hackathon Seeder Controls
              </div>
              <button 
                type="button" 
                onClick={handleTriggerSeeding} 
                disabled={seedingLoading}
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem', marginBottom: '8px', background: 'rgba(0, 242, 254, 0.05)', borderColor: 'rgba(0, 242, 254, 0.2)' }}
              >
                {seedingLoading ? 'Seeding Database...' : 'Seed Delhi Demo Incidents'}
              </button>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>🔑 Admin: <span style={{ color: '#fff', fontFamily: 'monospace' }}>admin@gmail.com</span> / <span style={{ color: '#fff', fontFamily: 'monospace' }}>31102006</span></div>
                <div>👤 Civilian: <span style={{ color: '#fff', fontFamily: 'monospace' }}>civilian@gmail.com</span> / <span style={{ color: '#fff', fontFamily: 'monospace' }}>31102006</span></div>
              </div>
            </div>

            <button onClick={() => setPage('landing')} className="btn btn-secondary" style={{ width: '100%', marginTop: '16px', padding: '8px', fontSize: '0.8rem' }}>
              Back to Homepage
            </button>

          </div>
        </div>
      )}





    </div>
  );
}
