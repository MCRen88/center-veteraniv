import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Registry: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  if (!state.currentUser || state.currentUser.role !== 'admin') {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ обмежено</h3>
        <p className="mt-3 mb-4">Реєстр виданих сертифікатів доступний лише для адміністраторів.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>На головну</button>
      </div>
    );
  }

  const filteredRegistry = state.registry.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.cert.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <style>{`
        .search-box {
            max-width: 600px;
            margin: 0 auto 30px;
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 15px 20px 15px 50px;
            border-radius: 25px;
            border: 2px solid var(--light-blue);
            font-family: 'Roboto', sans-serif;
            font-size: 16px;
            transition: var(--transition);
        }

        .search-input:focus {
            outline: none;
            border-color: var(--rich-blue);
            box-shadow: 0 0 15px rgba(64, 105, 165, 0.2);
        }

        .search-icon {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 18px;
        }

        .registry-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--white);
            border-radius: var(--radius-md);
            overflow: hidden;
            box-shadow: var(--shadow-card);
        }

        .registry-table th, .registry-table td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        .registry-table th {
            background-color: var(--dark-blue);
            color: var(--white);
            font-family: 'Comfortaa', cursive;
            font-weight: 500;
        }

        .registry-table tr:hover {
            background-color: var(--bg-light);
        }

      `}</style>

      <section className="container mt-5 mb-5">
        <h2 className="text-center mb-3">Реєстр виданих сертифікатів</h2>
        <p className="text-center mb-5">Відкрита база даних осіб, які успішно пройшли процедуру оцінювання.</p>
        
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Пошук за ПІБ або номером сертифіката..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-responsive">
          <table className="registry-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ПІБ фахівця</th>
                <th>Рівень кваліфікації</th>
                <th>Номер сертифіката</th>
                <th>Дата видачі</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistry.length > 0 ? (
                filteredRegistry.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>{item.title}</td>
                    <td><span style={{ background: 'var(--bg-light)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{item.cert}</span></td>
                    <td>{item.date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center" style={{ padding: '30px' }}>
                    Сертифікатів не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
