import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import TechnicianLayout from './layouts/TechnicianLayout';
import PortalSelection from './pages/PortalSelection';
import DashboardHome from './pages/DashboardHome';
import ReportsList from './pages/ReportsList';
import Technicians from './pages/Technicians';
import TechnicianPortal from './pages/TechnicianPortal';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<PortalSelection />} />

        {/* Admin Portal Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="emergency" element={<ReportsList category="emergency" />} />
          <Route path="moderate" element={<ReportsList category="moderate" />} />
          <Route path="paused" element={<ReportsList category="paused" />} />
          <Route path="completed" element={<ReportsList category="completed" />} />
          <Route path="technicians" element={<Technicians />} />
        </Route>

        {/* Technician Portal Routes */}
        <Route path="/technician" element={<TechnicianLayout />}>
          <Route index element={<TechnicianPortal />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
