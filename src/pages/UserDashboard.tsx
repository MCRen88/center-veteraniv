import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const UserDashboard: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [selectedScore, setSelectedScore] = useState<any | null>(null);

  const user = state.currentUser;

  const isImpersonating = !!state.originalAdminUser;
  const hasTestPermission = user ? (user.testPermission || isImpersonating) : false;

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

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} хв ${s} с` : `${s} с`;
  };

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
              {hasTestPermission ? (
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
        
        {hasTestPermission ? (
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/test')}>
            Перейти до тестування
          </button>
        ) : (
          <div className="alert alert-warning d-inline-block">
            {user.testScores && user.testScores.length > 0
              ? "Ви вже пройшли тестування. Повторна спроба можлива лише з дозволу адміністратора."
              : "Кнопка тестування заблокована. Адміністратор ще не надав вам дозвіл на проходження тесту."}
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
                  <th style={{ padding: '10px', textAlign: 'center' }}>Деталі</th>
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
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedScore(score)}
                        >
                          🔍 Аналіз
                        </button>
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

      {/* Attempt detailed review modal */}
      {selectedScore && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '30px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0" style={{ fontSize: '20px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>📊 Аналіз спроби тестування</h3>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setSelectedScore(null)}>❌</button>
            </div>

            <div style={{ background: '#f8fafd', borderRadius: '8px', padding: '15px', marginBottom: '20px', border: '1px solid #e1e8ed' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px' }}>Кандидат:</span>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '15px' }}>{user.name}</p>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px' }}>Дата спроби:</span>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '15px' }}>{new Date(selectedScore.created_at).toLocaleString('uk-UA')}</p>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '12px' }}>Режим тестування:</span>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '15px' }}>
                    {selectedScore.mode === 'exam' ? '🎯 Екзаменаційний' : '📝 Тренувальний'}
                  </p>
                </div>
              </div>
            </div>

            {!selectedScore.details ? (
              <div className="alert alert-info" style={{ margin: 0 }}>
                <strong>Детальна статистика відсутня</strong>
                <p style={{ fontSize: '14px', margin: '5px 0 0' }}>
                  Ця спроба була пройдена до оновлення системи. Доступні лише загальні показники: 
                  оцінка <strong>{selectedScore.score} / {selectedScore.total}</strong> ({((selectedScore.score / selectedScore.total) * 100).toFixed(0)}%), 
                  результат: <strong>{selectedScore.passed ? 'Складено' : 'Не складено'}</strong>.
                </p>
              </div>
            ) : (
              <div>
                {/* 4 Cards Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                  <div style={{ background: '#f8fafd', border: '1px solid #e1e8ed', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>🎯</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {selectedScore.score} / {selectedScore.total}
                    </h4>
                    <span className="badge" style={{
                      background: selectedScore.passed ? '#2ecc71' : '#e74c3c',
                      color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                    }}>
                      {selectedScore.passed ? 'Складено' : 'Не складено'}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafd', border: '1px solid #e1e8ed', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>⏱️</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {formatTime(selectedScore.details.totalTime)}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Загальний час</span>
                  </div>

                  <div style={{ background: '#f8fafd', border: '1px solid #e1e8ed', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>🔄</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {selectedScore.details.questions ? selectedScore.details.questions.reduce((acc: number, q: any) => acc + (q.changes || 0), 0) : 0}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Змін відповідей</span>
                  </div>

                  <div style={{ background: selectedScore.details.tabSwitches > 0 ? '#fdf2f2' : '#f8fafd', border: `1px solid ${selectedScore.details.tabSwitches > 0 ? '#f5c6cb' : '#e1e8ed'}`, borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: selectedScore.details.tabSwitches > 0 ? '#c0392b' : 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {selectedScore.details.tabSwitches || 0}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px', color: selectedScore.details.tabSwitches > 0 ? '#c0392b' : 'inherit' }}>
                      Перемикань вкладок
                    </span>
                  </div>
                </div>

                {/* Behavioral profile card */}
                {selectedScore.details.behaviorProfile && (
                  <div className="card mb-4" style={{ background: '#fcfdfe', border: '1px solid #e1e8ed', borderLeft: '5px solid var(--rich-blue)', padding: '20px', borderRadius: '8px', cursor: 'default', transform: 'none', boxShadow: 'none' }}>
                    <h4 style={{ fontSize: '16px', color: 'var(--dark-blue)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🧠 Психометричний портрет кандидата
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Манера відповідей:</span>{' '}
                        <span className="badge" style={{ background: '#e3f2fd', color: '#1976d2', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedScore.details.behaviorProfile.style}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Впевненість:</span>{' '}
                        <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedScore.details.behaviorProfile.confidence}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Темп роботи:</span>{' '}
                        <span className="badge" style={{ background: '#fff3e0', color: '#e65100', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedScore.details.behaviorProfile.speedCategory}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px', color: '#555' }}>
                      {selectedScore.details.behaviorProfile.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <div>
                        <h5 style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '8px', fontWeight: 'bold' }}>✓ Сильні сторони манери:</h5>
                        <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                          {selectedScore.details.behaviorProfile.strengths?.map((str: string, i: number) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{str}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ fontSize: '13px', color: '#c62828', marginBottom: '8px', fontWeight: 'bold' }}>✗ Зони ризику / Слабкості:</h5>
                        <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                          {selectedScore.details.behaviorProfile.weaknesses?.map((weak: string, i: number) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{weak}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div style={{ background: '#f5f7fa', borderRadius: '6px', padding: '12px', borderLeft: '4px solid #70a1d7', marginBottom: '15px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--rich-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        🔮 Прогноз професійної успішності:
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0, fontWeight: '500' }}>
                        {selectedScore.details.behaviorProfile.forecast}
                      </p>
                    </div>

                    <div style={{ background: '#f9f9f9', borderRadius: '6px', padding: '12px', borderLeft: '4px solid #2ecc71' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#27ae60', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        💡 Рекомендації для кандидата:
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0 }}>
                        {selectedScore.details.behaviorProfile.recommendations}
                      </p>
                    </div>
                  </div>
                )}

                {/* Question breakdown table */}
                <h4 style={{ fontSize: '16px', color: 'var(--dark-blue)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                  📋 Детальний розбір відповідей по кожному питанню
                </h4>
                
                <div style={{ overflowX: 'auto', maxHeight: '350px', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px' }}>
                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>№</th>
                        <th style={{ width: '120px' }}>Функція</th>
                        <th>Текст запитання та відповіді</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Час</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Змін</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Результат</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedScore.details.questions?.map((q: any, index: number) => {
                        const isCorrect = q.selected === q.correct;
                        return (
                          <tr key={index} style={{ background: isCorrect ? '#fcfdfe' : '#fff9f9' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                            <td>
                              <span style={{ fontSize: '11px', background: '#eee', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {q.catId || q.catName?.split('.')[0] || 'Тест'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-dark)', fontSize: '13px' }}>{q.question}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px', fontSize: '12px' }}>
                                {q.options?.map((opt: string, optIdx: number) => {
                                  let optColor = 'var(--text-body)';
                                  let optWeight = 'normal';
                                  let icon = '○';
                                  
                                  if (optIdx === q.correct) {
                                    optColor = '#27ae60';
                                    optWeight = 'bold';
                                    icon = '✓';
                                  }
                                  
                                  if (optIdx === q.selected) {
                                    optWeight = 'bold';
                                    if (optIdx === q.correct) {
                                      optColor = '#27ae60';
                                      icon = '🟢';
                                    } else {
                                      optColor = '#e74c3c';
                                      icon = '🔴';
                                    }
                                  }
                                  
                                  return (
                                    <div key={optIdx} style={{ color: optColor, fontWeight: optWeight }}>
                                      {icon} {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatTime(q.timeSpent)}</td>
                            <td style={{ textAlign: 'center' }}>{q.changes || 0}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                color: isCorrect ? '#27ae60' : '#e74c3c',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                background: isCorrect ? '#e8f5e9' : '#fce8e6',
                                padding: '3px 8px',
                                borderRadius: '12px'
                              }}>
                                {isCorrect ? 'Правильно' : 'Неправильно'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="d-flex justify-content-end" style={{ marginTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => setSelectedScore(null)}>Закрити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
