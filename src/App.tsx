import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

// Heavy pages (node-forge, admin tools, the exam) load on demand, so the home page stays light.
// The Suspense boundary is in Layout, so the navbar stays visible while a page loads.
const Docs = lazy(() => import('./pages/Docs').then(m => ({ default: m.Docs })));
const Booklet = lazy(() => import('./pages/Booklet').then(m => ({ default: m.Booklet })));
const Test = lazy(() => import('./pages/Test').then(m => ({ default: m.Test })));
const Application = lazy(() => import('./pages/Application').then(m => ({ default: m.Application })));
const Registry = lazy(() => import('./pages/Registry').then(m => ({ default: m.Registry })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TestAnalysis = lazy(() => import('./pages/TestAnalysis').then(m => ({ default: m.TestAnalysis })));

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="docs" element={<Docs />} />
            <Route path="booklet" element={<Booklet />} />
            <Route path="test" element={<Test />} />
            <Route path="application" element={<Application />} />
            <Route path="registry" element={<Registry />} />
            <Route path="login" element={<Login />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="test-analysis/:scoreId" element={<TestAnalysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
