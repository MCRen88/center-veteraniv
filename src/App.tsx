import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Docs } from './pages/Docs';
import { Test } from './pages/Test';
import { Application } from './pages/Application';
import { Registry } from './pages/Registry';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { TestAnalysis } from './pages/TestAnalysis';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="docs" element={<Docs />} />
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
