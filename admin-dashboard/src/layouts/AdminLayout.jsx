import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Clock, PauseCircle, CheckCircle, Settings, Users, LogOut } from 'lucide-react';

const AdminLayout = () => {
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>STREET<span style={{ color: 'var(--text-main)' }}>INTEL</span></h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>ADMIN PORTAL</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/admin/emergency" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AlertCircle size={20} color="var(--accent-red)" /> Emergency
          </NavLink>
          <NavLink to="/admin/moderate" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Clock size={20} color="var(--accent-orange)" /> Moderate
          </NavLink>
          <NavLink to="/admin/paused" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <PauseCircle size={20} color="var(--accent-cyan)" /> Paused
          </NavLink>
          <NavLink to="/admin/completed" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <CheckCircle size={20} color="var(--accent-green)" /> Completed
          </NavLink>
          <div style={{ height: '1px', background: 'var(--border-light)', margin: '1rem 0' }}></div>
          <NavLink to="/admin/technicians" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Users size={20} /> Technicians
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div className="nav-link"><Settings size={20} /> Settings</div>
          <NavLink to="/" className="nav-link" style={{ marginTop: '0.5rem', color: 'var(--accent-red)' }}>
            <LogOut size={20} /> Exit Portal
          </NavLink>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

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
    </div>
  );
};

export default AdminLayout;
