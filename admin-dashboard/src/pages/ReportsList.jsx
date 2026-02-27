import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, CheckCircle, MoreVertical, ExternalLink } from 'lucide-react';

const ReportsList = ({ category }) => {
  const [reports, setReports] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [technicianName, setTechnicianName] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/api/admin/reports');
      setReports(res.data[category] || []);
      
      // Also fetch technicians for the dropdown
      const techRes = await axios.get('http://localhost:3000/api/admin/technicians');
      setTechnicians(techRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [category]);

  const handleAssign = async () => {
    if (!technicianName) return;
    try {
      await axios.patch(`http://localhost:3000/api/admin/reports/${selectedReport.report_id}/assign`, {
        assigned_to: technicianName
      });
      setSelectedReport(null);
      setTechnicianName('');
      fetchReports();
    } catch (err) {
      console.error('Error assigning work', err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`http://localhost:3000/api/admin/reports/${id}/status`, { status });
      fetchReports();
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', textTransform: 'capitalize' }}>{category} Reports</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage and track recovery efforts</p>
        </div>
        <div className="badge badge-paused">{reports.length} Total</div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading reports...</div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Defect Type</th>
              <th>Location</th>
              <th>Status</th>
              <th>Technician</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.report_id} className="report-row glass-card">
                <td style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                  #{report.report_id}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <img 
                        src={`http://localhost:3000${report.image_url}`} 
                        alt="defect" 
                        style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                      <div style={{ fontSize: '0.5rem', opacity: 0.5 }}>BEFORE</div>
                    </div>
                    {report.completion_image && (
                      <div style={{ textAlign: 'center' }}>
                        <img 
                          src={`http://localhost:3000${report.completion_image}`} 
                          alt="completed" 
                          style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--accent-green)' }} 
                        />
                        <div style={{ fontSize: '0.5rem', color: 'var(--accent-green)' }}>AFTER</div>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: '600' }}>{report.defect_type}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score: {report.quality_score}/10</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.8rem' }}>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</div>
                  <a 
                    href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--accent-cyan)', fontSize: '0.7rem', textDecoration: 'none' }}
                  >
                    View Map <ExternalLink size={10} />
                  </a>
                </td>
                <td>
                  <span className={`badge badge-${category}`}>
                    {report.status}
                  </span>
                </td>
                <td>
                  {report.assigned_to ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={14} color="var(--accent-green)" />
                        <span style={{ fontSize: '0.9rem' }}>{report.assigned_to}</span>
                      </div>
                      {report.completion_notes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '150px', fontStyle: 'italic' }}>
                          "{report.completion_notes}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => setSelectedReport(report)} className="btn-primary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                      <UserPlus size={12} /> Assign
                    </button>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {report.status !== 'paused' && report.status !== 'green' && (
                      <button onClick={() => updateStatus(report.report_id, 'paused')} style={{ background: 'rgba(15, 188, 249, 0.1)', color: 'var(--accent-cyan)' }}>
                        Pause
                      </button>
                    )}
                    {report.status !== 'green' && (
                      <button onClick={() => updateStatus(report.report_id, 'green')} style={{ background: 'rgba(5, 196, 107, 0.1)', color: 'var(--accent-green)' }}>
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedReport && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h3>Assign Recovery Work</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.5rem 0 1.5rem' }}>
              Assigning technician for {selectedReport.defect_type} at {selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}
            </p>
            
            <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Technician / Team Name</label>
            <select 
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem',
                background: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                color: '#333',
                marginTop: '0.5rem',
                fontSize: '0.9rem'
              }}
            >
              <option value="">Select a Technician...</option>
              {technicians.map(tech => (
                <option key={tech.id} value={tech.name}>
                  {tech.name} ({tech.specialty})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => { setSelectedReport(null); setTechnicianName(''); }} style={{ flex: 1, background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                Cancel
              </button>
              <button onClick={handleAssign} className="btn-primary" style={{ flex: 1 }}>
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
