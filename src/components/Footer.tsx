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
              <img src="/logo-zoippo.png" alt="ЗОІППО" className="footer-logo" />
              <div className="footer-heading">Кваліфікаційний центр ЗОІППО</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                Акредитований Національним агентством кваліфікацій центр сертифікації фахівців із супроводу ветеранів війни.
              </p>
            </div>
            <div>
              <div className="footer-heading">Контакти</div>
              <div className="footer-contact">
                <span>📍</span>
                <span>
                  <strong>І корпус:</strong> 69035 м.Запоріжжя, вул Незалежної України, 57-А<br />
                  <strong>ІІ корпус:</strong> 69061 м.Запоріжжя, пр. Соборний, 145
                </span>
              </div>
              <div className="footer-contact">
                <span>📞</span>
                <span>(061) 717-17-72</span>
              </div>
              <div className="footer-contact">
                <span>✉️</span>
                <span>osvita@zoippo.net.ua</span>
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
