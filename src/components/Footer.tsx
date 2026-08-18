import React from 'react';

export const Footer: React.FC = () => {
  return (
    <>
      <style>{`
        footer {
            background-color: var(--dark-blue);
            color: var(--white);
            padding: 50px 0 20px;
            margin-top: 60px;
        }

        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 40px;
            margin-bottom: 30px;
        }

        .footer-logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            padding: 0;
            object-fit: cover;
            margin-bottom: 15px;
        }

        .footer-heading {
            font-family: 'Comfortaa', cursive;
            font-size: 18px;
            margin-bottom: 15px;
            color: var(--light-blue);
        }

        .footer-contact {
            margin-bottom: 10px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .footer-bottom {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            font-size: 14px;
            color: rgba(255,255,255,0.6);
        }

        @media (max-width: 768px) {
            .footer-grid {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <a href="https://zoippo.zp.ua/main/" target="_blank" rel="noopener noreferrer">
                <img src="/logo-zoippo.png" alt='КЗ "ЗОІППО" ЗОР' className="footer-logo" />
              </a>
              <div className="footer-heading">
                <a href="https://zoippo.zp.ua/main/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Кваліфікаційний центр КЗ "ЗОІППО" ЗОР
                </a>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                Акредитований Національним агентством кваліфікацій центр сертифікації фахівців із супроводу ветеранів війни.
              </p>
            </div>
            <div>
              <div className="footer-heading">Контакти</div>
              <div className="footer-contact">
                <span>📍</span>
                <span>69035 м. Запоріжжя, вул. Незалежної України, 57-А</span>
              </div>
              <div className="footer-contact">
                <span>📞</span>
                <span>
                  <a href="tel:0617171772" style={{ color: 'inherit', textDecoration: 'none' }}>(061) 717-17-72</a><br />
                  <a href="tel:0964772017" style={{ color: 'inherit', textDecoration: 'none' }}>096 477 20 17</a>
                </span>
              </div>
              <div className="footer-contact">
                <span>✉️</span>
                <span>
                  <a href="mailto:orgmetodcentr@zoippo.net.ua" style={{ color: 'inherit', textDecoration: 'none' }}>orgmetodcentr@zoippo.net.ua</a>
                </span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; {new Date().getFullYear()} Комунальний заклад «Запорізький обласний інститут післядипломної педагогічної освіти» Запорізької обласної ради
          </div>
        </div>
      </footer>
    </>
  );
};
