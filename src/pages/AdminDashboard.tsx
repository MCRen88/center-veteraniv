import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, type Role, type Question } from '../context/AppContext';

export const AdminDashboard: React.FC = () => {
  const { 
    state, 
    grantTestPermission, 
    adminCreateUser, 
    adminUpdateUser, 
    adminDeleteUser, 
    impersonateUser, 
    deleteQuestion,
    addQuestion,
    updateQuestion,
    updateApplicationStatus
  } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'applications' | 'tests' | 'analytics'>('users');
  
  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // User Analytics view state
  const [viewingUserAnalyticsId, setViewingUserAnalyticsId] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Selected application for details modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Selected test score for analysis modal
  const [selectedScore, setSelectedScore] = useState<any | null>(null);

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} хв ${s} с` : `${s} с`;
  };

  // Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    catId: 'А',
    catName: 'Організація і планування роботи',
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  });

  const categoryMap: { [key: string]: string } = {
    'А': 'Організація і планування роботи',
    'Б': 'Ведення обліку ветеранів війни',
    'В': 'Проведення зустрічей та виявлення потреб',
    'Г': 'Інформування та консультування',
    'Д': 'Здійснення супроводу',
    'Е': 'Підготовка до цивільного життя',
    'Є': 'Моніторинг та оцінювання потреб',
    'Ж': 'Професійна компетентність'
  };

  const handleCategoryChange = (catId: string) => {
    setQuestionForm(prev => ({
      ...prev,
      catId,
      catName: categoryMap[catId] || ''
    }));
  };

  const startAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      catId: 'А',
      catName: 'Організація і планування роботи',
      question: '',
      options: ['', '', '', ''],
      correct: 0,
      explanation: ''
    });
    setIsQuestionModalOpen(true);
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionForm({
      catId: q.catId,
      catName: q.catName,
      question: q.question,
      options: [...q.options],
      correct: q.correct,
      explanation: q.explanation || ''
    });
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.question.trim()) {
      alert("Будь ласка, введіть запитання");
      return;
    }
    if (questionForm.options.some(opt => !opt.trim())) {
      alert("Будь ласка, заповніть усі 4 варіанти відповідей");
      return;
    }

    if (editingQuestion) {
      await updateQuestion(editingQuestion.id, {
        catId: questionForm.catId,
        catName: questionForm.catName,
        question: questionForm.question,
        options: questionForm.options,
        correct: questionForm.correct,
        explanation: questionForm.explanation
      });
      alert("Запитання оновлено успішно!");
    } else {
      await addQuestion({
        catId: questionForm.catId,
        catName: questionForm.catName,
        question: questionForm.question,
        options: questionForm.options,
        correct: questionForm.correct,
        explanation: questionForm.explanation
      });
      alert("Запитання додано успішно!");
    }
    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleApproveApp = async (app: any) => {
    if (confirm(`Схвалити заяву ${app.app_number}?`)) {
      await updateApplicationStatus(app.id, 'approved');
      if (confirm(`Заяву схвалено! Бажаєте перейти до створення користувача для ${app.fname} ${app.lname}?`)) {
        setNewUser({
          name: `${app.lname} ${app.fname} ${app.mname || ''}`.trim(),
          email: app.email,
          password: Math.random().toString(36).slice(-8),
          role: 'user'
        });
        setActiveTab('users');
      }
    }
  };

  const handleRejectApp = async (id: string) => {
    if (confirm("Ви дійсно бажаєте відхилити цю заяву?")) {
      await updateApplicationStatus(id, 'rejected');
      alert("Заяву відхилено.");
    }
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as Role,
    testPermission: false
  });

  // New User Form State
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as Role });

  const currentUser = state.currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isTeacher = currentUser?.role === 'teacher';

  if (!currentUser) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ обмежено</h3>
        <p className="mt-3 mb-4">Для перегляду панелі управління необхідно увійти в систему.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Увійти</button>
      </div>
    );
  }

  if (!isAdmin && !isTeacher) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ заборонено</h3>
        <p className="mt-3 mb-4">У вас немає прав для перегляду цієї сторінки.</p>
        <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>В особистий кабінет</button>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminCreateUser({
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role as Role,
      testPermission: false
    });
    setNewUser({ name: '', email: '', password: '', role: 'user' as Role });
    alert("Користувача створено успішно!");
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      testPermission: user.testPermission
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    await adminUpdateUser(editingUser.id, {
      name: editForm.name,
      email: editForm.email,
      password: editForm.password || undefined,
      role: editForm.role,
      testPermission: editForm.testPermission
    });
    setEditingUser(null);
    alert("Дані користувача успішно оновлено!");
  };

  const printDiagnosticReport = (user: any, score: any) => {
    if (!user || !score) return;
    const percentage = Math.round((score.score / score.total) * 100);
    const date = new Date(score.created_at).toLocaleString('uk-UA');
    const details = score.details;
    const behavior = details?.behaviorProfile;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <html><head><title>Діагностичний звіт: ${user.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Roboto', sans-serif; padding: 40px; color: #2c3e50; line-height: 1.5; background: #fff; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #34495e; padding-bottom: 20px; }
          .title { font-family: 'Comfortaa', sans-serif; font-size: 26px; color: #2c3e50; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 16px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }
          .meta-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item { font-size: 14px; }
          .meta-item strong { color: #2c3e50; }
          .section-title { font-family: 'Comfortaa', sans-serif; font-size: 20px; color: #2c3e50; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 30px 0 15px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: #fff; }
          .badge.passed { background-color: #2ecc71; }
          .badge.failed { background-color: #e74c3c; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .table th { background-color: #f8f9fa; color: #2c3e50; font-weight: bold; }
          .portrait-box { background: #fafdff; border-left: 5px solid #3498db; padding: 20px; border-radius: 4px; margin-bottom: 25px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .bullet-list { padding-left: 20px; margin: 0; }
          .bullet-list li { margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
        </head><body>
          <div class="header">
            <div class="title">ДІАГНОСТИЧНИЙ ЗВІТ КАНДИДАТА</div>
            <div class="subtitle">Результати оцінювання професійних знань</div>
          </div>
          
          <div class="meta-section">
            <div class="meta-item">
              <strong>Кандидат:</strong> ${user.name}<br/>
              <strong>Email:</strong> ${user.email}<br/>
              <strong>ID:</strong> ${user.id}
            </div>
            <div class="meta-item">
              <strong>Дата тестування:</strong> ${date}<br/>
              <strong>Режим:</strong> ${score.mode === 'exam' ? '🎯 Екзамен' : '📝 Тренування'}<br/>
              <strong>Оцінка:</strong> ${score.score} з ${score.total} (${percentage}%) &nbsp;
              <span class="badge ${score.passed ? 'passed' : 'failed'}">${score.passed ? 'Складено' : 'Не складено'}</span>
            </div>
          </div>

          <div class="section-title">🧠 Психометричний портрет та поведінковий профіль</div>
          ${behavior ? `
            <div class="portrait-box">
              <p><strong>Манера відповідей:</strong> ${behavior.style} | <strong>Впевненість:</strong> ${behavior.confidence} | <strong>Темп:</strong> ${behavior.speedCategory}</p>
              <p style="margin-top: 10px;">${behavior.description}</p>
            </div>
            <div class="grid-2">
              <div>
                <strong style="color: #27ae60;">✓ Сильні сторони:</strong>
                <ul class="bullet-list" style="margin-top: 8px;">
                  ${behavior.strengths?.map((s: string) => `<li>${s}</li>`).join('') || '<li>Немає даних</li>'}
                </ul>
              </div>
              <div>
                <strong style="color: #c0392b;">✗ Зони ризику / Слабкості:</strong>
                <ul class="bullet-list" style="margin-top: 8px;">
                  ${behavior.weaknesses?.map((w: string) => `<li>${w}</li>`).join('') || '<li>Немає даних</li>'}
                </ul>
              </div>
            </div>
            <div style="margin-top: 20px; background: #f0f7ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db;">
              <strong>🔮 Прогноз професійної успішності:</strong>
              <p style="margin: 5px 0 0; font-size: 13px;">${behavior.forecast}</p>
            </div>
            <div style="margin-top: 15px; background: #f4fbf7; padding: 15px; border-radius: 6px; border-left: 4px solid #2ecc71;">
              <strong>💡 Рекомендації для кандидата:</strong>
              <p style="margin: 5px 0 0; font-size: 13px;">${behavior.recommendations}</p>
            </div>
          ` : `
            <p class="text-muted">Дані психометричного аналізу відсутні для цієї спроби.</p>
          `}

          <div class="section-title">📊 Аналіз успішності за трудовими функціями</div>
          <table class="table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Трудова функція</th>
                <th style="text-align: center;">Результат</th>
                <th style="text-align: center;">Успішність (%)</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const catStats: { [key: string]: { correct: number; total: number; name: string } } = {};
                if (details && details.questions) {
                  details.questions.forEach((q: any) => {
                    const catId = q.catId || q.catName?.split('.')[0] || 'Інше';
                    const catName = q.catName || 'Інша категорія';
                    if (!catStats[catId]) {
                      catStats[catId] = { correct: 0, total: 0, name: catName };
                    }
                    catStats[catId].total++;
                    if (q.selected === q.correct) {
                      catStats[catId].correct++;
                    }
                  });
                }
                const sortedKeys = Object.keys(catStats).sort();
                if (sortedKeys.length === 0) return '<tr><td colspan="4" style="text-align:center;">Немає даних</td></tr>';
                return sortedKeys.map(k => {
                  const stat = catStats[k];
                  const rate = Math.round((stat.correct / stat.total) * 100);
                  return `
                    <tr>
                      <td style="font-weight: bold; width: 40px;">${k}</td>
                      <td>${stat.name}</td>
                      <td style="text-align: center; width: 80px;">${stat.correct} з ${stat.total}</td>
                      <td style="text-align: center; font-weight: bold; width: 120px; color: ${rate >= 75 ? '#27ae60' : rate >= 60 ? '#d35400' : '#c0392b'}">${rate}%</td>
                    </tr>
                  `;
                }).join('');
              })()}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #7f8c8d;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #3498db; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin-bottom: 20px;">Надрукувати звіт</button>
          </div>
        </body></html>
      `);
      reportWindow.document.close();
    }
  };

  const renderUserAnalytics = () => {
    const viewingUser = state.users.find(u => u.id === viewingUserAnalyticsId);
    if (!viewingUser) return null;

    const attempts = viewingUser.testScores || [];
    const selectedAttempt = attempts.find(s => s.id === selectedAttemptId) || (attempts[0] || null);

    // Compute basic statistics
    const totalAttempts = attempts.length;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(s => s.score)) : 0;
    const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, s) => acc + s.score, 0) / totalAttempts) : 0;
    
    const attemptsWithTime = attempts.filter(s => s.details && s.details.totalTime);
    const avgTime = attemptsWithTime.length > 0
      ? Math.round(attemptsWithTime.reduce((acc, s) => acc + s.details.totalTime, 0) / attemptsWithTime.length)
      : 0;

    // Compute cohort statistics
    const allScores = (state.users || []).flatMap(u => u.testScores || []);
    const cohortAvgPercent = allScores.length > 0
      ? Math.round(allScores.reduce((acc, s) => acc + (s.score / s.total * 100), 0) / allScores.length)
      : 0;

    const selectedAttemptPercent = selectedAttempt
      ? Math.round((selectedAttempt.score / selectedAttempt.total) * 100)
      : 0;

    // Compute labor functions stats for selected attempt
    const catStats: { [key: string]: { correct: number; total: number; name: string } } = {};
    if (selectedAttempt && selectedAttempt.details && selectedAttempt.details.questions) {
      selectedAttempt.details.questions.forEach((q: any) => {
        const catId = q.catId || q.catName?.split('.')[0] || 'Інше';
        const catName = q.catName || 'Інша категорія';
        if (!catStats[catId]) {
          catStats[catId] = { correct: 0, total: 0, name: catName };
        }
        catStats[catId].total++;
        if (q.selected === q.correct) {
          catStats[catId].correct++;
        }
      });
    }

    const sortedCatKeys = Object.keys(catStats).sort();

    return (
      <div className="user-analytics-view">
        {/* Back and Title Header */}
        <div className="card mb-4" style={{ background: '#fff', borderLeft: '5px solid var(--blue)' }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '15px' }}>
            <div>
              <button 
                className="btn btn-outline mb-2" 
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => {
                  setViewingUserAnalyticsId(null);
                  setSelectedAttemptId(null);
                }}
              >
                ← Назад до користувачів
              </button>
              <h2 style={{ fontFamily: 'Comfortaa, cursive', margin: '5px 0' }}>Діагностика: {viewingUser.name}</h2>
              <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>
                Email: <strong>{viewingUser.email}</strong> | Роль:{' '}
                <span className="badge" style={{ background: viewingUser.role === 'admin' ? '#e74c3c' : viewingUser.role === 'teacher' ? '#9b59b6' : '#3498db', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                  {viewingUser.role}
                </span>
              </p>
            </div>
            
            <div className="d-flex align-items-center flex-wrap" style={{ gap: '15px' }}>
              {viewingUser.role === 'user' && (
                <div className="d-flex align-items-center" style={{ gap: '15px', background: '#f8fafd', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: '11px', display: 'block' }}>Поточний допуск</span>
                    <span style={{ fontWeight: 'bold', color: viewingUser.testPermission ? '#2ecc71' : '#e74c3c' }}>
                      {viewingUser.testPermission ? '✅ Допущено' : '❌ Заборонено'}
                    </span>
                  </div>
                  {isAdmin && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '13px', background: viewingUser.testPermission ? '#e74c3c' : '#2ecc71', borderColor: viewingUser.testPermission ? '#e74c3c' : '#2ecc71' }}
                      onClick={() => grantTestPermission(viewingUser.id, !viewingUser.testPermission)}
                    >
                      {viewingUser.testPermission ? 'Блокувати' : 'Надати допуск'}
                    </button>
                  )}
                </div>
              )}
              {isAdmin && viewingUser.id !== currentUser.id && (
                <button 
                  className="btn btn-primary animate-hover"
                  style={{ padding: '12px 20px', fontSize: '13px', background: '#34495e', borderColor: '#34495e', color: 'white', borderRadius: '8px' }}
                  onClick={() => {
                    impersonateUser(viewingUser.id);
                    setViewingUserAnalyticsId(null);
                    setSelectedAttemptId(null);
                    navigate('/dashboard');
                  }}
                >
                  👤 Увійти як цей користувач
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Cards Stats Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card text-center" style={{ padding: '20px', background: '#fff' }}>
            <span style={{ fontSize: '30px' }}>🎯</span>
            <h3 style={{ fontSize: '24px', color: 'var(--dark-blue)', margin: '8px 0 2px', fontFamily: 'Comfortaa, cursive' }}>{totalAttempts}</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>Всього спроб</span>
          </div>
          <div className="card text-center" style={{ padding: '20px', background: '#fff' }}>
            <span style={{ fontSize: '30px' }}>🏆</span>
            <h3 style={{ fontSize: '24px', color: 'var(--dark-blue)', margin: '8px 0 2px', fontFamily: 'Comfortaa, cursive' }}>{bestScore}</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>Найкращий бал</span>
          </div>
          <div className="card text-center" style={{ padding: '20px', background: '#fff' }}>
            <span style={{ fontSize: '30px' }}>📈</span>
            <h3 style={{ fontSize: '24px', color: 'var(--dark-blue)', margin: '8px 0 2px', fontFamily: 'Comfortaa, cursive' }}>{avgScore}</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>Середній бал</span>
          </div>
          <div className="card text-center" style={{ padding: '20px', background: '#fff' }}>
            <span style={{ fontSize: '30px' }}>⏱️</span>
            <h3 style={{ fontSize: '24px', color: 'var(--dark-blue)', margin: '8px 0 2px', fontFamily: 'Comfortaa, cursive' }}>{formatTime(avgTime)}</h3>
            <span className="text-muted" style={{ fontSize: '12px' }}>Сер. час спроби</span>
          </div>
        </div>

        {/* Dynamic Labor Functions and Cohort Comparison */}
        <div className="grid-2" style={{ gap: '20px', marginBottom: '30px' }}>
          {/* Category Performance */}
          <div className="card">
            <h4 className="mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>📈 Успішність за трудовими функціями</h4>
            {selectedAttempt ? (
              sortedAttemptStats(catStats, sortedCatKeys)
            ) : (
              <p className="text-muted text-center py-4">Немає даних для аналізу. Кандидат ще не проходив тестування.</p>
            )}
          </div>

          {/* Cohort & Attempts Timeline */}
          <div className="card">
            <h4 className="mb-4" style={{ fontFamily: 'Comfortaa, cursive' }}>📊 Порівняння з іншими кандидатами</h4>
            {selectedAttempt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Результат обраної спроби:</strong>
                    <span style={{ color: selectedAttemptPercent >= 75 ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>{selectedAttemptPercent}%</span>
                  </div>
                  <div style={{ background: '#eee', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ background: selectedAttemptPercent >= 75 ? '#2ecc71' : '#e74c3c', width: `${selectedAttemptPercent}%`, height: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Середній результат по центру (когорта):</strong>
                    <span style={{ color: '#3498db', fontWeight: 'bold' }}>{cohortAvgPercent}%</span>
                  </div>
                  <div style={{ background: '#eee', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ background: '#3498db', width: `${cohortAvgPercent}%`, height: '100%' }}></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafd', borderRadius: '8px', padding: '15px', border: '1px solid #e1e8ed', marginTop: '10px' }}>
                  <strong>Порівняльний аналіз:</strong>
                  <p style={{ fontSize: '13px', margin: '5px 0 0', lineHeight: '1.4' }}>
                    {selectedAttemptPercent > cohortAvgPercent ? (
                      `Кандидат демонструє рівень знань вище середнього показника по установі на ${selectedAttemptPercent - cohortAvgPercent}%. Це свідчить про високу теоретичну підготовку.`
                    ) : selectedAttemptPercent < cohortAvgPercent ? (
                      `Результат кандидата нижче середнього по установі на ${cohortAvgPercent - selectedAttemptPercent}%. Рекомендується звернути увагу на слабкі зони та вивчити нормативну базу.`
                    ) : (
                      "Результат кандидата точно відповідає середньому показнику по установі."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted text-center py-4">Немає спроб для порівняння.</p>
            )}

            {/* Progression timeline */}
            {totalAttempts > 1 && (
              <div style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h5 className="mb-3" style={{ fontSize: '14px', fontWeight: 'bold' }}>🕒 Хронологія спроб кандидата</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attempts.slice().reverse().map((s) => {
                    const pct = Math.round((s.score / s.total) * 100);
                    return (
                      <div 
                        key={s.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '10px 15px', 
                          background: s.id === selectedAttemptId ? '#e3f2fd' : '#f8f9fa', 
                          border: `1px solid ${s.id === selectedAttemptId ? '#1976d2' : '#e2e8f0'}`, 
                          borderRadius: '6px',
                          cursor: 'pointer' 
                        }}
                        onClick={() => setSelectedAttemptId(s.id)}
                      >
                        <div>
                          <span style={{ fontSize: '12px', color: '#666' }}>{new Date(s.created_at || '').toLocaleDateString('uk-UA')}</span>
                          <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 'bold' }}>
                            {s.mode === 'exam' ? '🎯 Іспит' : '📝 Тренування'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ fontSize: '13px' }}>{s.score}/{s.total} ({pct}%)</strong>
                          <span className="badge" style={{ background: s.passed ? '#2ecc71' : '#e74c3c', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                            {s.passed ? 'Складено' : 'Не складено'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown for selected attempt */}
        {selectedAttempt && (
          <div className="card">
            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4" style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'Comfortaa, cursive' }}>📋 Повний звіт проходження (Спроба від {new Date(selectedAttempt.created_at || '').toLocaleDateString('uk-UA')})</h4>
                <p className="text-muted" style={{ margin: '5px 0 0', fontSize: '13px' }}>
                  Режим: <strong>{selectedAttempt.mode === 'exam' ? 'Іспит' : 'Тренування'}</strong> | Оцінка:{' '}
                  <strong>{selectedAttempt.score} з {selectedAttempt.total}</strong> ({selectedAttemptPercent}%)
                </p>
              </div>

              <button 
                className="btn btn-primary"
                style={{ background: '#34495e', borderColor: '#34495e' }}
                onClick={() => printDiagnosticReport(viewingUser, selectedAttempt)}
              >
                🖨️ Друкувати звіт діагностики
              </button>
            </div>

            {/* Psychological portrait */}
            {selectedAttempt.details && selectedAttempt.details.behaviorProfile ? (
              <div className="mb-5" style={{ background: '#f9fbfd', borderLeft: '5px solid var(--blue)', padding: '20px', borderRadius: '8px', border: '1px solid #e1e8ed', borderLeftWidth: '5px' }}>
                <h4 style={{ fontSize: '16px', color: 'var(--dark-blue)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Comfortaa, cursive' }}>
                  🧠 Психометричний портрет та поведінковий профіль
                </h4>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px' }}>
                    <span className="text-muted">Манера відповідей:</span>{' '}
                    <span className="badge" style={{ background: '#e3f2fd', color: '#1976d2', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      {selectedAttempt.details.behaviorProfile.style}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span className="text-muted">Впевненість:</span>{' '}
                    <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      {selectedAttempt.details.behaviorProfile.confidence}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <span className="text-muted">Темп роботи:</span>{' '}
                    <span className="badge" style={{ background: '#fff3e0', color: '#e65100', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      {selectedAttempt.details.behaviorProfile.speedCategory}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px', color: '#444' }}>
                  {selectedAttempt.details.behaviorProfile.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <h5 style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '8px', fontWeight: 'bold' }}>✓ Сильні сторони манери:</h5>
                    <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                      {selectedAttempt.details.behaviorProfile.strengths?.map((str: string, i: number) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{str}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 style={{ fontSize: '13px', color: '#c62828', marginBottom: '8px', fontWeight: 'bold' }}>✗ Зони ризику / Слабкості:</h5>
                    <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                      {selectedAttempt.details.behaviorProfile.weaknesses?.map((weak: string, i: number) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{weak}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', border: '1px solid #e1e8ed', borderLeft: '4px solid #70a1d7', marginBottom: '15px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--rich-blue)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    🔮 Прогноз професійної успішності:
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0, fontWeight: '500' }}>
                    {selectedAttempt.details.behaviorProfile.forecast}
                  </p>
                </div>

                <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', border: '1px solid #e1e8ed', borderLeft: '4px solid #2ecc71' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#27ae60', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    💡 Рекомендації для кандидата:
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0 }}>
                    {selectedAttempt.details.behaviorProfile.recommendations}
                  </p>
                </div>
              </div>
            ) : (
              <div className="alert alert-info mb-5">
                Дані психометричного аналізу відсутні для цієї спроби (тест пройдено на старій версії системи).
              </div>
            )}

            {/* Questions breakdown table */}
            <h4 style={{ fontSize: '16px', color: 'var(--dark-blue)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
              📋 Детальний розбір відповідей по кожному питанню
            </h4>
            
            {selectedAttempt.details && selectedAttempt.details.questions ? (
              <div style={{ overflowX: 'auto', maxHeight: '450px', border: '1px solid #eee', borderRadius: '8px' }}>
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
                    {selectedAttempt.details.questions.map((q: any, index: number) => {
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
                          <td style={{ textAlign: 'center', fontWeight: q.changes > 0 ? 'bold' : 'normal', color: q.changes > 0 ? '#e65100' : 'inherit' }}>
                            {q.changes || 0}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              color: isCorrect ? '#2ecc71' : '#e74c3c', 
                              fontWeight: 'bold',
                              background: isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              display: 'inline-block'
                            }}>
                              {isCorrect ? 'Правильно' : 'Невірно'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted text-center py-4">Звіт проходження питань недоступний для цієї спроби.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const sortedAttemptStats = (catStats: any, sortedCatKeys: string[]) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {sortedCatKeys.map(k => {
          const cat = catStats[k];
          const rate = Math.round((cat.correct / cat.total) * 100);
          const color = rate >= 75 ? '#2ecc71' : rate >= 60 ? '#f39c12' : '#e74c3c';
          return (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                <span style={{ fontWeight: 'bold' }}>{k}. {cat.name}</span>
                <span style={{ color, fontWeight: 'bold', marginLeft: 'auto' }}>{cat.correct} з {cat.total} ({rate}%)</span>
              </div>
              <div style={{ background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ background: color, width: `${rate}%`, height: '100%' }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredUsers = (state.users || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <style>{`
        .admin-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
        }
        .admin-tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            font-weight: bold;
            color: var(--text-muted);
        }
        .admin-tab.active {
            border-bottom-color: var(--blue);
            color: var(--dark-blue);
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        .data-table th, .data-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            text-align: left;
        }
        .data-table th { background: #f9f9f9; }

        .admin-create-form {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr auto;
            gap: 15px;
            align-items: end;
        }
        @media (max-width: 992px) {
            .admin-create-form {
                grid-template-columns: 1fr 1fr;
            }
        }
        @media (max-width: 576px) {
            .admin-create-form {
                grid-template-columns: 1fr;
            }
        }

        .modal-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        @media (max-width: 576px) {
            .modal-grid {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
      <div className="container mt-5 mb-5">
        <h2 className="mb-4">Панель управління ({isAdmin ? 'Адміністратор' : 'Викладач'})</h2>

        <div className="admin-tabs">
          <div className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            Моніторинг користувачів
          </div>
          <div className={`admin-tab ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
            Заяви на оцінювання
          </div>
          {isAdmin && (
            <div className={`admin-tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>
              Редактор тестів
            </div>
          )}
          <div className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            Аналітика та статистика
          </div>
        </div>

        {activeTab === 'users' && (
          viewingUserAnalyticsId ? renderUserAnalytics() : (
            <div>
            {isAdmin && (
              <div className="card mb-4" style={{ background: '#f8fafd' }}>
                <h4>Створення нового користувача</h4>
                <p className="text-muted" style={{ fontSize: '13px' }}>Згідно з регламентом, користувачі не реєструються самостійно. Адміністратор створює профіль після обробки їхньої заяви.</p>
                <form onSubmit={handleCreateUser} className="admin-create-form">
                  <div className="form-group mb-0">
                    <label className="form-label" style={{ fontSize: '12px' }}>ПІБ</label>
                    <input type="text" className="form-control" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label" style={{ fontSize: '12px' }}>Email (Логін)</label>
                    <input type="email" className="form-control" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label" style={{ fontSize: '12px' }}>Пароль</label>
                    <input type="text" className="form-control" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label" style={{ fontSize: '12px' }}>Роль</label>
                    <select className="form-control" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
                      <option value="user">Користувач</option>
                      <option value="teacher">Викладач</option>
                      <option value="admin">Адміністратор</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '44px' }}>Створити</button>
                </form>
              </div>
            )}

            <div className="card">
              <h4 className="mb-3">Список користувачів</h4>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Пошук за ім'ям, email або ID..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <div style={{ minWidth: '180px' }}>
                  <select 
                    className="form-control" 
                    value={roleFilter} 
                    onChange={e => setRoleFilter(e.target.value)}
                  >
                    <option value="all">Всі ролі</option>
                    <option value="user">Користувачі (user)</option>
                    <option value="teacher">Викладачі (teacher)</option>
                    <option value="admin">Адміністратори (admin)</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID / ПІБ</th>
                      <th>Email</th>
                      <th>Роль</th>
                      <th style={{ textAlign: 'center' }}>Тести (спроб)</th>
                      <th>Допуск</th>
                      {isAdmin && <th style={{ textAlign: 'center' }}>Дії</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <button 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              padding: 0, 
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: 'var(--rich-blue)',
                              textDecoration: 'underline',
                              fontWeight: 'bold',
                              fontFamily: 'inherit',
                              fontSize: 'inherit'
                            }}
                            onClick={() => {
                              setViewingUserAnalyticsId(u.id);
                              if (u.testScores && u.testScores.length > 0) {
                                setSelectedAttemptId(u.testScores[0].id);
                              } else {
                                setSelectedAttemptId(null);
                              }
                            }}
                            title="Переглянути детальний профіль та статистику"
                          >
                            {u.name}
                          </button><br/>
                          <span style={{ fontSize: '11px', color: '#999' }}>ID: {u.id}</span>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className="badge" style={{ background: u.role === 'admin' ? '#e74c3c' : u.role === 'teacher' ? '#9b59b6' : '#3498db', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            background: (u.testScores || []).length > 0 ? '#e3f2fd' : '#f5f5f5', 
                            color: (u.testScores || []).length > 0 ? '#1976d2' : '#9e9e9e',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            display: 'inline-block',
                            minWidth: '30px'
                          }}>
                            {(u.testScores || []).length}
                          </span>
                        </td>
                        <td>
                          {u.role === 'user' ? (
                            <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                              <span style={{ color: u.testPermission ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                                {u.testPermission ? 'Допущено' : 'Заборонено'}
                              </span>
                              {isAdmin && (
                                <button 
                                  className="btn btn-outline" 
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                  onClick={() => grantTestPermission(u.id, !u.testPermission)}
                                >
                                  {u.testPermission ? 'Блок' : 'Допуск'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontSize: '12px' }}>Не застосовується</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}
                              onClick={() => startEdit(u)}
                            >
                              ✎ Редагувати
                            </button>
                            {u.id !== currentUser.id && (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                                onClick={async () => {
                                  if (confirm(`Ви дійсно бажаєте видалити користувача ${u.name}?`)) {
                                    await adminDeleteUser(u.id);
                                    alert("Користувача видалено.");
                                  }
                                }}
                              >
                                🗑 Видалити
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

        {isAdmin && activeTab === 'tests' && (
          <div className="card">
            <div className="d-flex justify-content-between align-items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="mb-0">Банк тестових завдань ({(state.questions || []).length})</h4>
              <button className="btn btn-primary" onClick={startAddQuestion}>+ Додати запитання</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Категорія</th>
                    <th>Текст запитання</th>
                    <th>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.questions || []).map((q, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{q.catId || q.catName.split('.')[0]}</span></td>
                      <td style={{ fontSize: '14px' }}>{q.question.substring(0, 80)}{q.question.length > 80 ? '...' : ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '12px', marginRight: '5px' }} onClick={() => startEditQuestion(q)}>✎ Редагувати</button>
                        <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { if(confirm('Видалити запитання?')) deleteQuestion(q.id) }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* APPLICATIONS PANEL TAB */}
        {activeTab === 'applications' && (
          <div className="card">
            <h4 className="mb-3">Заяви на оцінювання та сертифікацію ({(state.applications || []).length})</h4>
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              Тут відображаються подані кандидатами онлайн-заяви. Ви можете перевірити відповідність вимогам, переглянути КЕП-документи, схвалити або відхилити заяви.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Номер заяви</th>
                    <th>Кандидат</th>
                    <th>Рівень кваліфікації</th>
                    <th>Освіта</th>
                    <th>Стаж (р.)</th>
                    <th>Статус</th>
                    <th style={{ textAlign: 'center' }}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.applications || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Заяви відсутні</td>
                    </tr>
                  ) : (
                    (state.applications || []).map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.app_number}</strong></td>
                        <td>{app.lname} {app.fname} {app.mname}</td>
                        <td>{app.level}</td>
                        <td>{app.education}</td>
                        <td>{app.experience}</td>
                        <td>
                          <span className="badge" style={{ 
                            background: app.status === 'approved' ? '#2ecc71' : app.status === 'rejected' ? '#e74c3c' : '#f39c12',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {app.status === 'approved' ? 'Схвалено' : app.status === 'rejected' ? 'Відхилено' : 'Очікує'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }}
                            onClick={() => setSelectedApp(app)}
                          >
                            👁 Деталі
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#2ecc71', borderColor: '#2ecc71', marginRight: '5px' }}
                                onClick={() => handleApproveApp(app)}
                              >
                                ✓ Схвалити
                              </button>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                                onClick={() => handleRejectApp(app.id)}
                              >
                                ✗ Відхилити
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div>
            {(() => {
              const totalUsers = (state.users || []).filter(u => u.role === 'user').length;
              const allScores = (state.users || []).flatMap(u => u.testScores || []);
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
        )}

      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '30px' }}>
            <h3 className="mb-4">Редагування користувача</h3>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label className="form-label">ПІБ</label>
                <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email (Логін)</label>
                <input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Новий пароль (залишіть порожнім, щоб не змінювати)</label>
                <input type="text" className="form-control" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="Введіть новий пароль..." />
              </div>
              <div className="form-group">
                <label className="form-label">Роль</label>
                <select className="form-control" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as Role})}>
                  <option value="user">Користувач</option>
                  <option value="teacher">Викладач</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>
              {editForm.role === 'user' && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="editTestPermission" checked={editForm.testPermission} onChange={e => setEditForm({...editForm, testPermission: e.target.checked})} />
                  <label htmlFor="editTestPermission" className="form-label mb-0" style={{ cursor: 'pointer' }}>Дозволити тестування</label>
                </div>
              )}
              <div className="d-flex justify-content-end" style={{ gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>Скасувати</button>
                <button type="submit" className="btn btn-primary">Зберегти</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0">Профіль користувача</h3>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setSelectedUser(null)}>❌</button>
            </div>
            
            <div className="modal-grid" style={{ marginBottom: '25px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>ПІБ:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedUser.name}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Email (Логін):</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedUser.email || 'Не вказано'}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Унікальний ID:</span>
                <p style={{ fontFamily: 'monospace', fontSize: '13px', margin: '2px 0 0' }}>{selectedUser.id}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Роль:</span>
                <p style={{ margin: '2px 0 0' }}>
                  <span className="badge" style={{ background: selectedUser.role === 'admin' ? '#e74c3c' : selectedUser.role === 'teacher' ? '#9b59b6' : '#3498db', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                    {selectedUser.role}
                  </span>
                </p>
              </div>
              {selectedUser.role === 'user' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span className="text-muted" style={{ fontSize: '12px' }}>Допуск до тестування:</span>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0', color: selectedUser.testPermission ? '#2ecc71' : '#e74c3c' }}>
                    {selectedUser.testPermission ? '✅ Допущено' : '❌ Заблоковано'}
                  </p>
                </div>
              )}
            </div>

            <h4 className="mb-3" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Історія тестування</h4>
            {selectedUser.testScores && selectedUser.testScores.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto', overflowX: 'auto', marginBottom: '25px' }}>
                <table className="data-table" style={{ fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Режим</th>
                      <th>Оцінка</th>
                      <th>Результат</th>
                      <th style={{ textAlign: 'center' }}>Аналіз</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.testScores.map((score: any) => (
                      <tr key={score.id}>
                        <td>{new Date(score.created_at || '').toLocaleString('uk-UA')}</td>
                        <td>{score.mode === 'exam' ? '🎯 Іспит' : '📝 Тренування'}</td>
                        <td><strong>{score.score} / {score.total}</strong> ({(score.score/score.total*100).toFixed(0)}%)</td>
                        <td>
                          <span style={{ color: score.passed ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' }}>
                            {score.passed ? 'Складено' : 'Не складено'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedScore(score)}
                          >
                            🔍 Аналіз
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-4" style={{ fontSize: '14px' }}>Користувач ще не проходив тестування.</p>
            )}

            <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              {isAdmin && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    impersonateUser(selectedUser.id);
                    setSelectedUser(null);
                    navigate('/dashboard');
                  }}
                >
                  👤 Увійти як цей користувач
                </button>
              )}
              <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => setSelectedUser(null)}>Закрити</button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Application Details Modal */}
      {selectedApp && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '650px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0" style={{ fontSize: '20px' }}>Деталі заяви {selectedApp.app_number}</h3>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setSelectedApp(null)}>❌</button>
            </div>
            
            <div className="modal-grid" style={{ marginBottom: '25px' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Прізвище, Ім'я, По батькові:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedApp.lname} {selectedApp.fname} {selectedApp.mname || '-'}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Дата народження:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{new Date(selectedApp.birthdate).toLocaleDateString('uk-UA')}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Контактний телефон:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedApp.phone}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Електронна пошта:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedApp.email}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Рівень кваліфікації:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedApp.level}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Освіта та стаж:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{selectedApp.education}, стаж {selectedApp.experience} р.</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Дата подання:</span>
                <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{new Date(selectedApp.created_at).toLocaleString('uk-UA')}</p>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '12px' }}>Статус заяви:</span>
                <p style={{ margin: '2px 0 0' }}>
                  <span className="badge" style={{ 
                    background: selectedApp.status === 'approved' ? '#2ecc71' : selectedApp.status === 'rejected' ? '#e74c3c' : '#f39c12',
                    color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' 
                  }}>
                    {selectedApp.status === 'approved' ? 'Схвалено' : selectedApp.status === 'rejected' ? 'Відхилено' : 'Очікує розгляду'}
                  </span>
                </p>
              </div>
            </div>

            <h4 className="mb-3" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '16px' }}>Завантажені документи (КЕП-шифровані)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📄</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>passport_scan_signed.pdf</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>Паспорт та ІПН • 2.4 MB • Підпис КЕП перевірено</div>
                  </div>
                </div>
                <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 'auto' }} onClick={() => alert('Завантаження файлу...')}>Завантажити</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📄</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>diploma_and_supplements.pdf</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>Документ про освіту • 3.1 MB • Підпис КЕП перевірено</div>
                  </div>
                </div>
                <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 'auto' }} onClick={() => alert('Завантаження файлу...')}>Завантажити</button>
              </div>
              {selectedApp.experience > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>employment_record.pdf</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>Трудова книжка / підтвердження стажу • 1.8 MB • Підпис КЕП перевірено</div>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', marginLeft: 'auto' }} onClick={() => alert('Завантаження файлу...')}>Завантажити</button>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end" style={{ gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <button className="btn btn-outline" onClick={() => setSelectedApp(null)}>Закрити</button>
              {selectedApp.status === 'pending' && (
                <>
                  <button 
                    className="btn btn-outline" 
                    style={{ color: '#e74c3c', borderColor: '#e74c3c' }}
                    onClick={async () => {
                      await handleRejectApp(selectedApp.id);
                      setSelectedApp(null);
                    }}
                  >
                    Відхилити
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      await handleApproveApp(selectedApp);
                      setSelectedApp(null);
                    }}
                  >
                    Схвалити заяву
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {isQuestionModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '650px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '30px', maxHeight: '95vh', overflowY: 'auto' }}>
            <h3 className="mb-4" style={{ fontSize: '20px' }}>{editingQuestion ? 'Редагувати запитання' : 'Додати нове запитання'}</h3>
            <form onSubmit={handleSaveQuestion}>
              <div className="form-group">
                <label className="form-label">Категорія (трудова функція)</label>
                <select 
                  className="form-control" 
                  value={questionForm.catId} 
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                >
                  <option value="А">А. Організація і планування роботи</option>
                  <option value="Б">Б. Ведення обліку ветеранів війни</option>
                  <option value="В">В. Проведення зустрічей та виявлення потреб</option>
                  <option value="Г">Г. Інформування та консультування</option>
                  <option value="Д">Д. Здійснення супроводу</option>
                  <option value="Е">Е. Підготовка до цивільного життя</option>
                  <option value="Є">Є. Моніторинг та оцінювання потреб</option>
                  <option value="Ж">Ж. Професійна компетентність</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Текст запитання</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '80px', resize: 'vertical' }}
                  value={questionForm.question} 
                  onChange={e => setQuestionForm({...questionForm, question: e.target.value})} 
                  placeholder="Введіть текст запитання..."
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Варіанти відповідей (виберіть правильний радіо-кнопкою)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {questionForm.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="radio" 
                        name="correctAnswer" 
                        checked={questionForm.correct === i} 
                        onChange={() => setQuestionForm({...questionForm, correct: i})} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        value={opt} 
                        onChange={e => {
                          const updatedOptions = [...questionForm.options];
                          updatedOptions[i] = e.target.value;
                          setQuestionForm({...questionForm, options: updatedOptions});
                        }} 
                        placeholder={`Варіант ${i + 1}...`}
                        required 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Пояснення правильної відповіді (для тренувального режиму)</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '80px', resize: 'vertical' }}
                  value={questionForm.explanation} 
                  onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})} 
                  placeholder="Введіть пояснення правильної відповіді..."
                  required
                />
              </div>

              <div className="d-flex justify-content-end" style={{ gap: '10px', marginTop: '30px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsQuestionModalOpen(false)}>Скасувати</button>
                <button type="submit" className="btn btn-primary">{editingQuestion ? 'Зберегти зміни' : 'Створити запитання'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Attempt Analysis Modal */}
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
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '15px' }}>{selectedUser?.name || 'Завантаження...'}</p>
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
                            <td style={{ textAlign: 'center', fontWeight: q.changes > 0 ? 'bold' : 'normal', color: q.changes > 0 ? '#e65100' : 'inherit' }}>
                              {q.changes || 0}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                color: isCorrect ? '#2ecc71' : '#e74c3c', 
                                fontWeight: 'bold',
                                background: isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                display: 'inline-block'
                              }}>
                                {isCorrect ? 'Правильно' : 'Невірно'}
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

            <div className="d-flex justify-content-end" style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <button className="btn btn-outline" onClick={() => setSelectedScore(null)}>Закрити</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
