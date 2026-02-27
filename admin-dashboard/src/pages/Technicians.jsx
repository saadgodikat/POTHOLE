import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Briefcase, Phone, History, X, ExternalLink } from 'lucide-react';

const Technicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/api/admin/technicians');
      setTechnicians(res.data);
    } catch (err) {
      console.error('Error fetching technicians', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (name) => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/api/admin/technicians/${encodeURIComponent(name)}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching technician history', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistory = (tech) => {
    setSelectedTech(tech);
    fetchHistory(tech.name);
  };

  return (
    <div className="technicians-page">
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem' }}>Technician Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your workforce and track their maintenance history</p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading technicians...</div>
      ) : (
        <div className="tech-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {technicians.map((tech) => (
            <div key={tech.id} className="glass-card tech-card" style={{ padding: '1.5rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--accent-cyan)', color: 'white', padding: '0.8rem', borderRadius: '12px' }}>
                  <Users size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{tech.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <Briefcase size={12} /> {tech.specialty}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <Phone size={14} color="var(--accent-cyan)" />
                <span>{tech.phone}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge badge-${tech.status === 'active' ? 'green' : 'paused'}`} style={{ fontSize: '0.7rem' }}>
                  {tech.status}
                </span>
                <button 
                  onClick={() => handleViewHistory(tech)}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <History size={14} /> View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTech && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>Work History: {selectedTech.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedTech.specialty}</p>
              </div>
              <button onClick={() => setSelectedTech(null)} style={{ background: 'none', border: 'none', color: 'white' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No work history found for this technician.</div>
              ) : (
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Image</th>
                      <th>Defect</th>
                      <th>Assigned Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((report) => (
                      <tr key={report.id}>
                        <td style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>#{report.id}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <div style={{ textAlign: 'center' }}>
                              <img 
                                src={`http://localhost:3000${report.image_url}`} 
                                alt="before" 
                                style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px' }} 
                              />
                              <div style={{ fontSize: '0.4rem', opacity: 0.5 }}>BEFORE</div>
                            </div>
                            {report.completion_image && (
                              <div style={{ textAlign: 'center' }}>
                                <img 
                                  src={`http://localhost:3000${report.completion_image}`} 
                                  alt="after" 
                                  style={{ width: '40px', height: '30px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--accent-green)' }} 
                                />
                                <div style={{ fontSize: '0.4rem', color: 'var(--accent-green)' }}>AFTER</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{report.defect_type}</div>
                          {report.completion_notes && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '150px' }}>
                              "{report.completion_notes}"
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(report.assigned_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${report.status === 'green' ? 'completed' : (report.status === 'paused' ? 'paused' : 'moderate')}`} style={{ fontSize: '0.7rem' }}>
                            {report.status}
                          </span>
                        </td>
                        <td>
                          <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer">
                            <ExternalLink size={16} color="var(--accent-cyan)" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;
