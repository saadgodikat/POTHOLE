import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, CheckCircle, Upload, X, Shield, Camera, FileText, Lock, User } from 'lucide-react';

const TechnicianPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [technician, setTechnician] = useState(null);
  const [loginData, setLoginData] = useState({ name: '', passcode: '' });
  const [technicians, setTechnicians] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchTechniciansList();
    // Check if already logged in (simulated persist)
    const savedTech = localStorage.getItem('tech_auth');
    if (savedTech) {
      try {
        const parsed = JSON.parse(savedTech);
        setTechnician(parsed);
        setIsLoggedIn(true);
        fetchAssignedReports(parsed.name);
      } catch (e) {
        localStorage.removeItem('tech_auth');
      }
    }
  }, []);

  const fetchTechniciansList = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/admin/technicians');
      setTechnicians(res.data);
    } catch (err) {
      console.error('Error fetching technicians', err);
    }
  };

  const fetchAssignedReports = async (name) => {
    setLoading(true);
    try {
      // Fetch reports assigned to THIS specific technician
      const res = await axios.get(`http://localhost:3000/api/reports?status=orange&assigned_to=${encodeURIComponent(name)}`);
      setReports(res.data.reports || []);
    } catch (err) {
      console.error('Error fetching assigned reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const found = technicians.find(t => t.name === loginData.name && t.passcode === loginData.passcode);
    if (found) {
      setTechnician(found);
      setIsLoggedIn(true);
      localStorage.setItem('tech_auth', JSON.stringify(found));
      fetchAssignedReports(found.name);
    } else {
      alert('Invalid Name or Passcode. Hint: Passcode is 1234');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tech_auth');
    setIsLoggedIn(false);
    setTechnician(null);
    setReports([]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please upload a completion photo');

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('notes', notes);

    try {
      await axios.post(`http://localhost:3000/api/reports/${selectedReport.report_id}/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSelectedReport(null);
      setFile(null);
      setPreview(null);
      setNotes('');
      fetchAssignedReports(technician.name);
      alert('Work validated successfully!');
    } catch (err) {
      console.error('Error validating work', err);
      alert('Failed to upload validation.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--accent-cyan)', color: 'white', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Lock size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Technician <span style={{ color: 'var(--accent-cyan)' }}>Login</span></h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Enter your credentials to access assigned work</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>Select Technician</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select 
                  required
                  value={loginData.name}
                  onChange={(e) => setLoginData({...loginData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: '#f8f9fa', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-main)', appearance: 'none' }}
                >
                  <option value="">Select name...</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>Passcode</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password"
                  required
                  placeholder="Enter passcode"
                  value={loginData.passcode}
                  onChange={(e) => setLoginData({...loginData, passcode: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: '#f8f9fa', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '1rem' }} type="submit">Access Tasks</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="technician-portal">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--accent-orange)', color: 'white', padding: '0.6rem', borderRadius: '12px' }}>
              <Briefcase size={24} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Tasks for <span style={{ color: 'var(--accent-orange)' }}>{technician.name}</span></h2>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Managing recovery efforts as {technician.specialty}</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
          Logout
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loader"></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading your tasks...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem', opacity: 0.5 }}>
            <Shield size={64} color="var(--accent-green)" />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Pending Work</h3>
          <p style={{ color: 'var(--text-muted)' }}>Great job! You have completed all work assigned to you.</p>
        </div>
      ) : (
        <div className="tech-task-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {reports.map((report) => (
            <div key={report.report_id} className="glass-card task-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-orange)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--accent-orange)', background: 'rgba(255, 165, 0, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                    #{report.report_id}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', marginTop: '0.5rem', fontWeight: '700' }}>{report.defect_type || 'Road Defect'}</h3>
                </div>
                <img 
                  src={`http://localhost:3000${report.image_url}`} 
                  alt="original" 
                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} 
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                   <strong>Location:</strong> {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </div>
              </div>

              <button 
                onClick={() => setSelectedReport(report)}
                className="btn-primary" 
                style={{ width: '100%', background: 'var(--accent-green)' }}
              >
                Complete Task
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '500px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Submit Completion</h3>
              <button onClick={() => { setSelectedReport(null); setPreview(null); setFile(null); }} style={{ background: 'none', border: 'none', color: 'white' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleValidate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.8rem' }}>Upload Photo</label>
                <div 
                  onClick={() => document.getElementById('file-upload').click()}
                  style={{ border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: preview ? 'none' : 'rgba(255,255,255,0.03)' }}
                >
                  {preview ? (
                    <img src={preview} alt="preview" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <Upload size={32} style={{ opacity: 0.5 }} />
                  )}
                  <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
              </div>

                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter work notes..."
                  style={{ width: '100%', padding: '1rem', background: '#f8f9fa', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-main)', minHeight: '100px', marginBottom: '1.5rem', fontFamily: 'inherit' }}
                />

                <button type="submit" disabled={uploadLoading || !file} className="btn-primary" style={{ width: '100%', padding: '1rem', background: 'var(--accent-green)', color: 'white' }}>
                  {uploadLoading ? 'Uploading...' : 'Verify Completion'}
                </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .loader {
          border: 4px solid rgba(255,255,255,0.1);
          border-left: 4px solid var(--accent-orange);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default TechnicianPortal;
