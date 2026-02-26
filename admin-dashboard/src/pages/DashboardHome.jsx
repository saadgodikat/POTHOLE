import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Clock, PauseCircle, CheckCircle, TrendingUp } from 'lucide-react';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    emergency: 0,
    moderate: 0,
    paused: 0,
    completed: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/admin/reports');
        setStats({
          emergency: res.data.emergency.length,
          moderate: res.data.moderate.length,
          paused: res.data.paused.length,
          completed: 0 // Will implement full stats later
        });
      } catch (err) {
        console.error('Error fetching stats', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem' }}>System Overview</h2>
        <p style={{ color: 'var(--text-muted)' }}>Real-time road condition summary</p>
      </header>

      <div className="stat-grid">
        <div className="glass-card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Emergency</span>
            <AlertCircle color="var(--accent-red)" size={20} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{stats.emergency}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 77, 77, 0.6)' }}>Critical defects detected</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Moderate</span>
            <Clock color="var(--accent-orange)" size={20} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-orange)' }}>{stats.moderate}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 159, 67, 0.6)' }}>Requires attention</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Paused</span>
            <PauseCircle color="var(--accent-cyan)" size={20} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.paused}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(15, 188, 249, 0.6)' }}>Work on hold</p>
        </div>

        <div className="glass-card stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Resolved</span>
            <CheckCircle color="var(--accent-green)" size={20} />
          </div>
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.completed}</span>
          <p style={{ fontSize: '0.8rem', color: 'rgba(5, 196, 107, 0.6)' }}>Repairs finished</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <TrendingUp color="var(--accent-cyan)" />
          <h3>Activity Feed</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          Recent AI analysis reports will appear here.
        </p>
      </div>
    </div>
  );
};

export default DashboardHome;
