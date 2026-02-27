import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Briefcase, LogOut } from 'lucide-react';

const TechnicianLayout = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-light)' }}>
      <nav style={{ 
        background: 'white', 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: 'var(--accent-orange)', color: 'white', padding: '0.4rem', borderRadius: '8px' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <span style={{ fontWeight: '800', color: 'var(--accent-orange)' }}>STREET</span>
            <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>INTEL</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', marginTop: '-3px' }}>FIELD TECHNICIAN</span>
          </div>
        </div>

        <NavLink to="/" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: 'var(--accent-red)', 
          textDecoration: 'none',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <LogOut size={18} /> Exit
        </NavLink>
      </nav>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default TechnicianLayout;
