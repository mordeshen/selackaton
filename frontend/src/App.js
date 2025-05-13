// frontend/src/App.js - עדכון
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, rtlPlugin } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// ייבוא דפים
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/OnBoarding';
import PersonalChat from './pages/PersonalChat';
import ManageInvitations from './pages/admin/ManageInvitations';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// הגדרת RTL עבור Material-UI
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// הגדרת ערכת נושא בעברית
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: [
      'Rubik',
      'Assistant',
      'Arial',
      'sans-serif'
    ].join(','),
  },
});

function App() {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding/:inviteCode" element={<Onboarding />} />
            
            {/* ניתובים מוגנים - דורשים התחברות */}
            <Route path="/personal-chat" element={
              <ProtectedRoute>
                <PersonalChat />
              </ProtectedRoute>
            } />
            
            {/* ניתובים למנהלים בלבד */}
            <Route path="/admin/invitations" element={
              <AdminRoute>
                <ManageInvitations />
              </AdminRoute>
            } />
          </Routes>
        </Router>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
