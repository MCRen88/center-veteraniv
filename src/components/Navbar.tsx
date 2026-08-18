import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { state, logout, stopImpersonating } = useAppContext();
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .navbar {
            background-color: var(--white);
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 1000;
            border-bottom: 3px solid var(--light-blue);
        }
        
        .nav-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 70px;
            max-width: 1400px;
            gap: 30px;
        }

        .nav-logo {
            font-family: 'Comfortaa', cursive;
            font-weight: 700;
            font-size: 20px;
            color: var(--dark-blue);
            text-decoration: none;
            white-space: nowrap;
            flex-shrink: 0;
            margin-right: 25px;
        }

        .nav-links {
            display: flex;
            gap: 16px;
            align-items: center;
        }
        
        .nav-link {
            text-decoration: none;
            color: var(--text-dark);
            font-family: 'Comfortaa', cursive;
            font-weight: 600;
            font-size: 14.5px;
            padding: 8px 4px;
            position: relative;
            transition: var(--transition);
            white-space: nowrap;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            background-color: var(--blue);
            transition: var(--transition);
        }

        .nav-link:hover {
            color: var(--blue);
        }

        .nav-link:hover::after, .nav-link.active::after {
            width: 100%;
        }

        .nav-link.active {
            color: var(--blue);
        }

        .hamburger {
            display: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--dark-blue);
        }

        .user-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--bg-light);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
            color: var(--dark-blue);
            font-family: 'Comfortaa', cursive;
            font-weight: 600;
            max-width: 240px;
            border: 1px solid rgba(81, 144, 207, 0.15);
            flex-shrink: 0;
        }

        .user-badge-icon {
            font-size: 14px;
        }

        .user-badge-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .btn-logout {
            background: transparent;
            border: 1.5px solid var(--text-muted);
            color: var(--text-muted);
            padding: 6px 16px;
            font-size: 14px;
            border-radius: 20px;
            cursor: pointer;
            font-family: 'Comfortaa', cursive;
            font-weight: 600;
            transition: var(--transition);
            white-space: nowrap;
        }

        .btn-logout:hover {
            border-color: #e74c3c;
            color: #e74c3c;
            background: rgba(231, 76, 60, 0.05);
        }

        @media (max-width: 1280px) and (min-width: 1101px) {
            .nav-links {
                gap: 10px;
            }
            .nav-link {
                font-size: 13.5px;
                padding: 6px 2px;
            }
            .nav-logo {
                font-size: 18px;
                margin-right: 15px;
            }
            .user-badge {
                padding: 5px 10px;
                font-size: 13px;
                max-width: 180px;
            }
            .btn-logout {
                padding: 5px 12px;
                font-size: 13px;
            }
        }

        @media (max-width: 1100px) {
            .nav-container {
                padding: 0 20px;
            }
            .hamburger {
                display: block;
            }
            .nav-links {
                position: absolute;
                top: 70px;
                left: 0;
                right: 0;
                background: var(--white);
                flex-direction: column;
                gap: 15px;
                padding: 25px 20px;
                box-shadow: 0 10px 15px rgba(0,0,0,0.1);
                clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
                transition: clip-path 0.3s ease-in-out;
                align-items: center;
            }
            .nav-links.active {
                clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            }
            .nav-link {
                width: 100%;
                text-align: center;
                padding: 10px;
                border-bottom: none;
                font-size: 15px;
            }
            .nav-link::after {
                display: none;
            }
            .user-badge {
                max-width: 100%;
                width: auto;
            }
            .btn-logout {
                width: 100%;
                max-width: 200px;
                text-align: center;
            }
        }

        @media (max-width: 480px) {
            .nav-logo {
                font-size: 17px;
                margin-right: 10px;
            }
        }

        @media (max-width: 360px) {
            .nav-logo {
                font-size: 15px;
                margin-right: 5px;
            }
        }
      `}</style>
      {state.originalAdminUser && (
        <div style={{
          backgroundColor: '#ff9800',
          color: '#fff',
          padding: '10px 20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontFamily: 'Comfortaa, sans-serif',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          zIndex: 1001,
          position: 'relative',
          flexWrap: 'wrap'
        }}>
          <span>
            ⚠️ Ви увійшли під ім'ям: <strong>{state.currentUser?.name}</strong> ({state.currentUser?.email}). 
            Оригінальна сесія: <strong>{state.originalAdminUser.name}</strong>.
          </span>
          <button 
            style={{ 
              padding: '4px 12px', 
              fontSize: '12px', 
              color: '#fff', 
              borderColor: '#fff',
              border: '1px solid #fff',
              borderRadius: '4px',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => {
              stopImpersonating();
              navigate('/admin');
            }}
          >
            Повернутися до Адміна
          </button>
        </div>
      )}
      <nav className="navbar">
        <div className="container nav-container">
          <a 
            href="https://zoippo.zp.ua/main/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-logo" 
            onClick={() => setMobileMenuOpen(false)}
          >
            КЗ "ЗОІППО" ЗОР
          </a>
          
          <div className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            ☰
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Головна</NavLink>
            <NavLink to="/docs" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Нормативна база</NavLink>
            <NavLink to="/application" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Подати заяву</NavLink>
            <NavLink to="/registry" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Реєстр</NavLink>
            
            {state.currentUser ? (
              <>
                {(state.currentUser.role === 'admin' || state.currentUser.role === 'teacher') ? (
                  <NavLink to="/admin" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Адмін-панель</NavLink>
                ) : (
                  <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} onClick={() => setMobileMenuOpen(false)}>Кабінет</NavLink>
                )}
                <div className="user-badge" title={`${state.currentUser.name} (${state.currentUser.email})`}>
                  <span className="user-badge-icon">👤</span>
                  <span className="user-badge-text">{state.currentUser.name || state.currentUser.email}</span>
                </div>
                <button 
                  className="btn-logout" 
                  onClick={() => { logout(); navigate('/'); setMobileMenuOpen(false); }}
                >
                  Вийти
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn btn-primary" style={{ padding: '8px 20px', marginLeft: '10px' }} onClick={() => setMobileMenuOpen(false)}>Увійти</NavLink>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
