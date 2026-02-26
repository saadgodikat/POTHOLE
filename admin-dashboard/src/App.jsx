import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Clock, PauseCircle, CheckCircle, Settings, Users } from 'lucide-react';
import DashboardHome from './pages/DashboardHome';
import ReportsList from './pages/ReportsList';

function App() {
  return (
    <Router>
      <div className="dashboard-container">
        <aside className="sidebar">
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>STREET<span style={{ color: 'var(--text-main)' }}>INTEL</span></h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>ADMIN PORTAL</p>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} /> Dashboard
            </NavLink>
            <NavLink to="/emergency" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <AlertCircle size={20} color="var(--accent-red)" /> Emergency
            </NavLink>
            <NavLink to="/moderate" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Clock size={20} color="var(--accent-orange)" /> Moderate
            </NavLink>
            <NavLink to="/paused" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <PauseCircle size={20} color="var(--accent-cyan)" /> Paused
            </NavLink>
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <div className="nav-link"><Users size={20} /> Technicians</div>
            <div className="nav-link"><Settings size={20} /> Settings</div>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/emergency" element={<ReportsList category="emergency" />} />
            <Route path="/moderate" element={<ReportsList category="moderate" />} />
            <Route path="/paused" element={<ReportsList category="paused" />} />
          </Routes>
        </main>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 1rem;
          color: var(--text-muted);
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .nav-link:hover {
          background: #f0f2f5;
          color: var(--text-main);
        }
        .nav-link.active {
          background: #e1f5fe;
          color: var(--accent-cyan);
          font-weight: 600;
        }
      `}} />
    </Router>
  );
}

export default App;
