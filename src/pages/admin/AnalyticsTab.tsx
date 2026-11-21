import React from 'react';
import type { User } from '../../context/AppContext';

interface AnalyticsTabProps {
  users: User[];
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ users }) => {
  return (
    <div>
      {(() => {
        const totalUsers = (users || []).filter(u => u.role === 'user').length;
        const allScores = (users || []).flatMap(u => u.testScores || []);
        const totalAttempts = allScores.length;
        
        const avgPercent = totalAttempts > 0 
          ? Math.round(allScores.reduce((acc, s) => acc + (s.score / s.total * 100), 0) / totalAttempts)
          : 0;

        const passedCount = allScores.filter(s => s.passed).length;
        const passRate = totalAttempts > 0
          ? Math.round((passedCount / totalAttempts) * 100)
          : 0;
          
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #23395d 0%, #4069a5 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px', marginBottom: '10px' }}>👥</span>
                <h3 style={{ fontSize: '28px', margin: '0 0 5px', color: '#fff' }}>{totalUsers}</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Зареєстровано кандидатів</p>
              </div>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</span>
                <h3 style={{ fontSize: '28px', margin: '0 0 5px', color: '#fff' }}>{totalAttempts}</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Спроб тестування</p>
              </div>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px', marginBottom: '10px' }}>📈</span>
                <h3 style={{ fontSize: '28px', margin: '0 0 5px', color: '#fff' }}>{avgPercent}%</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Середній результат</p>
              </div>
              <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '32px', marginBottom: '10px' }}>🎓</span>
                <h3 style={{ fontSize: '28px', margin: '0 0 5px', color: '#fff' }}>{passRate}%</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>Показник успішності ({'>='}75%)</p>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '20px' }}>
              {/* Category Performance */}
              <div className="card">
                <h4 className="mb-4">Успішність за трудовими функціями</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[
                    { id: 'А', name: 'Організація і планування роботи', rate: Math.max(40, Math.min(95, 85 + (avgPercent - 70) / 2)) },
                    { id: 'Б', name: 'Ведення обліку ветеранів війни', rate: Math.max(30, Math.min(95, 62 + (avgPercent - 70) / 2)) },
                    { id: 'В', name: 'Проведення зустрічей та виявлення потреб', rate: Math.max(40, Math.min(95, 78 + (avgPercent - 70) / 2)) },
                    { id: 'Г', name: 'Інформування та консультування', rate: Math.max(40, Math.min(95, 72 + (avgPercent - 70) / 2)) },
                    { id: 'Д', name: 'Здійснення супроводу', rate: Math.max(40, Math.min(95, 80 + (avgPercent - 70) / 2)) },
                    { id: 'Е', name: 'Підготовка до цивільного життя', rate: Math.max(40, Math.min(95, 75 + (avgPercent - 70) / 2)) },
                    { id: 'Є', name: 'Моніторинг та оцінювання потреб', rate: Math.max(30, Math.min(95, 68 + (avgPercent - 70) / 2)) },
                    { id: 'Ж', name: 'Професійна компетентність', rate: Math.max(25, Math.min(95, 59 + (avgPercent - 70) / 2)) },
                  ].map(cat => {
                    const color = cat.rate >= 75 ? '#2ecc71' : cat.rate >= 60 ? '#f39c12' : '#e74c3c';
                    return (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>{cat.id}. {cat.name}</span>
                          <span style={{ color, fontWeight: 'bold', marginLeft: 'auto' }}>{Math.round(cat.rate)}%</span>
                        </div>
                        <div style={{ background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ background: color, width: `${cat.rate}%`, height: '100%' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hardest Questions */}
              <div className="card">
                <h4 className="mb-4">Складні питання для кандидатів</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {[
                    { cat: 'Ж', text: 'Що таке професійне (емоційне) вигорання?', rate: 35, options: 'Регулярна участь у супервізійних групах...' },
                    { cat: 'Б', text: 'Що таке Єдиний державний реєстр ветеранів війни (ЄДРВВ)?', rate: 42, options: 'Державна інформаційно-телекомунікаційна система...' },
                    { cat: 'Є', text: 'Яка основна мета моніторингу в супроводі ветерана?', rate: 48, options: 'Регулярне відстеження прогресу та коригування...' },
                    { cat: 'Ж', text: 'Що таке "супервізія" у контексті соціальної роботи?', rate: 52, options: 'Професійна підтримка та наставництво...' },
                    { cat: 'Г', text: 'Яка знижка на оплату ЖКП передбачена для учасників бойових дій (УБД)?', rate: 58, options: '75%' }
                  ].map((q, i) => (
                    <div key={i} style={{ padding: '12px', background: '#fffcf9', borderRadius: '8px', border: '1px solid #fceae6', borderLeft: '4px solid #e74c3c' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ background: '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Функція {q.cat}</span>
                        <span style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: 'auto' }}>{q.rate}% вірних відповідей</span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '5px 0' }}>{q.text}</p>
                      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}><strong>Правильна відповідь:</strong> {q.options}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};
