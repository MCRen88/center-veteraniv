import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const UserDashboard: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  const user = state.currentUser;

  if (!user) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ обмежено</h3>
        <p className="mt-3 mb-4">Для перегляду особистого кабінету необхідно увійти в систему.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Увійти</button>
      </div>
    );
  }

  if (user.role === 'admin' || user.role === 'teacher') {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Особистий кабінет кандидата</h3>
        <p className="mt-3 mb-4">Ви увійшли як {user.role === 'admin' ? 'Адміністратор' : 'Викладач'}. Для управління системою перейдіть до адмін-панелі.</p>
        <button className="btn btn-primary" onClick={() => navigate('/admin')}>Перейти до адмін-панелі</button>
      </div>
    );
  }

  return (
    <div className="container mt-5 mb-5">
      <div className="card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Особистий кабінет</h2>
          <span className="badge bg-primary px-3 py-2" style={{ borderRadius: '20px', background: 'var(--blue)', color: 'white' }}>
            Кандидат
          </span>
        </div>
        <div className="grid-2">
          <div>
            <h4 className="mb-3">Мої дані</h4>
            <p><strong>ПІБ:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Статус допуску до тесту:</strong> 
              {user.testPermission ? (
                <span style={{ color: '#2ecc71', fontWeight: 'bold', marginLeft: '10px' }}>Допущено</span>
              ) : (
                <span style={{ color: '#e67e22', fontWeight: 'bold', marginLeft: '10px' }}>Очікується рішення</span>
              )}
            </p>
          </div>
          <div>
            <h4 className="mb-3">Навчальні матеріали</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="mb-2">📚 <Link to="/docs" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Нормативна база (Профстандарт, Постанови)</Link></li>
              <li className="mb-2">📘 <a href="#" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Методичні рекомендації до тестування (PDF)</a></li>
              <li className="mb-2">🎥 <a href="#" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Відео-інструкція по роботі з порталом</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card text-center mb-4">
        <h3 className="mb-3">Тестування</h3>
        <p className="text-muted mb-4">Оцінювання теоретичних знань професійного стандарту.</p>
        
        {user.testPermission ? (
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/test')}>
            Перейти до тестування
          </button>
        ) : (
          <div className="alert alert-warning d-inline-block">
            Кнопка тестування заблокована. Адміністратор ще не надав вам дозвіл на проходження тесту.
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-4">Моя статистика</h3>
        {user.testScores.length > 0 ? (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px' }}>Дата</th>
                  <th style={{ padding: '10px' }}>Режим</th>
                  <th style={{ padding: '10px' }}>Результат</th>
                  <th style={{ padding: '10px' }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {user.testScores.map(score => {
                  const percentage = Math.round((score.score / score.total) * 100);
                  const passed = percentage >= 75;
                  return (
                    <tr key={score.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{new Date(score.created_at || '').toLocaleDateString('uk-UA')}</td>
                      <td style={{ padding: '10px' }}>{score.mode === 'exam' ? 'Екзамен' : 'Тренування'}</td>
                      <td style={{ padding: '10px' }}>{score.score} з {score.total} ({percentage}%)</td>
                      <td style={{ padding: '10px', color: passed ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                        {passed ? 'Складено' : 'Не складено'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-center py-4">Ви ще не проходили жодного тесту.</p>
        )}
      </div>
    </div>
  );
};
