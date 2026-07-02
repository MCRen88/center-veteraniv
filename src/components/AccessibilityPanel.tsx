import React, { useState, useEffect } from 'react';

type FontSize = 'normal' | 'large' | 'xlarge';
type ContrastMode = 'normal' | 'high-contrast';

export const AccessibilityPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('accessibility-font-size') as FontSize) || 'normal';
  });
  const [contrast, setContrast] = useState<ContrastMode>(() => {
    return (localStorage.getItem('accessibility-contrast') as ContrastMode) || 'normal';
  });

  const applyFontSize = (size: FontSize) => {
    document.body.classList.remove('accessibility-font-large', 'accessibility-font-xlarge');
    if (size === 'large') {
      document.body.classList.add('accessibility-font-large');
    } else if (size === 'xlarge') {
      document.body.classList.add('accessibility-font-xlarge');
    }
  };

  const applyContrast = (mode: ContrastMode) => {
    if (mode === 'high-contrast') {
      document.body.classList.add('accessibility-high-contrast');
    } else {
      document.body.classList.remove('accessibility-high-contrast');
    }
  };

  // Sync state with body classes
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    applyContrast(contrast);
  }, [contrast]);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('accessibility-font-size', size);
  };

  const handleContrastChange = (mode: ContrastMode) => {
    setContrast(mode);
    localStorage.setItem('accessibility-contrast', mode);
  };

  const resetSettings = () => {
    handleFontSizeChange('normal');
    handleContrastChange('normal');
  };

  return (
    <>
      <style>{`
        .a11y-widget {
          position: fixed;
          bottom: 25px;
          right: 25px;
          z-index: 9999;
          font-family: 'Roboto', sans-serif;
        }

        .a11y-toggle-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: var(--rich-blue);
          color: white;
          border: none;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          cursor: pointer;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.3s;
        }

        .a11y-toggle-btn:hover {
          transform: scale(1.1);
          background-color: var(--blue);
        }

        .a11y-toggle-btn.active {
          background-color: #2c3e50;
        }

        .a11y-panel {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 320px;
          background: white;
          border-radius: var(--radius-md);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          padding: 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 15px;
          animation: a11yFadeIn 0.25s ease-out;
        }

        @keyframes a11yFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .a11y-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          border-bottom: 1px solid #edf2f7;
          padding-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2d3748;
        }

        .a11y-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .a11y-label {
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
        }

        .a11y-btn-group {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .a11y-btn-group-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .a11y-btn {
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 500;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
          color: #4a5568;
        }

        .a11y-btn:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .a11y-btn.active {
          background: var(--blue);
          color: white;
          border-color: var(--blue);
        }

        .a11y-btn-reset {
          margin-top: 5px;
          width: 100%;
          padding: 10px;
          background: #fff;
          border: 1px dashed #e2e8f0;
          border-radius: var(--radius-sm);
          font-weight: bold;
          font-size: 13px;
          cursor: pointer;
          color: #e53e3e;
          transition: all 0.2s;
        }

        .a11y-btn-reset:hover {
          background: #fff5f5;
          border-color: #feb2b2;
        }
      `}</style>

      <div className="a11y-widget" aria-label="Налаштування інклюзивності">
        <button
          className={`a11y-toggle-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Панель інклюзивності"
          title="Спеціальні можливості для людей з порушеннями зору"
        >
          👁️
        </button>

        {isOpen && (
          <div className="a11y-panel" role="dialog" aria-labelledby="a11y-panel-title">
            <div id="a11y-panel-title" className="a11y-title">
              <span>👁️</span> Налаштування зору
            </div>

            {/* Font Size Settings */}
            <div className="a11y-section">
              <div className="a11y-label">Розмір тексту:</div>
              <div className="a11y-btn-group">
                <button
                  className={`a11y-btn ${fontSize === 'normal' ? 'active' : ''}`}
                  onClick={() => handleFontSizeChange('normal')}
                >
                  Звичайний
                </button>
                <button
                  className={`a11y-btn ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => handleFontSizeChange('large')}
                  style={{ fontSize: '15px' }}
                >
                  Великий
                </button>
                <button
                  className={`a11y-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
                  onClick={() => handleFontSizeChange('xlarge')}
                  style={{ fontSize: '17px' }}
                >
                  Дуже великий
                </button>
              </div>
            </div>

            {/* High Contrast Settings */}
            <div className="a11y-section">
              <div className="a11y-label">Контрастність зображення:</div>
              <div className="a11y-btn-group-2">
                <button
                  className={`a11y-btn ${contrast === 'normal' ? 'active' : ''}`}
                  onClick={() => handleContrastChange('normal')}
                >
                  Звичайна
                </button>
                <button
                  className={`a11y-btn ${contrast === 'high-contrast' ? 'active' : ''}`}
                  onClick={() => handleContrastChange('high-contrast')}
                  style={{ background: contrast === 'high-contrast' ? '#ffff00' : '', color: contrast === 'high-contrast' ? '#000000' : '' }}
                >
                  Контрастна
                </button>
              </div>
            </div>

            {/* Reset Settings */}
            <button className="a11y-btn-reset" onClick={resetSettings}>
              Скинути налаштування
            </button>
          </div>
        )}
      </div>
    </>
  );
};
