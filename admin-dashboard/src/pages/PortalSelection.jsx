import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Briefcase, ChevronRight } from 'lucide-react';

const PortalSelection = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
          STREET<span style={{ color: 'var(--text-main)' }}>INTEL</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Infrastructure Intelligence & Road Maintenance System</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '2rem', 
        width: '100%', 
        maxWidth: '900px' 
      }}>
        {/* Admin Portal Option */}
        <div 
          onClick={() => navigate('/admin')}
          className="glass-card portal-card" 
          style={{ 
            padding: '2.5rem', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ 
            background: 'rgba(9, 132, 227, 0.1)', 
            color: 'var(--accent-cyan)', 
            padding: '1.5rem', 
            borderRadius: '24px',
            marginBottom: '1.5rem'
          }}>
            <Shield size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>Management Portal</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Access the command center to monitor reports, assign technicians, and track city-wide road recovery efforts.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
            Enter Admin View <ChevronRight size={20} />
          </div>
        </div>

        {/* Technician Portal Option */}
        <div 
          onClick={() => navigate('/technician')}
          className="glass-card portal-card" 
          style={{ 
            padding: '2.5rem', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ 
            background: 'rgba(225, 112, 85, 0.1)', 
            color: 'var(--accent-orange)', 
            padding: '1.5rem', 
            borderRadius: '24px',
            marginBottom: '1.5rem'
          }}>
            <Briefcase size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>Technician Portal</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            Field operators can access their assigned tasks, view GPS locations, and submit completion proofs for recovery work.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)', fontWeight: '700' }}>
            Enter Field View <ChevronRight size={20} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .portal-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          border-color: var(--accent-cyan);
        }
        .portal-card:last-child:hover {
          border-color: var(--accent-orange);
        }
      `}} />
    </div>
  );
};

export default PortalSelection;
