import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AccessibilityPanel } from './AccessibilityPanel';

export const Layout: React.FC = () => {
  const [ttsError, setTtsError] = useState<string | null>(null);

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
