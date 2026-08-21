import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AccessibilityPanel } from './AccessibilityPanel';
import { useAppContext } from '../context/AppContext';
import { trackActivity } from '../utils/tracker';

export const Layout: React.FC = () => {
  const [ttsError, setTtsError] = useState<string | null>(null);
  const location = useLocation();
  const { state } = useAppContext();

  // Track page visits on location change
  useEffect(() => {
    trackActivity({
      path: location.pathname,
      action: 'visit',
      user: state.currentUser
    });
  }, [location.pathname, state.currentUser?.id]);

  // Periodic heartbeat every 25 seconds while tab is active
  useEffect(() => {
    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        trackActivity({
          path: location.pathname,
          action: 'heartbeat',
          user: state.currentUser
        });
      }
    };

    const intervalId = setInterval(sendHeartbeat, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname, state.currentUser?.id]);

  useEffect(() => {
    const handleTtsError = (e: Event) => {
      const customEvent = e as CustomEvent;
      setTtsError(customEvent.detail?.message || "Помилка відтворення звуку");
      setTimeout(() => setTtsError(null), 8000);
    };

    window.addEventListener('tts-error', handleTtsError);
    return () => window.removeEventListener('tts-error', handleTtsError);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, position: 'relative' }}>
        {ttsError && (
          <div className="container mt-3">
            <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert" style={{ zIndex: 9999 }}>
              <strong>Помилка озвучування:</strong> {ttsError}
              <button type="button" className="btn-close" onClick={() => setTtsError(null)} aria-label="Close"></button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <AccessibilityPanel />
      <Footer />
    </div>
  );
};
