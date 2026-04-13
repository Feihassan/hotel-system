import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { roomsAPI, bookingsAPI, guestsAPI, paymentsAPI, housekeepingAPI, reportsAPI, authAPI, shiftsAPI } from './api';
import './App.css';

// Icons as inline SVGs
const Icons = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Bed: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  CreditCard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Clipboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  DollarSign: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  TrendingUp: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Activity: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  ShiftOn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>,
  RefreshCw: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  FileText: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Grid: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  UserCheck: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
};

// Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal`} style={{ maxWidth: size === 'lg' ? '700px' : size === 'sm' ? '400px' : '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

// Alert Component
const Alert = ({ type, children }) => {
  return <div className={`alert alert-${type}`}>{children}</div>;
};

// Login Page
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Icons.Bed />
          </div>
          <h1 className="login-title">Hotel Management</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>
        
        {error && <Alert type="error">{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          <p>Demo credentials:</p>
          <p><strong>Username:</strong> admin | <strong>Password:</strong> admin123</p>
        </div>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const handleNav = () => { if (window.innerWidth <= 768) onClose(); };

  return (
    <>
      {isOpen && <div className="sidebar-overlay open" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Icons.Bed />
          <span>HotelManager</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {(hasPermission('dashboard') || hasPermission('rooms') || hasPermission('checkin') || hasPermission('stays')) && (
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            {hasPermission('dashboard') && (
              <Link to="/" onClick={handleNav} className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                <Icons.Home /><span>Dashboard</span>
              </Link>
            )}
            {hasPermission('rooms') && (
              <Link to="/rooms" onClick={handleNav} className={`nav-item ${isActive('/rooms') ? 'active' : ''}`}>
                <Icons.Grid /><span>Rooms</span>
              </Link>
            )}
            {hasPermission('checkin') && (
              <Link to="/checkin" onClick={handleNav} className={`nav-item ${isActive('/checkin') ? 'active' : ''}`}>
                <Icons.UserCheck /><span>Walk-In Check-In</span>
              </Link>
            )}
            {hasPermission('stays') && (
              <Link to="/stays" onClick={handleNav} className={`nav-item ${isActive('/stays') ? 'active' : ''}`}>
                <Icons.Users /><span>Active Stays</span>
              </Link>
            )}
          </div>
        )}
        
        {(hasPermission('guests') || hasPermission('housekeeping')) && (
          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            {hasPermission('guests') && (
              <Link to="/guests" onClick={handleNav} className={`nav-item ${isActive('/guests') ? 'active' : ''}`}>
                <Icons.Users /><span>Guests</span>
              </Link>
            )}
            {hasPermission('housekeeping') && (
              <Link to="/housekeeping" onClick={handleNav} className={`nav-item ${isActive('/housekeeping') ? 'active' : ''}`}>
                <Icons.Clipboard /><span>Housekeeping</span>
              </Link>
            )}
          </div>
        )}
        
        {hasPermission('reports') && (
          <div className="nav-section">
            <div className="nav-section-title">Reports</div>
            <Link to="/reports" onClick={handleNav} className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
              <Icons.FileText /><span>Reports</span>
            </Link>
            <Link to="/shifts" onClick={handleNav} className={`nav-item ${isActive('/shifts') ? 'active' : ''}`}>
              <Icons.Clock /><span>Shifts</span>
            </Link>
          </div>
        )}
        
        {hasRole('admin') && (
          <div className="nav-section">
            <div className="nav-section-title">Admin</div>
            <Link to="/users" onClick={handleNav} className={`nav-item ${isActive('/users') ? 'active' : ''}`}>
              <Icons.Settings /><span>User Management</span>
            </Link>
          </div>
        )}
        
        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <div className="nav-item" onClick={logout} style={{ color: '#f87171' }}>
            <Icons.LogOut />
            <span>Sign Out</span>
          </div>
        </div>
      </nav>
    </aside>
    </>
  );
};

// Header Component
const Header = ({ title, onMenuClick }) => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'receptionist' || user?.role === 'admin') {
      shiftsAPI.getCurrent().then(r => setCurrentShift(r.data)).catch(() => {});
    }
  }, [user]);

  const handleStartShift = async () => {
    setShiftLoading(true);
    try {
      const r = await shiftsAPI.start();
      setCurrentShift(r.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start shift');
    } finally { setShiftLoading(false); }
  };

  const handleCloseShift = async () => {
    if (!window.confirm('Close your current shift?')) return;
    setShiftLoading(true);
    try {
      const r = await shiftsAPI.close(currentShift.id);
      const s = r.data.summary || {};
      alert(`Shift closed!\nCheck-ins: ${s.check_ins ?? 0}\nCheck-outs: ${s.check_outs ?? 0}\nRevenue: KES ${Number(s.revenue_handled ?? 0).toLocaleString()}\nPending bookings: ${s.pending_bookings ?? 0}`);
      setCurrentShift(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close shift');
    } finally { setShiftLoading(false); }
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-actions">
        {(user?.role === 'receptionist' || user?.role === 'admin') && (
          currentShift ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.ShiftOn /> Shift active since {new Date(currentShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button className="btn btn-danger btn-sm" onClick={handleCloseShift} disabled={shiftLoading}>
                Close Shift
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleStartShift} disabled={shiftLoading}>
              <Icons.Clock /> Start Shift
            </button>
          )
        )}
        <div className="user-menu">
          <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
          <div className="user-info">
            <span className="user-name">{user?.full_name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// Dashboard Page
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState(null);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [dashboardRes, todayRes, dailyRes] = await Promise.all([
        reportsAPI.getDashboard(),
        bookingsAPI.getToday(),
        reportsAPI.getDaily(today),
      ]);
      setStats(dashboardRes.data);
      setTodayBookings(todayRes.data);
      setRevenue(dailyRes.data?.payments?.total || 0);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Retrying...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const rooms = stats?.rooms || {};
  const occupancyRate = rooms.total_rooms > 0
    ? Math.round((rooms.occupied_rooms / rooms.total_rooms) * 100)
    : 0;

  if (loading) return (
    <div className="page-content">
      <div className="dashboard-skeleton">
        {[...Array(7)].map((_, i) => <div key={i} className="skeleton-card" />)}
      </div>
    </div>
  );

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content">
        {error && <div className="alert alert-warning" style={{ marginBottom: '20px' }}>{error}</div>}

        <div className="dashboard-meta">
          <span className="dashboard-date">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <button className="btn-refresh" onClick={() => fetchData(true)} disabled={refreshing}>
            <Icons.RefreshCw />
            {refreshing ? 'Updating...' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
          </button>
        </div>

        {/* Room Status Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Home /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.total_rooms ?? 0}</div>
              <div className="stat-label">Total Rooms</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Icons.Check /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.available_rooms ?? 0}</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Icons.Users /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.occupied_rooms ?? 0}</div>
              <div className="stat-label">Occupied</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Icons.Clipboard /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.cleaning_rooms ?? 0}</div>
              <div className="stat-label">Cleaning</div>
            </div>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="occupancy-bar-card">
          <div className="occupancy-bar-header">
            <span className="occupancy-label">Occupancy Rate</span>
            <span className="occupancy-rate">{occupancyRate}%</span>
          </div>
          <div className="occupancy-track">
            <div className="occupancy-fill" style={{ width: `${occupancyRate}%` }} />
          </div>
          <div className="occupancy-legend">
            <span className="legend-dot occupied" /> Occupied ({rooms.occupied_rooms ?? 0})
            <span className="legend-dot available" /> Available ({rooms.available_rooms ?? 0})
            <span className="legend-dot cleaning" /> Cleaning ({rooms.cleaning_rooms ?? 0})
            {(rooms.maintenance_rooms ?? 0) > 0 && <><span className="legend-dot maintenance" /> Maintenance ({rooms.maintenance_rooms})</>}
          </div>
        </div>

        {/* Activity Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><Icons.UserCheck /></div>
            <div className="stat-content">
              <div className="stat-value">{stats?.today_check_ins ?? 0}</div>
              <div className="stat-label">Today's Check-Ins</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><Icons.LogOut /></div>
            <div className="stat-content">
              <div className="stat-value">{stats?.today_check_outs ?? 0}</div>
              <div className="stat-label">Today's Check-Outs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Users /></div>
            <div className="stat-content">
              <div className="stat-value">{stats?.active_stays ?? 0}</div>
              <div className="stat-label">Active Stays</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Icons.DollarSign /></div>
            <div className="stat-content">
              <div className="stat-value" style={{ fontSize: '20px' }}>KES {Number(revenue).toLocaleString()}</div>
              <div className="stat-label">Today's Revenue</div>
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Today's Check-Ins</h3>
              <Link to="/checkin" className="btn btn-primary btn-sm"><Icons.Plus />New Check-In</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {todayBookings?.check_ins?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr><th>Room</th><th>Guest</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {todayBookings.check_ins.slice(0, 8).map((b) => (
                      <tr key={b.id}>
                        <td><span className="room-badge">{b.room_number}</span></td>
                        <td>{b.guest_name}</td>
                        <td className="text-muted">
                          {b.actual_check_in_time ? new Date(b.actual_check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <Icons.Calendar />
                  <p>No check-ins recorded today</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Today's Check-Outs</h3>
              <Link to="/stays" className="btn btn-secondary btn-sm">View Stays</Link>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {todayBookings?.check_outs?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr><th>Room</th><th>Guest</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {todayBookings.check_outs.slice(0, 8).map((b) => (
                      <tr key={b.id}>
                        <td><span className="room-badge">{b.room_number}</span></td>
                        <td>{b.guest_name}</td>
                        <td><span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <Icons.Calendar />
                  <p>No check-outs scheduled today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Rooms Page
const RoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    room_type_id: '',
    floor: '',
    description: '',
  });

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await roomsAPI.getAll();
      setRooms(res.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const res = await roomsAPI.getTypes();
      setRoomTypes(res.data);
    } catch (error) {
      console.error('Failed to fetch room types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await roomsAPI.update(editingRoom.id, formData);
      } else {
        await roomsAPI.create(formData);
      }
      setShowModal(false);
      setEditingRoom(null);
      setFormData({ room_number: '', room_type_id: '', floor: '', description: '' });
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save room');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type_id: room.room_type_id,
      floor: room.floor || '',
      description: room.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        await roomsAPI.delete(id);
        fetchRooms();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete room');
      }
    }
  };

  const handleStatusChange = async (room, newStatus) => {
    try {
      await roomsAPI.updateStatus(room.id, newStatus);
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      available: 'badge-available',
      occupied: 'badge-occupied',
      cleaning: 'badge-cleaning',
      maintenance: 'badge-maintenance',
    };
    return statusMap[status] || 'badge-available';
  };

  return (
    <>
      <Header title="Room Management" />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Rooms Overview</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {rooms.filter(r => r.status === 'available').length} available, {' '}
                {rooms.filter(r => r.status === 'occupied').length} occupied, {' '}
                {rooms.filter(r => r.status === 'cleaning').length} cleaning
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowModal(true); setEditingRoom(null); setFormData({ room_number: '', room_type_id: '', floor: '', description: '' }); }}>
              <Icons.Plus /> Add Room
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Floor</th>
                      <th>Status</th>
                      <th>Price</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td><strong>{room.room_number}</strong></td>
                        <td>{room.room_type_name}</td>
                        <td>{room.floor || '-'}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(room.status)}`}>
                            {room.status}
                          </span>
                        </td>
                        <td>KES {parseFloat(room.base_price).toLocaleString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(room)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingRoom ? 'Edit Room' : 'Add New Room'}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select
                className="form-select"
                value={formData.room_type_id}
                onChange={(e) => setFormData({ ...formData, room_type_id: e.target.value })}
                required
              >
                <option value="">Select room type</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name} - KES {parseFloat(type.base_price).toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Floor</label>
              <input
                type="number"
                className="form-input"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, border: 0, marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingRoom ? 'Update' : 'Create'} Room</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

// Check-In Page
const CheckInPage = () => {
  const [rooms, setRooms] = useState([]);
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    guest: { full_name: '', phone: '', id_number: '' },
    room_id: '',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    advance_amount: '',
    payment_method: 'cash',
    notes: '',
  });
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  const fetchAvailableRooms = async () => {
    try {
      const res = await roomsAPI.getAll({ status: 'available' });
      setRooms(res.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGuests = async (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const res = await guestsAPI.search(query);
        setGuests(res.data);
      } catch (error) {
        console.error('Failed to search guests:', error);
      }
    }
  };

  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
    setFormData({ ...formData, guest: { ...formData.guest, ...guest } });
    setSearchQuery('');
    setGuests([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bookingsAPI.checkIn(formData);
      alert('Check-in successful!');
      setFormData({
        guest: { full_name: '', phone: '', id_number: '' },
        room_id: '',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        advance_amount: '',
        payment_method: 'cash',
        notes: '',
      });
      setSelectedGuest(null);
      fetchAvailableRooms();
      setStep(1);
    } catch (error) {
      alert(error.response?.data?.error || 'Check-in failed');
    }
  };

  const calculateNights = () => {
    const checkIn = new Date(formData.check_in_date);
    const checkOut = new Date(formData.check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const calculateTotal = () => {
    const room = rooms.find(r => r.id === parseInt(formData.room_id));
    if (!room) return 0;
    return parseFloat(room.base_price) * calculateNights();
  };

  return (
    <>
      <Header title="Walk-In Check-In" />
      <div className="page-content">
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Guest Name</label>
                  {selectedGuest ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={`${selectedGuest.full_name} (${selectedGuest.phone})`}
                        readOnly
                      />
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedGuest(null)}>Change</button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, phone, or ID..."
                        value={searchQuery}
                        onChange={(e) => searchGuests(e.target.value)}
                      />
                      {guests.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius)',
                          marginTop: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 100,
                          boxShadow: 'var(--shadow-md)',
                        }}>
                          {guests.map((guest) => (
                            <div
                              key={guest.id}
                              style={{
                                padding: '12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-color)',
                              }}
                              onClick={() => handleGuestSelect(guest)}
                            >
                              <strong>{guest.full_name}</strong>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{guest.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!selectedGuest && (
                  <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', marginBottom: '12px' }}><strong>Or register new guest:</strong></p>
                    <div className="form-row">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.guest.full_name}
                          onChange={(e) => setFormData({ ...formData, guest: { ...formData.guest, full_name: e.target.value } })}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Phone</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.guest.phone}
                          onChange={(e) => setFormData({ ...formData, guest: { ...formData.guest, phone: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                      <label className="form-label">ID Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.guest.id_number}
                        onChange={(e) => setFormData({ ...formData, guest: { ...formData.guest, id_number: e.target.value } })}
                      />
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Check-In Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.check_in_date}
                      onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Check-Out Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.check_out_date}
                      onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Room</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className={`room-card ${room.status}`}
                        style={{
                          border: formData.room_id === room.id ? '3px solid var(--primary)' : '2px solid transparent',
                          padding: '12px',
                        }}
                        onClick={() => setFormData({ ...formData, room_id: room.id })}
                      >
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{room.room_number}</div>
                        <div style={{ fontSize: '10px' }}>{room.room_type_name}</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>KES {parseFloat(room.base_price).toLocaleString()}/night</div>
                      </div>
                    ))}
                  </div>
                  {rooms.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No rooms available</p>
                  )}
                </div>

                {formData.room_id && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '12px' }}>Booking Summary</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Room</span>
                      <span>{rooms.find(r => r.id === parseInt(formData.room_id))?.room_number}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Nights</span>
                      <span>{calculateNights()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Price per night</span>
                      <span>KES {parseFloat(rooms.find(r => r.id === parseInt(formData.room_id))?.base_price || 0).toLocaleString()}</span>
                    </div>
                    <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '18px' }}>
                      <span>Total</span>
                      <span>KES {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Advance Payment (Optional)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Amount"
                      value={formData.advance_amount}
                      onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                    />
                    <select
                      className="form-select"
                      style={{ width: '150px' }}
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="m_pesa">M-Pesa</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Special requests or notes..."
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={!formData.room_id || !formData.guest.full_name}>
                  Complete Check-In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Active Stays Page
const ActiveStaysPage = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedStay, setSelectedStay] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
  });

  useEffect(() => {
    fetchActiveStays();
  }, []);

  const fetchActiveStays = async () => {
    try {
      const res = await bookingsAPI.getActive();
      setStays(res.data);
    } catch (error) {
      console.error('Failed to fetch active stays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (stay) => {
    setSelectedStay(stay);
    const summaryRes = await paymentsAPI.getSummary(stay.id);
    setPaymentData({
      amount: summaryRes.data.balance_due || '',
      payment_method: 'cash',
      notes: '',
    });
    setShowCheckoutModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      // First process payment if there's balance
      if (parseFloat(paymentData.amount) > 0) {
        await paymentsAPI.process({
          booking_id: selectedStay.id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_type: parseFloat(paymentData.amount) >= parseFloat(selectedStay.total_amount) - parseFloat(selectedStay.paid_amount || 0) ? 'full' : 'partial',
        });
      }
      // Then checkout
      await bookingsAPI.checkOut(selectedStay.id);
      alert('Checkout successful!');
      setShowCheckoutModal(false);
      fetchActiveStays();
    } catch (error) {
      alert(error.response?.data?.error || 'Checkout failed');
    }
  };

  const getPaymentSummary = async (stay) => {
    try {
      const res = await paymentsAPI.getSummary(stay.id);
      return res.data;
    } catch (error) {
      console.error('Failed to get payment summary:', error);
      return null;
    }
  };

  return (
    <>
      <Header title="Active Stays" />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Currently Checked-In Guests</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : stays.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Guest</th>
                      <th>Check-In</th>
                      <th>Expected Check-Out</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stays.map((stay) => (
                      <tr key={stay.id}>
                        <td><strong>{stay.room_number}</strong></td>
                        <td>
                          <div>{stay.guest_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stay.phone}</div>
                        </td>
                        <td>{new Date(stay.check_in_date).toLocaleDateString()}</td>
                        <td>{new Date(stay.check_out_date).toLocaleDateString()}</td>
                        <td>KES {parseFloat(stay.total_amount).toLocaleString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(stay)}>
                              Check Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <Icons.Users />
                <h3>No Active Stays</h3>
                <p>There are currently no checked-in guests</p>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Check Out Guest" size="lg">
          {selectedStay && (
            <div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>Guest Details</h4>
                <p><strong>Room:</strong> {selectedStay.room_number}</p>
                <p><strong>Guest:</strong> {selectedStay.guest_name}</p>
                <p><strong>Check-In:</strong> {new Date(selectedStay.check_in_date).toLocaleDateString()}</p>
                <p><strong>Check-Out:</strong> {new Date(selectedStay.check_out_date).toLocaleDateString()}</p>
              </div>

              <form onSubmit={handlePayment}>
                <div className="form-group">
                  <label className="form-label">Payment Amount</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="m_pesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  />
                </div>
                <div className="modal-footer" style={{ padding: 0, border: 0 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCheckoutModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Complete Check Out</button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

// Guests Page
const GuestsPage = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    id_type: 'national_id',
    address: '',
    nationality: '',
  });

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await guestsAPI.getAll({ search: searchQuery });
      setGuests(res.data);
    } catch (error) {
      console.error('Failed to fetch guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await guestsAPI.create(formData);
      setShowModal(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        id_number: '',
        id_type: 'national_id',
        address: '',
        nationality: '',
      });
      fetchGuests();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create guest');
    }
  };

  return (
    <>
      <Header title="Guest Management" />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <div className="search-box">
              <Icons.Search />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icons.Plus /> Add Guest
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>ID Number</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id}>
                        <td><strong>{guest.full_name}</strong></td>
                        <td>{guest.phone || '-'}</td>
                        <td>{guest.id_number || '-'}</td>
                        <td>{guest.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New Guest">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ID Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">ID Type</label>
                <select
                  className="form-select"
                  value={formData.id_type}
                  onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                >
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-textarea"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, border: 0, marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Guest</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

// Housekeeping Page
const HousekeepingPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await roomsAPI.getAll();
      setRooms(res.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkClean = async (roomId) => {
    try {
      await housekeepingAPI.markClean(roomId);
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update room');
    }
  };

  return (
    <>
      <Header title="Housekeeping" />
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><Icons.Check /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.filter(r => r.status === 'available').length}</div>
              <div className="stat-label">Ready</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Icons.Users /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.filter(r => r.status === 'occupied').length}</div>
              <div className="stat-label">Occupied</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Icons.Clipboard /></div>
            <div className="stat-content">
              <div className="stat-value">{rooms.filter(r => r.status === 'cleaning').length}</div>
              <div className="stat-label">Needs Cleaning</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Room Status Overview</h3>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <div className="room-grid">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`room-card ${room.status}`}
                    style={{ padding: '16px' }}
                  >
                    <div className="room-number">{room.room_number}</div>
                    <div className="room-type">{room.room_type_name}</div>
                    <div style={{ marginTop: '12px' }}>
                      {room.status === 'cleaning' ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleMarkClean(room.id)}
                        >
                          Mark Clean
                        </button>
                      ) : (
                        <span className={`badge ${room.status === 'available' ? 'badge-available' : room.status === 'occupied' ? 'badge-occupied' : 'badge-cleaning'}`}>
                          {room.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Reports Page
const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [shiftPerfData, setShiftPerfData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyReport();
    else if (activeTab === 'activity') fetchActivityReport();
    else if (activeTab === 'shifts') fetchShiftPerformance();
  }, [date, activeTab]);

  const fetchDailyReport = async () => {
    setLoading(true);
    try { const res = await reportsAPI.getDaily(date); setReport(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchActivityReport = async () => {
    setLoading(true);
    try { const res = await reportsAPI.getReceptionistActivity({ date }); setActivityData(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchShiftPerformance = async () => {
    setLoading(true);
    try { const res = await reportsAPI.getShiftPerformance({ date }); setShiftPerfData(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <>
      <Header title="Reports" />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily Report</button>
          <button className={`tab ${activeTab === 'occupancy' ? 'active' : ''}`} onClick={() => setActiveTab('occupancy')}>Occupancy</button>
          <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Staff Activity</button>
          <button className={`tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>Shift Performance</button>
        </div>

        {/* Date picker shared across tabs */}
        <div style={{ padding: '0 0 20px 0' }}>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '200px' }} />
        </div>

        {loading && <div className="loading"><div className="spinner"></div></div>}

        {!loading && activeTab === 'daily' && report && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon green"><Icons.UserCheck /></div>
                <div className="stat-content"><div className="stat-value">{report.check_ins.count}</div><div className="stat-label">Check-Ins</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple"><Icons.LogOut /></div>
                <div className="stat-content"><div className="stat-value">{report.check_outs.count}</div><div className="stat-label">Check-Outs</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><Icons.DollarSign /></div>
                <div className="stat-content"><div className="stat-value">KES {report.payments.total.toLocaleString()}</div><div className="stat-label">Revenue</div></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Check-Ins</h3></div>
                <div className="card-body">
                  {report.check_ins.details.length > 0 ? (
                    <table className="table"><thead><tr><th>Room</th><th>Guest</th></tr></thead>
                      <tbody>{report.check_ins.details.map(item => <tr key={item.id}><td>{item.room_number}</td><td>{item.guest_name}</td></tr>)}</tbody>
                    </table>
                  ) : <p style={{ color: 'var(--text-muted)' }}>No check-ins</p>}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Check-Outs</h3></div>
                <div className="card-body">
                  {report.check_outs.details.length > 0 ? (
                    <table className="table"><thead><tr><th>Room</th><th>Guest</th></tr></thead>
                      <tbody>{report.check_outs.details.map(item => <tr key={item.id}><td>{item.room_number}</td><td>{item.guest_name}</td></tr>)}</tbody>
                    </table>
                  ) : <p style={{ color: 'var(--text-muted)' }}>No check-outs</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && activeTab === 'occupancy' && report && (
          <div className="card">
            <div className="card-body">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue"><Icons.Home /></div>
                  <div className="stat-content"><div className="stat-value">{report.room_occupancy.filter(r => r.status === 'occupied').length}</div><div className="stat-label">Occupied</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><Icons.Check /></div>
                  <div className="stat-content"><div className="stat-value">{report.room_occupancy.filter(r => r.status === 'available').length}</div><div className="stat-label">Available</div></div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon yellow"><Icons.Clipboard /></div>
                  <div className="stat-content"><div className="stat-value">{report.room_occupancy.filter(r => r.status === 'cleaning').length}</div><div className="stat-label">Cleaning</div></div>
                </div>
              </div>
              <table className="table">
                <thead><tr><th>Room</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>{report.room_occupancy.map(room => (
                  <tr key={room.room_number}>
                    <td><strong>{room.room_number}</strong></td>
                    <td>{room.room_type}</td>
                    <td><span className={`badge badge-${room.status}`}>{room.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'activity' && activityData && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Staff Activity — {activityData.date}</h3></div>
            <div className="card-body">
              {activityData.staff.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Staff</th><th>Check-Ins</th><th>Check-Outs</th><th>Revenue</th></tr></thead>
                  <tbody>{activityData.staff.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.full_name}</strong></td>
                      <td>{s.check_ins}</td>
                      <td>{s.check_outs}</td>
                      <td>KES {Number(s.revenue).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div className="empty-state"><Icons.Activity /><p>No activity recorded for this date</p></div>}
            </div>
          </div>
        )}

        {!loading && activeTab === 'shifts' && shiftPerfData && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Shift Performance — {shiftPerfData.date}</h3></div>
            <div className="card-body">
              {shiftPerfData.shifts.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Receptionist</th><th>Started</th><th>Ended</th><th>Status</th><th>Check-Ins</th><th>Check-Outs</th><th>Revenue</th></tr></thead>
                  <tbody>{shiftPerfData.shifts.map(s => (
                    <tr key={s.shift_id}>
                      <td><strong>{s.receptionist_name}</strong></td>
                      <td>{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{s.ended_at ? new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td><span className={`badge ${s.status === 'open' ? 'badge-available' : 'badge-occupied'}`}>{s.status}</span></td>
                      <td>{s.check_ins}</td>
                      <td>{s.check_outs}</td>
                      <td>KES {Number(s.revenue).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div className="empty-state"><Icons.Clock /><p>No shifts recorded for this date</p></div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Shifts Page
const ShiftsPage = () => {
  const [shifts, setShifts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shifts');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { user } = useAuth();

  useEffect(() => {
    if (activeTab === 'shifts') fetchShifts();
    else fetchAuditLogs();
  }, [activeTab, date]);

  const fetchShifts = async () => {
    setLoading(true);
    try { const res = await shiftsAPI.getAll({ date }); setShifts(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try { const res = await shiftsAPI.getAuditLogs({ date, limit: 100 }); setAuditLogs(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatDuration = (start, end) => {
    if (!end) return 'Ongoing';
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  return (
    <>
      <Header title="Shifts" />
      <div className="page-content">
        <div className="tabs">
          <button className={`tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>Shift Log</button>
          <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>Audit Log</button>
        </div>

        <div style={{ padding: '0 0 20px 0' }}>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '200px' }} />
        </div>

        {loading ? <div className="loading"><div className="spinner"></div></div> : (
          activeTab === 'shifts' ? (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Shifts — {date}</h3></div>
              <div className="card-body">
                {shifts.length > 0 ? (
                  <table className="table">
                    <thead><tr><th>Receptionist</th><th>Started</th><th>Ended</th><th>Duration</th><th>Status</th><th>Check-Ins</th><th>Check-Outs</th><th>Revenue</th></tr></thead>
                    <tbody>{shifts.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.receptionist_name}</strong></td>
                        <td>{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{s.ended_at ? new Date(s.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td>{formatDuration(s.started_at, s.ended_at)}</td>
                        <td><span className={`badge ${s.status === 'open' ? 'badge-available' : 'badge-occupied'}`}>{s.status}</span></td>
                        <td>{s.summary?.check_ins ?? '—'}</td>
                        <td>{s.summary?.check_outs ?? '—'}</td>
                        <td>{s.summary?.revenue_handled != null ? `KES ${Number(s.summary.revenue_handled).toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <div className="empty-state"><Icons.Clock /><p>No shifts found for this date</p></div>}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header"><h3 className="card-title">Audit Log — {date}</h3></div>
              <div className="card-body">
                {auditLogs.length > 0 ? (
                  <table className="table">
                    <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody>{auditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td><strong>{log.user_name}</strong><br /><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_role}</span></td>
                        <td><span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{log.action.replace(/_/g, ' ')}</span></td>
                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{log.details}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : <div className="empty-state"><Icons.FileText /><p>No audit logs for this date</p></div>}
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
};

// User Management Page
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'receptionist',
    permissions: [],
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await authAPI.getUsers();
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAPI.createUser(formData);
      setShowModal(false);
      setFormData({ username: '', password: '', full_name: '', role: 'receptionist', permissions: [] });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await authAPI.deleteUser(id);
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  return (
    <>
      <Header title="User Management" />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Users</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icons.Plus /> Add User
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.username}</strong></td>
                        <td>{user.full_name}</td>
                        <td><span className="badge" style={{ background: 'var(--bg-tertiary)' }}>{user.role}</span></td>
                        <td>
                          <span className={`badge ${user.is_active ? 'badge-available' : 'badge-cancelled'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add New User">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="receptionist">Receptionist</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            {formData.role !== 'admin' && (
              <div className="form-group">
                <label className="form-label">Authorized Features</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'rooms', label: 'Rooms' },
                    { id: 'checkin', label: 'Walk-In Check-In' },
                    { id: 'stays', label: 'Active Stays' },
                    { id: 'guests', label: 'Guests' },
                    { id: 'housekeeping', label: 'Housekeeping' },
                    { id: 'reports', label: 'Reports' }
                  ].map(feature => (
                    <label key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.permissions.includes(feature.id)}
                        onChange={(e) => {
                          const newPerms = e.target.checked 
                            ? [...formData.permissions, feature.id]
                            : formData.permissions.filter(p => p !== feature.id);
                          setFormData({ ...formData, permissions: newPerms });
                        }}
                      />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-footer" style={{ padding: 0, border: 0, marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add User</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, loading, hasPermission, user } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect housekeeping users to their default page
    if (user?.role === 'housekeeping') {
      return <Navigate to="/housekeeping" replace />;
    }
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <div className="empty-state" style={{ marginTop: '100px' }}>
            <Icons.X />
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
          </div>
        </main>
      </div>
    );
  }
  
  return children;
};

// Layout Component
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        {React.cloneElement(children, { onMenuClick: () => setSidebarOpen(true) })}
      </main>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute requiredPermission="dashboard">
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute requiredPermission="rooms">
                <Layout>
                  <RoomsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkin"
            element={
              <ProtectedRoute requiredPermission="checkin">
                <Layout>
                  <CheckInPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/stays"
            element={
              <ProtectedRoute requiredPermission="stays">
                <Layout>
                  <ActiveStaysPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests"
            element={
              <ProtectedRoute requiredPermission="guests">
                <Layout>
                  <GuestsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/housekeeping"
            element={
              <ProtectedRoute requiredPermission="housekeeping">
                <Layout>
                  <HousekeepingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermission="reports">
                <Layout>
                  <ReportsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shifts"
            element={
              <ProtectedRoute requiredPermission="reports">
                <Layout>
                  <ShiftsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <UsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
