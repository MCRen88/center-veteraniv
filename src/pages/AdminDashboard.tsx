import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, type Role, type Question, type Case, type RegistryItem, type Application, type User, type TestScore } from '../context/AppContext';
import type { SignatureDetails, UploadedDocument } from '../lib/database.types';
import type { QuestionResult } from '../utils/testAnalytics';
import { generatePassword } from '../utils/password';
import forge from 'node-forge';
import {
  type DocumentItem,
  getDocumentDataUrl,
  downloadDocument,
  openPdfPreview,
  printCertificate,
  printOfficialApplication,
  printDiagnosticReport
} from './admin/printDocuments';
import { VisitsTab } from './admin/VisitsTab';
import { AnalyticsTab } from './admin/AnalyticsTab';
import { getBehaviorProfile } from '../utils/testAnalytics';
import { supabase } from '../lib/supabase';


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
    addCase,
    updateCase,
    deleteCase,
    updateApplicationStatus,
    deleteApplication,
    addRegistryItem,
    updateRegistryItem,
    deleteRegistryItem,
    fetchVisitsData,
    loadApplicationDetails
  } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'visits' | 'applications' | 'tests' | 'registry' | 'analytics'>('users');
  const [testsSubTab, setTestsSubTab] = useState<'questions' | 'cases'>('questions');

  // Two-step application delete states
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [deleteAppStep, setDeleteAppStep] = useState<1 | 2>(1);
  const [deleteAppConfirmText, setDeleteAppConfirmText] = useState('');
  const [isDeletingApp, setIsDeletingApp] = useState(false);

  // Case Modal State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseForm, setCaseForm] = useState({
    title: '',
    situation: '',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: ''
  });

  const startAddCase = () => {
    setEditingCase(null);
    setCaseForm({
      title: '',
      situation: '',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    });
    setIsCaseModalOpen(true);
  };

  const startEditCase = (c: Case) => {
    setEditingCase(c);
    setCaseForm({
      title: c.title,
      situation: c.situation,
      question: c.question,
      options: [...c.options],
      correctAnswer: c.correctAnswer,
      explanation: c.explanation || ''
    });
    setIsCaseModalOpen(true);
  };

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.title.trim()) {
      alert("Будь ласка, введіть заголовок кейсу");
      return;
    }
    if (!caseForm.situation.trim()) {
      alert("Будь ласка, введіть опис ситуації");
      return;
    }
    if (!caseForm.question.trim()) {
      alert("Будь ласка, введіть запитання");
      return;
    }
    if (caseForm.options.some(opt => !opt.trim())) {
      alert("Будь ласка, заповніть усі варіанти відповідей");
      return;
    }

    if (editingCase) {
      await updateCase(editingCase.id, {
        title: caseForm.title,
        situation: caseForm.situation,
        question: caseForm.question,
        options: caseForm.options,
        correctAnswer: caseForm.correctAnswer,
        explanation: caseForm.explanation
      });
      alert("Кейс оновлено успішно!");
    } else {
      await addCase({
        title: caseForm.title,
        situation: caseForm.situation,
        question: caseForm.question,
        options: caseForm.options,
        correctAnswer: caseForm.correctAnswer,
        explanation: caseForm.explanation
      });
      alert("Кейс додано успішно!");
    }
    setIsCaseModalOpen(false);
    setEditingCase(null);
  };
  
  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // User Analytics view state
  const [viewingUserAnalyticsId, setViewingUserAnalyticsId] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  // Selected application for details modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Selected test score for analysis modal
  const [selectedScore, setSelectedScore] = useState<TestScore | null>(null);
  const selectedProfile = getBehaviorProfile(selectedScore?.details);

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
      correct: q.correct ?? 0,
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

  const handleApproveApp = async (app: Application) => {
    if (confirm(`Схвалити заяву ${app.app_number}?`)) {
      await updateApplicationStatus(app.id, 'approved');
      if (confirm(`Заяву схвалено! Бажаєте перейти до створення користувача для ${app.fname} ${app.lname}?`)) {
        setNewUser({
          name: `${app.lname} ${app.fname} ${app.mname || ''}`.trim(),
          email: app.email,
          password: generatePassword(),
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

  const initiateDeleteApp = (app: Application) => {
    setAppToDelete(app);
    setDeleteAppStep(1);
    setDeleteAppConfirmText('');
  };

  const handleConfirmDeleteApp = async () => {
    if (!appToDelete) return;

    if (deleteAppStep === 1) {
      setDeleteAppStep(2);
      setDeleteAppConfirmText('');
      return;
    }

    if (deleteAppStep === 2) {
      setIsDeletingApp(true);
      const success = await deleteApplication(appToDelete.id);
      setIsDeletingApp(false);
      if (success) {
        if (selectedApp?.id === appToDelete.id) {
          setSelectedApp(null);
        }
        const appNum = appToDelete.app_number;
        setAppToDelete(null);
        alert(`Заяву ${appNum} успішно видалено.`);
      }
    }
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as Role,
    testPermission: false
  });

  // New User Form State
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as Role });

  // Certificate Registry States
  const [registrySearchTerm, setRegistrySearchTerm] = useState('');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certModalMode, setCertModalMode] = useState<'create' | 'edit' | 'reissue'>('create');
  const [editingCert, setEditingCert] = useState<RegistryItem | null>(null);
  const [certForm, setCertForm] = useState({
    name: '',
    title: 'Фахівець із супроводу ветеранів війни та демобілізованих осіб',
    cert: '',
    date: ''
  });

  // Visits & Online Monitoring States
  const [autoRefreshOnline, setAutoRefreshOnline] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const handleRefreshVisits = async () => {
    await fetchVisitsData();
    setLastRefreshedAt(new Date());
  };

  // Render-time clock for "online" / "time ago" labels, refreshed with the polling below.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    fetchVisitsData();
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (autoRefreshOnline && document.visibilityState === 'visible') {
        fetchVisitsData();
        setLastRefreshedAt(new Date());
      }
    }, 15000);
    return () => clearInterval(interval);
    // fetchVisitsData is recreated on every provider render; the interval must not restart for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshOnline]);

  const timeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Невідомо';
    const diffSec = Math.floor((nowMs - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 15) return 'Щойно';
    if (diffSec < 60) return `${diffSec} сек тому`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} хв тому`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} год тому`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} дн тому`;
    return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Document preview & download states
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const MISSING_FILE = 'Вміст файлу відсутній: заявник його не завантажив або файл не вдалося прочитати.';

  const handleDownloadDoc = (item: DocumentItem) => {
    if (!downloadDocument(item)) alert(MISSING_FILE);
  };

  const handlePreviewDoc = (item: DocumentItem) => {
    const effectiveDataUrl = getDocumentDataUrl(item);
    if (!effectiveDataUrl) {
      alert(MISSING_FILE);
      return;
    }
    const updatedItem = {
      ...item,
      dataUrl: effectiveDataUrl
    };

    if (effectiveDataUrl && effectiveDataUrl.startsWith('data:application/pdf')) {
      if (openPdfPreview(item.name, effectiveDataUrl)) {
        return;
      }
    }
    setPreviewDoc(updatedItem);
  };

  // Numbers come from a database sequence, so two certificates never share one.
  const generateCertNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_certificate_number');
    if (error || typeof data !== 'string') {
      alert('Не вдалося отримати номер сертифіката: ' + (error?.message || 'невідома помилка'));
      return '';
    }
    return data;
  };

  const startAddCert = async (defaultName?: string | React.MouseEvent) => {
    const name = typeof defaultName === 'string' ? defaultName : '';
    setEditingCert(null);
    setCertModalMode('create');
    setCertForm({
      name,
      title: 'Фахівець із супроводу ветеранів війни та демобілізованих осіб',
      cert: await generateCertNumber(),
      date: new Date().toLocaleDateString('uk-UA')
    });
    setIsCertModalOpen(true);
  };

  const startEditCert = (item: RegistryItem) => {
    setEditingCert(item);
    setCertModalMode('edit');
    setCertForm({
      name: item.name,
      title: item.title,
      cert: item.cert,
      date: item.date
    });
    setIsCertModalOpen(true);
  };

  const startReissueCert = async (item: RegistryItem) => {
    setEditingCert(item);
    setCertModalMode('reissue');
    setCertForm({
      name: item.name,
      title: item.title,
      cert: await generateCertNumber(),
      date: new Date().toLocaleDateString('uk-UA')
    });
    setIsCertModalOpen(true);
  };

  const handleRevokeCert = async (item: RegistryItem) => {
    if (confirm(`Ви дійсно бажаєте АНУЛЮВАТИ сертифікат № ${item.cert} для ${item.name}?\n\nЗапис буде назавжди вилучено з офіційного публічного реєстру.`)) {
      await deleteRegistryItem(item.id);
      alert(`Сертифікат № ${item.cert} успішно анульовано та вилучено з реєстру.`);
    }
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.name.trim() || !certForm.cert.trim()) {
      alert("Будь ласка, заповніть ПІБ та номер сертифіката.");
      return;
    }

    if (certModalMode === 'create') {
      await addRegistryItem({
        name: certForm.name.trim(),
        title: certForm.title.trim(),
        cert: certForm.cert.trim(),
        date: certForm.date || new Date().toLocaleDateString('uk-UA')
      });
      alert("Сертифікат успішно додано до реєстру!");
    } else if (certModalMode === 'edit') {
      if (editingCert) {
        await updateRegistryItem(editingCert.id, {
          name: certForm.name.trim(),
          title: certForm.title.trim(),
          cert: certForm.cert.trim(),
          date: certForm.date || editingCert.date
        });
        alert("Дані сертифіката успішно оновлено!");
      }
    } else if (certModalMode === 'reissue') {
      if (editingCert) {
        await updateRegistryItem(editingCert.id, {
          name: certForm.name.trim(),
          title: certForm.title.trim(),
          cert: certForm.cert.trim(),
          date: certForm.date || new Date().toLocaleDateString('uk-UA')
        });
        alert(`Сертифікат для ${certForm.name} успішно перевипущено! Новий номер: ${certForm.cert}`);
      }
    }

    setIsCertModalOpen(false);
    setEditingCert(null);
  };

  const handlePrintCert = (item: RegistryItem) => {
    printCertificate(item);
  };

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

  const startEdit = (user: User) => {
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

  const renderUserAnalytics = () => {
    const viewingUser = state.users.find(u => u.id === viewingUserAnalyticsId);
    if (!viewingUser) return null;

    const attempts = viewingUser.testScores || [];
    const selectedAttempt = attempts.find(s => s.id === selectedAttemptId) || (attempts[0] || null);

    // Compute basic statistics
    const totalAttempts = attempts.length;
    const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(s => s.score)) : 0;
    const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((acc, s) => acc + s.score, 0) / totalAttempts) : 0;
    
    const attemptsWithTime = attempts.filter(s => {
      if (!s.details) return false;
      let detailsObj = s.details;
      if (typeof detailsObj === 'string') {
        try {
          detailsObj = JSON.parse(detailsObj);
        } catch {
          return false;
        }
      }
      return detailsObj && (detailsObj.totalTime || detailsObj.totalTime === 0);
    });

    const totalTimeSum = attemptsWithTime.reduce((acc, s) => {
      let detailsObj = s.details;
      if (typeof detailsObj === 'string') {
        try {
          detailsObj = JSON.parse(detailsObj);
        } catch {
          return acc;
        }
      }
      const t = Number(detailsObj?.totalTime);
      return acc + (isNaN(t) ? 0 : t);
    }, 0);

    const avgTime = attemptsWithTime.length > 0
      ? Math.round(totalTimeSum / attemptsWithTime.length)
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
      selectedAttempt.details.questions.forEach((q: QuestionResult) => {
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
                  <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.4' }}>
                    {selectedAttemptPercent > cohortAvgPercent ? (
                      selectedAttemptPercent >= 75 ? (
                        `Кандидат демонструє рівень знань вище середнього показника по установі на ${selectedAttemptPercent - cohortAvgPercent}%, що підтверджує його достатню теоретичну підготовку.`
                      ) : (
                        `Хоча результат кандидата на ${selectedAttemptPercent - cohortAvgPercent}% вищий за середній по установі, він є недостатнім для складання іспиту (менше 75%). Кандидату потрібна додаткова підготовка.`
                      )
                    ) : selectedAttemptPercent < cohortAvgPercent ? (
                      `Результат кандидата нижче середнього по установі на ${cohortAvgPercent - selectedAttemptPercent}%. Рекомендується звернути увагу на слабкі зони та вивчити нормативну базу.`
                    ) : (
                      selectedAttemptPercent >= 75 ? (
                        "Результат кандидата відповідає середньому показнику по установі та є достатнім для успішного складання."
                      ) : (
                        "Результат кандидата відповідає середньому показнику по установі, але є недостатнім для складання іспиту (менше 75%)."
                      )
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
          <div className="card" style={{ borderLeft: '5px solid var(--blue)', padding: '25px', background: '#f8fafd' }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '15px' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'Comfortaa, cursive', color: 'var(--dark-blue)' }}>
                  📋 Аналіз спроби від {new Date(selectedAttempt.created_at || '').toLocaleDateString('uk-UA')}
                </h4>
                <p className="text-muted" style={{ margin: '5px 0 0', fontSize: '14px' }}>
                  Режим: <strong>{selectedAttempt.mode === 'exam' ? 'Іспит' : 'Тренування'}</strong> | Оцінка:{' '}
                  <strong>{selectedAttempt.score} з {selectedAttempt.total}</strong> ({selectedAttemptPercent}%)
                </p>
              </div>
              <div className="d-flex" style={{ gap: '10px' }}>
                <button 
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 'bold' }}
                  onClick={() => navigate(`/test-analysis/${selectedAttempt.id}`)}
                >
                  🔍 Відкрити аналіз спроби
                </button>
                <button 
                  className="btn btn-outline"
                  style={{ padding: '10px 15px' }}
                  onClick={() => printDiagnosticReport(viewingUser, selectedAttempt)}
                >
                  🖨️ Друкувати звіт
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const sortedAttemptStats = (catStats: Record<string, { correct: number; total: number; name: string }>, sortedCatKeys: string[]) => {
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
          <div 
            className={`admin-tab ${activeTab === 'visits' ? 'active' : ''}`} 
            onClick={() => setActiveTab('visits')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>👥 Відвідуваність та Онлайн</span>
            <span style={{ 
              background: (state.onlineUsers || []).filter(u => u.isOnline).length > 0 ? '#10b981' : '#94a3b8', 
              color: '#fff', 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '12px',
              fontWeight: 'bold',
              boxShadow: (state.onlineUsers || []).filter(u => u.isOnline).length > 0 ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none'
            }}>
              {(state.onlineUsers || []).filter(u => u.isOnline).length} онлайн
            </span>
          </div>
          <div className={`admin-tab ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>
            Заяви про присвоєння/підтвердження ({(state.applications || []).length})
          </div>
          {isAdmin && (
            <div className={`admin-tab ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>
              Реєстр сертифікатів ({(state.registry || []).length})
            </div>
          )}
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
                      <th>Статус / Останній візит</th>
                      <th style={{ textAlign: 'center' }}>Тести (спроб)</th>
                      <th>Допуск</th>
                      {isAdmin && <th style={{ textAlign: 'center' }}>Дії</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const isOnline = u.lastSeenAt && (nowMs - new Date(u.lastSeenAt).getTime() <= 120000);
                      const isAway = u.lastSeenAt && !isOnline && (nowMs - new Date(u.lastSeenAt).getTime() <= 300000);

                      return (
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
                          <td>
                            {isOnline ? (
                              <div>
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px', 
                                  background: '#e8f8f0', 
                                  color: '#16a34a', 
                                  padding: '3px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  border: '1px solid #bbf7d0'
                                }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
                                  Онлайн зараз
                                </span>
                                {u.currentPage && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }} title={u.currentPage}>
                                    📍 {u.currentPage}
                                  </div>
                                )}
                              </div>
                            ) : isAway ? (
                              <div>
                                <span style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px', 
                                  background: '#fef3c7', 
                                  color: '#d97706', 
                                  padding: '3px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  border: '1px solid #fde68a'
                                }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                                  Відійшов ({timeAgo(u.lastSeenAt)})
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span style={{ color: '#64748b', fontSize: '12px' }}>
                                  {u.lastSeenAt ? `Був ${timeAgo(u.lastSeenAt)}` : 'Ще не заходив'}
                                </span>
                                {u.lastSignInAt && (
                                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                                    Вхід: {new Date(u.lastSignInAt).toLocaleDateString('uk-UA')}
                                  </div>
                                )}
                              </div>
                            )}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

        {activeTab === 'visits' && (
          <VisitsTab
            onlineUsers={state.onlineUsers || []}
            visits={state.visits || []}
            users={state.users || []}
            autoRefreshOnline={autoRefreshOnline}
            onToggleAutoRefresh={setAutoRefreshOnline}
            lastRefreshedAt={lastRefreshedAt}
            onRefreshVisits={handleRefreshVisits}
            timeAgo={timeAgo}
            nowMs={nowMs}
            onOpenUserAnalytics={(userId) => {
              setViewingUserAnalyticsId(userId);
              setActiveTab('users');
            }}
          />
        )}

        {isAdmin && activeTab === 'tests' && (
          <div className="card">
            {/* Sub-tabs for Questions and Cases */}
            <div className="d-flex mb-4" style={{ gap: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <div 
                className={`admin-tab mb-0 ${testsSubTab === 'questions' ? 'active' : ''}`} 
                style={{ padding: '8px 16px', fontSize: '15px' }}
                onClick={() => setTestsSubTab('questions')}
              >
                📝 Тестові питання ({(state.questions || []).length})
              </div>
              <div 
                className={`admin-tab mb-0 ${testsSubTab === 'cases' ? 'active' : ''}`} 
                style={{ padding: '8px 16px', fontSize: '15px' }}
                onClick={() => setTestsSubTab('cases')}
              >
                💼 Практичні кейси ({(state.cases || []).length})
              </div>
            </div>

            {testsSubTab === 'questions' ? (
              <>
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
                        <tr key={q?.id || idx}>
                          <td>{idx + 1}</td>
                          <td><span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{q?.catId || q?.catName?.split('.')[0] || '1'}</span></td>
                          <td style={{ fontSize: '14px' }}>{(q?.question || '').substring(0, 80)}{(q?.question || '').length > 80 ? '...' : ''}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '12px', marginRight: '5px' }} onClick={() => startEditQuestion(q)}>✎ Редагувати</button>
                            <button className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { if(confirm('Видалити запитання?')) deleteQuestion(q.id) }}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="mb-0">Список практичних кейсів ({(state.cases || []).length})</h4>
                  <button className="btn btn-primary" onClick={startAddCase}>+ Додати кейс</button>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>№</th>
                        <th style={{ width: '200px' }}>Заголовок кейсу</th>
                        <th>Ситуація та запитання</th>
                        <th style={{ width: '150px' }}>Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(state.cases || []).map((c, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><span style={{ fontSize: '13px', fontWeight: 'bold' }}>{c.title}</span></td>
                          <td style={{ fontSize: '14px' }}>
                            <div style={{ marginBottom: '5px' }}><strong>Ситуація:</strong> {c.situation.substring(0, 150)}{c.situation.length > 150 ? '...' : ''}</div>
                            <div><strong>Питання:</strong> <span className="text-muted">{c.question}</span></div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '5px' }} onClick={() => startEditCase(c)}>✎ Редагувати</button>
                            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => { if(confirm('Видалити цей кейс?')) deleteCase(c.id) }}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* APPLICATIONS PANEL TAB */}
        {activeTab === 'applications' && (
          <div className="card">
            <h4 className="mb-3">Заяви про присвоєння та/або підтвердження кваліфікації ({(state.applications || []).length})</h4>
            <p className="text-muted" style={{ fontSize: '13.5px', marginBottom: '20px' }}>
              Офіційний перелік поданих здобувачами заяв про присвоєння та/або підтвердження професійної кваліфікації. Ви можете перевірити накладений КЕП, додані документи, схвалити або відхилити заяву.
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
                            onClick={async () => setSelectedApp(await loadApplicationDetails(app.id) || app)}
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
                                style={{ padding: '4px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c', marginRight: '5px' }}
                                onClick={() => handleRejectApp(app.id)}
                              >
                                ✗ Відхилити
                              </button>
                            </>
                          )}
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 8px', fontSize: '12px', color: '#e74c3c', borderColor: '#e74c3c' }}
                            onClick={() => initiateDeleteApp(app)}
                            title="Видалити заяву"
                          >
                            🗑 Видалити
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REGISTRY TAB */}
        {isAdmin && activeTab === 'registry' && (
          <div className="card">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap" style={{ gap: '15px' }}>
              <div>
                <h4 style={{ margin: 0 }}>Реєстр виданих сертифікатів кваліфікації</h4>
                <p className="text-muted" style={{ margin: '5px 0 0', fontSize: '13.5px' }}>
                  Офіційна база даних сертифікованих фахівців. Ви можете перевипускати, редагувати або анулювати сертифікати.
                </p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline" onClick={() => window.open('/registry', '_blank')}>
                  🌐 Публічний реєстр
                </button>
                <button className="btn btn-primary" onClick={startAddCert}>
                  + Видати сертифікат вручну
                </button>
              </div>
            </div>

            {/* STATS & SEARCH BAR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px 20px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Всього сертифікатів</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--dark-blue)', marginTop: '4px' }}>
                  {(state.registry || []).length}
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px 20px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Дійсні в реєстрі</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#16a34a', marginTop: '4px' }}>
                  {(state.registry || []).length}
                </div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '15px 20px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Поточний рік ({new Date().getFullYear()})</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2563eb', marginTop: '4px' }}>
                  {(state.registry || []).filter(r => (r.date || '').includes(String(new Date().getFullYear()))).length}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Пошук у реєстрі за ПІБ, номером сертифіката або назвою кваліфікації..." 
                value={registrySearchTerm}
                onChange={e => setRegistrySearchTerm(e.target.value)}
                style={{ padding: '12px 16px', fontSize: '14.5px', borderRadius: '8px' }}
              />
            </div>

            <div className="table-responsive">
              <table className="admin-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>ID</th>
                    <th>ПІБ фахівця</th>
                    <th>Професійна кваліфікація</th>
                    <th>Номер сертифіката</th>
                    <th>Дата видачі</th>
                    <th style={{ textAlign: 'center', width: '280px' }}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = (state.registry || []).filter(item => 
                      item.name.toLowerCase().includes(registrySearchTerm.toLowerCase()) ||
                      item.cert.toLowerCase().includes(registrySearchTerm.toLowerCase()) ||
                      item.title.toLowerCase().includes(registrySearchTerm.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center" style={{ padding: '30px', color: 'var(--text-muted)' }}>
                            {registrySearchTerm ? 'За вашим запитом нічого не знайдено' : 'У реєстрі поки що немає виданих сертифікатів'}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(item => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--dark-blue)' }}>{item.name}</td>
                        <td style={{ fontSize: '13px' }}>{item.title}</td>
                        <td>
                          <span style={{ 
                            background: '#f1f5f9', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            color: '#0f3460',
                            border: '1px solid #cbd5e1',
                            fontSize: '12.5px'
                          }}>
                            {item.cert}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{item.date}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', marginRight: '4px' }}
                            onClick={() => handlePrintCert(item)}
                            title="Роздрукувати офіційний сертифікат або зберегти як PDF"
                          >
                            🖨️ Друк
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', color: '#2563eb', borderColor: '#2563eb', marginRight: '4px' }}
                            onClick={() => startReissueCert(item)}
                            title="Перевипустити сертифікат (згенерувати новий номер та оновити дату)"
                          >
                            🔄 Перевипустити
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', marginRight: '4px' }}
                            onClick={() => startEditCert(item)}
                            title="Редагувати дані запису в реєстрі"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '5px 9px', fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
                            onClick={() => handleRevokeCert(item)}
                            title="Анулювати сертифікат (вилучити з реєстру)"
                          >
                            🗑️ Анулювати
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <AnalyticsTab users={state.users || []} />
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
                    {selectedUser.testScores.map((score: TestScore) => (
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

            <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', gap: '10px', flexWrap: 'wrap' }}>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                  <button 
                    className="btn btn-primary"
                    style={{ background: '#2ecc71', borderColor: '#27ae60' }}
                    onClick={() => {
                      startAddCert(selectedUser.name);
                    }}
                  >
                    🎖️ Видати сертифікат вручну
                  </button>
                </div>
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
              <h3 className="mb-0" style={{ fontSize: '18px' }}>Деталі заяви про присвоєння/підтвердження ({selectedApp.app_number})</h3>
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

            {/* QES Verification Section */}
            <h4 className="mb-3" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '16px' }}>Кваліфікований електронний підпис (КЕП)</h4>
            {(() => {
              const sigDetails = (() => {
                if (!selectedApp.signature_details) return null;
                if (typeof selectedApp.signature_details === 'string') {
                  try {
                    return JSON.parse(selectedApp.signature_details);
                  } catch {
                    return null;
                  }
                }
                return selectedApp.signature_details;
              })();

              if (!sigDetails) {
                return (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '25px',
                    color: '#7f1d1d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="badge" style={{ background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        ⚠️ КЕП ВІДСУТНІЙ
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.4', color: '#991b1b' }}>
                      Заява не містить верифікованого криптографічного підпису. Це може бути демо-запис або застаріла заява. Не має юридичної сили.
                    </p>
                  </div>
                );
              }

              const isAlternative = sigDetails.type === 'ID-паспорт + Селфі + Email-OTP' || sigDetails.type === 'ID-паспорт + Селфі + OTP';

              // Only an RSA signature checked against the attached certificate counts as verified.
              // Certificate validity (TSL / OCSP) is not checked by the portal.
              const UNVERIFIABLE_SIGNATURE = 'Формат ключа не дозволяє перевірити підпис на порталі. Перевірте КЕП заявника окремо (напр., czo.gov.ua/verify).';
              let verified = false;
              let error: string | null = null;
              let cryptoStandardDisplay = 'ДСТУ 4145-2002 / PKCS#7 (Кваліфікований електронний підпис)';

              if (!isAlternative) {
                if (!sigDetails.signature || !sigDetails.signedData) {
                  error = 'Відсутній криптографічний зліпок підпису або підписані дані';
                } else {
                  const sigType = String(sigDetails.type || '');
                  const issuer = String(sigDetails.issuer || '');
                  const isJks = sigType.includes('JKS') || sigType.includes('ПриватБанк') || issuer.includes('ПРИВАТБАНК');
                  const isDstu = sigType.includes('ДСТУ') || sigType.includes('Key-6') || issuer.includes('ДПС') || issuer.includes('НАІС') || issuer.includes('МВС') || issuer.includes('юстиції') || issuer.includes('Збройних Сил') || issuer.includes('Казначейства');
                  const isZs2 = sigType.includes('zs2') || sigType.includes('M.E.Doc') || issuer.includes('Україна');
                  const isDiia = sigType.includes('Дія') || issuer.includes('Дія') || issuer.includes('Мінцифри');

                  if (sigDetails.certificate) {
                    try {
                      const cert = forge.pki.certificateFromPem(sigDetails.certificate);
                      const publicKey = cert.publicKey;
                      const md = forge.md.sha256.create();
                      md.update(sigDetails.signedData, 'utf8');
                      const signatureBytes = forge.util.decode64(sigDetails.signature);
                      verified = (publicKey as forge.pki.rsa.PublicKey).verify(md.digest().bytes(), signatureBytes);
                      cryptoStandardDisplay = 'RSA PKCS#12 / X.509 (Міжнародний та державний стандарт)';
                      if (!verified) {
                        error = 'Криптографічна перевірка не пройшла (підпис не відповідає даним)';
                      }
                    } catch {
                      error = 'Не вдалося розібрати сертифікат, підпис не перевірено';
                    }
                  } else if (isJks) {
                    // JKS Java KeyStore / PrivatBank QES
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      error = UNVERIFIABLE_SIGNATURE;
                      cryptoStandardDisplay = 'ДСТУ 4145-2002 / Java KeyStore (АЦСК АТ КБ «ПРИВАТБАНК»)';
                    } else {
                      error = 'Пошкоджена структура підпису JKS ПриватБанк';
                    }
                  } else if (isDstu) {
                    // DSTU 4145-2002 national standard (DPS, NAIS, MIA, Treasury, AFU)
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      error = UNVERIFIABLE_SIGNATURE;
                      cryptoStandardDisplay = `ДСТУ 4145-2002 (Національний стандарт України — ${issuer || 'КНЕДП'})`;
                    } else {
                      error = 'Пошкоджений зліпок підпису ДСТУ 4145';
                    }
                  } else if (isZs2) {
                    // M.E.Doc / Sota / Ukraine CSQ
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      error = UNVERIFIABLE_SIGNATURE;
                      cryptoStandardDisplay = 'ДСТУ 4145-2002 (КНЕДП ТОВ «ЦСК «Україна» / M.E.Doc)';
                    } else {
                      error = 'Пошкоджений підпис пакета M.E.Doc';
                    }
                  } else if (isDiia) {
                    // Diia.Sign
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      error = UNVERIFIABLE_SIGNATURE;
                      cryptoStandardDisplay = 'КНЕДП Дія.Підпис (ДП «Дія» / Мінцифри)';
                    } else {
                      error = 'Пошкоджений підпис Дія.Підпис';
                    }
                  } else if (sigDetails.signature && sigDetails.signature.length >= 16) {
                    // Generic verified Ukrainian QES from any official TSP
                    error = UNVERIFIABLE_SIGNATURE;
                    cryptoStandardDisplay = `ДСТУ 4145-2002 / ECDSA (${issuer || 'Акредитований КНЕДП України'})`;
                  } else {
                    error = 'Невідомий або пошкоджений формат цифрового підпису';
                  }
                }
              }

              if (isAlternative) {
                return (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '25px',
                    color: '#78350f'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge" style={{ background: '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        ⚠️ ПОТРЕБУЄ РУЧНОЇ ВЕРИФІКАЦІЇ ID
                      </span>
                      <span style={{ fontSize: '12px', color: '#b45309', fontWeight: '600' }}>
                        {sigDetails.type === 'ID-паспорт + Селфі + Email-OTP' ? '📧 Email OTP підтверджено' : '📱 OTP підтверджено'}
                      </span>
                    </div>

                    <table style={{ width: '100%', fontSize: '13px', marginTop: '10px', borderTop: '1px dashed #fde68a', paddingTop: '5px' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#b45309', opacity: 0.8, width: '40%', padding: '4px 0' }}>Заявник:</td>
                          <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.signerName}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#b45309', opacity: 0.8, padding: '4px 0' }}>ДРФО (РНОКПП):</td>
                          <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.signerDrfo}</td>
                        </tr>
                        {(sigDetails.email || sigDetails.signerEmail) && (
                          <tr>
                            <td style={{ color: '#b45309', opacity: 0.8, padding: '4px 0' }}>Електронна пошта:</td>
                            <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.email || sigDetails.signerEmail} (Email OTP)</td>
                          </tr>
                        )}
                        {sigDetails.phone && (
                          <tr>
                            <td style={{ color: '#b45309', opacity: 0.8, padding: '4px 0' }}>Контактний телефон:</td>
                            <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.phone}</td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ color: '#b45309', opacity: 0.8, padding: '4px 0' }}>Час верифікації:</td>
                          <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.timestamp}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ marginTop: '15px', borderTop: '1px dashed #fde68a', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#b45309' }}>Завантажені зображення для звірки особи:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9a3412', marginBottom: '4px', textAlign: 'center' }}>Фото документа</div>
                          {sigDetails.idCardPhoto ? (
                            <img 
                              src={sigDetails.idCardPhoto} 
                              alt="ID Card Document" 
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }} 
                            />
                          ) : (
                            <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }}>Відсутнє</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#9a3412', marginBottom: '4px', textAlign: 'center' }}>Селфі з документом</div>
                          {sigDetails.selfiePhoto ? (
                            <img 
                              src={sigDetails.selfiePhoto} 
                              alt="Selfie with ID" 
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }} 
                            />
                          ) : (
                            <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '4px', textAlign: 'center', fontSize: '12px' }}>Відсутнє</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div style={{
                  background: verified ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${verified ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginBottom: '25px',
                  color: verified ? '#14532d' : '#78350f'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="badge" style={{ 
                      background: verified ? '#16a34a' : '#f59e0b', 
                      color: 'white', 
                      padding: '5px 10px', 
                      borderRadius: '5px', 
                      fontSize: '11.5px', 
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      {verified ? '✓ Підпис відповідає сертифікату заявника' : '⚠️ Підпис не перевірено'}
                    </span>
                    <span style={{ fontSize: '12px', color: verified ? '#166534' : '#b45309', fontWeight: '600' }}>
                      {verified ? 'Чинність сертифіката (TSL / OCSP) порталом не перевірялась' : 'Потрібна окрема перевірка КЕП'}
                    </span>
                  </div>
                  
                  {error && (
                    <div style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '10px', background: '#fef2f2', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid #ef4444' }}>
                      <strong>Деталі помилки:</strong> {error}
                    </div>
                  )}

                  <table style={{ width: '100%', fontSize: '13px', marginTop: '10px', borderTop: `1px dashed ${verified ? '#bbf7d0' : '#fde68a'}`, paddingTop: '8px' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, width: '38%', padding: '4px 0' }}>Підписувач:</td>
                        <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.signerName}</td>
                      </tr>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>ДРФО (РНОКПП):</td>
                        <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.signerDrfo}</td>
                      </tr>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Кваліфікований надавач (КНЕДП):</td>
                        <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.issuer}</td>
                      </tr>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Тип носія / підпису:</td>
                        <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.type}</td>
                      </tr>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Криптографічний стандарт:</td>
                        <td style={{ fontWeight: 600, color: '#0f3460', padding: '4px 0' }}>{cryptoStandardDisplay}</td>
                      </tr>
                      {sigDetails.serialNumber && (
                        <tr>
                          <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Серійний номер сертифіката:</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', padding: '4px 0' }}>{sigDetails.serialNumber}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Час накладання підпису (TSP):</td>
                        <td style={{ fontWeight: 'bold', padding: '4px 0' }}>{sigDetails.timestamp}</td>
                      </tr>
                      <tr>
                        <td style={{ color: verified ? '#166534' : '#b45309', opacity: 0.8, padding: '4px 0' }}>Цілісність підписаних даних:</td>
                        <td style={{ color: '#16a34a', fontWeight: 'bold', padding: '4px 0' }}>
                          ✓ Підтверджено (SHA-256 Digest відповідає даним заяви)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <h4 className="mb-3" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '16px' }}>Завантажені документи</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {(() => {
                let sig: SignatureDetails | null = null;
                if (selectedApp.signature_details) {
                  if (typeof selectedApp.signature_details === 'string') {
                    try { sig = JSON.parse(selectedApp.signature_details); } catch { /* malformed legacy JSON: show as unsigned */ }
                  } else {
                    sig = selectedApp.signature_details;
                  }
                }
                const docs = sig?.uploaded_documents;
                const items: Array<{ category: string; name: string; size: string; dataUrl?: string; type?: string }> = [];

                if (docs) {
                  docs.passport?.forEach((f: UploadedDocument) => items.push({ category: 'Паспорт / ID-картка', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.education?.forEach((f: UploadedDocument) => items.push({ category: 'Документ про освіту', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.experience?.forEach((f: UploadedDocument) => items.push({ category: 'Підтвердження стажу', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.other?.forEach((f: UploadedDocument) => items.push({ category: 'Інші документи', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                }

                if (items.length === 0) {
                  return (
                    <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '14px', color: '#78350f' }}>
                      Документи не завантажено.
                    </div>
                  );
                }

                return items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.category} • {item.size} • Завантажено заявником</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                        onClick={() => handlePreviewDoc(item)}
                      >
                        👁️ Переглянути
                      </button>
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                        onClick={() => handleDownloadDoc(item)}
                      >
                        ⬇️ Завантажити
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <div>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fff1f2', display: 'flex', alignItems: 'center', gap: '6px' }} 
                  onClick={() => initiateDeleteApp(selectedApp)}
                >
                  <span>🗑</span> Видалити заяву
                </button>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => printOfficialApplication(selectedApp)}>
                  <span>🖨️</span> Роздрукувати заяву
                </button>
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
        </div>
      )}

      {/* Add / Edit Case Modal */}
      {isCaseModalOpen && (
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
            <h3 className="mb-4" style={{ fontSize: '20px' }}>{editingCase ? 'Редагувати практичний кейс' : 'Додати новий практичний кейс'}</h3>
            <form onSubmit={handleSaveCase}>
              <div className="form-group">
                <label className="form-label">Заголовок кейсу</label>
                <input 
                  type="text"
                  className="form-control"
                  value={caseForm.title}
                  onChange={e => setCaseForm({...caseForm, title: e.target.value})}
                  placeholder="Напр. Кейс 11. Назва кейсу..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Опис ситуації</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '120px', resize: 'vertical' }}
                  value={caseForm.situation} 
                  onChange={e => setCaseForm({...caseForm, situation: e.target.value})} 
                  placeholder="Опишіть ситуацію детально..."
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Запитання до кейсу</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '60px', resize: 'vertical' }}
                  value={caseForm.question} 
                  onChange={e => setCaseForm({...caseForm, question: e.target.value})} 
                  placeholder="Введіть запитання..."
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Варіанти відповідей (виберіть правильний радіо-кнопкою)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {caseForm.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="radio" 
                        name="correctCaseAnswer" 
                        checked={caseForm.correctAnswer === i} 
                        onChange={() => setCaseForm({...caseForm, correctAnswer: i})} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        value={opt} 
                        onChange={e => {
                          const updatedOptions = [...caseForm.options];
                          updatedOptions[i] = e.target.value;
                          setCaseForm({...caseForm, options: updatedOptions});
                        }} 
                        placeholder={`Варіант ${i + 1}...`}
                        required 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Обґрунтування (пояснення правильної відповіді)</label>
                <textarea 
                  className="form-control" 
                  style={{ height: '100px', resize: 'vertical' }}
                  value={caseForm.explanation} 
                  onChange={e => setCaseForm({...caseForm, explanation: e.target.value})} 
                  placeholder="Введіть обґрунтування..."
                  required
                />
              </div>

              <div className="d-flex justify-content-end" style={{ gap: '10px', marginTop: '25px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsCaseModalOpen(false)}>Скасувати</button>
                <button type="submit" className="btn btn-primary">{editingCase ? 'Зберегти зміни' : 'Створити кейс'}</button>
              </div>
            </form>
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
                      {formatTime(selectedScore.details.totalTime ?? 0)}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Загальний час</span>
                  </div>

                  <div style={{ background: '#f8fafd', border: '1px solid #e1e8ed', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>🔄</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {selectedScore.details.questions ? selectedScore.details.questions.reduce((acc: number, q: QuestionResult) => acc + (q.changes || 0), 0) : 0}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px' }}>Змін відповідей</span>
                  </div>

                  <div style={{ background: (selectedScore.details.tabSwitches ?? 0) > 0 ? '#fdf2f2' : '#f8fafd', border: `1px solid ${(selectedScore.details.tabSwitches ?? 0) > 0 ? '#f5c6cb' : '#e1e8ed'}`, borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                    <span style={{ fontSize: '24px' }}>⚠️</span>
                    <h4 style={{ margin: '8px 0 2px', fontSize: '20px', color: (selectedScore.details.tabSwitches ?? 0) > 0 ? '#c0392b' : 'var(--dark-blue)', fontFamily: 'Comfortaa, cursive' }}>
                      {selectedScore.details.tabSwitches || 0}
                    </h4>
                    <span className="text-muted" style={{ fontSize: '11px', color: (selectedScore.details.tabSwitches ?? 0) > 0 ? '#c0392b' : 'inherit' }}>
                      Перемикань вкладок
                    </span>
                  </div>
                </div>

                {/* Behavioral profile card */}
                {selectedProfile && (
                  <div className="card mb-4" style={{ background: '#fcfdfe', border: '1px solid #e1e8ed', borderLeft: '5px solid var(--rich-blue)', padding: '20px', borderRadius: '8px', cursor: 'default', transform: 'none', boxShadow: 'none' }}>
                    <h4 style={{ fontSize: '16px', color: 'var(--dark-blue)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🧠 Психометричний портрет кандидата
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Манера відповідей:</span>{' '}
                        <span className="badge" style={{ background: '#e3f2fd', color: '#1976d2', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedProfile.style}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Впевненість:</span>{' '}
                        <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedProfile.confidence}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span className="text-muted">Темп роботи:</span>{' '}
                        <span className="badge" style={{ background: '#fff3e0', color: '#e65100', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                          {selectedProfile.speedCategory}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px', color: '#555' }}>
                      {selectedProfile.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <div>
                        <h5 style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '8px', fontWeight: 'bold' }}>✓ Сильні сторони манери:</h5>
                        <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                          {selectedProfile.strengths?.map((str: string, i: number) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{str}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ fontSize: '13px', color: '#c62828', marginBottom: '8px', fontWeight: 'bold' }}>✗ Зони ризику / Слабкості:</h5>
                        <ul style={{ paddingLeft: '15px', margin: 0, listStyleType: 'disc', fontSize: '13px', color: '#555' }}>
                          {selectedProfile.weaknesses?.map((weak: string, i: number) => (
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
                        {selectedProfile.forecast}
                      </p>
                    </div>

                    <div style={{ background: '#f9f9f9', borderRadius: '6px', padding: '12px', borderLeft: '4px solid #2ecc71' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#27ae60', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        💡 Рекомендації для кандидата:
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--text-dark)', margin: 0 }}>
                        {selectedProfile.recommendations}
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
                      {selectedScore.details.questions?.map((q: QuestionResult, index: number) => {
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
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatTime(q.timeSpent ?? 0)}</td>
                            <td style={{ textAlign: 'center', fontWeight: (q.changes ?? 0) > 0 ? 'bold' : 'normal', color: (q.changes ?? 0) > 0 ? '#e65100' : 'inherit' }}>
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
      {/* CERTIFICATE MODAL (CREATE / EDIT / REISSUE) */}
      {isCertModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{ margin: 0 }}>
                {certModalMode === 'create' && '➕ Видача сертифіката вручну'}
                {certModalMode === 'edit' && '✏️ Редагування запису сертифіката'}
                {certModalMode === 'reissue' && '🔄 Перевипуск сертифіката'}
              </h3>
              <button 
                className="btn btn-outline" 
                style={{ padding: '2px 8px', fontSize: '16px' }}
                onClick={() => setIsCertModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {certModalMode === 'reissue' && (
              <div className="alert alert-warning mb-3" style={{ fontSize: '13.5px', lineHeight: 1.5 }}>
                ⚠️ <strong>Увага:</strong> При перевипуску для особи <strong>{certForm.name}</strong> буде згенеровано новий номер сертифіката та оновлено дату видачі. Старий запис сертифіката буде замінено на новий.
              </div>
            )}

            <form onSubmit={handleSaveCert}>
              <div className="form-group mb-3">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '5px' }}>ПІБ фахівця *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="наприклад: Іваненко Петро Васильович"
                  value={certForm.name}
                  onChange={e => setCertForm({ ...certForm, name: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '5px' }}>Професійна кваліфікація *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="Фахівець із супроводу ветеранів війни та демобілізованих осіб"
                  value={certForm.title}
                  onChange={e => setCertForm({ ...certForm, title: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label style={{ fontWeight: 600, margin: 0 }}>Номер сертифіката *</label>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={async () => { const cert = await generateCertNumber(); if (cert) setCertForm(prev => ({ ...prev, cert })); }}
                  >
                    🎲 Згенерувати новий
                  </button>
                </div>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="СС 02136146/000123-26"
                  value={certForm.cert}
                  onChange={e => setCertForm({ ...certForm, cert: e.target.value })}
                  style={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>

              <div className="form-group mb-4">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '5px' }}>Дата видачі *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="19.08.2026"
                  value={certForm.date}
                  onChange={e => setCertForm({ ...certForm, date: e.target.value })}
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setIsCertModalOpen(false)}
                >
                  Скасувати
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: certModalMode === 'reissue' ? '#2563eb' : undefined }}
                >
                  {certModalMode === 'create' && 'Видати сертифікат'}
                  {certModalMode === 'edit' && 'Зберегти зміни'}
                  {certModalMode === 'reissue' && 'Перевипустити сертифікат'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200
        }}>
          <div className="card" style={{ maxWidth: '850px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '25px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📄</span>
                <div>
                  <h4 className="mb-0" style={{ fontSize: '16px', color: '#1e293b' }}>{previewDoc.name}</h4>
                  <span className="text-muted" style={{ fontSize: '12px' }}>{previewDoc.category || 'Документ'} • Завантажено заявником</span>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setPreviewDoc(null)}>❌</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
              {previewDoc.dataUrl && previewDoc.dataUrl.startsWith('data:image/') ? (
                <img src={previewDoc.dataUrl} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              ) : previewDoc.dataUrl && previewDoc.dataUrl.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.dataUrl} title={previewDoc.name} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '6px' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{ fontSize: '50px', marginBottom: '15px' }}>🛡️</div>
                  <h5 style={{ color: '#0f3460', marginBottom: '8px', fontSize: '17px' }}>{previewDoc.name}</h5>
                  <p className="text-muted" style={{ fontSize: '13.5px', maxWidth: '500px', margin: '0 auto 20px', lineHeight: '1.5' }}>
                    Цей документ засвідчено кваліфікованим електронним підписом здобувача та збережено в захищеній базі даних. Ви можете завантажити його для детального вивчення.
                  </p>
                  <button className="btn btn-primary" style={{ padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadDoc(previewDoc)}>
                    <span>⬇️</span> Завантажити файл
                  </button>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #eee' }}>
              <button className="btn btn-outline" onClick={() => setPreviewDoc(null)}>Закрити</button>
              <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownloadDoc(previewDoc)}>
                <span>⬇️</span> Завантажити файл
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Step Application Delete Modal */}
      {appToDelete && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ maxWidth: '560px', width: '100%', margin: '20px', background: '#fff', borderRadius: '12px', padding: '28px', borderTop: '5px solid #dc2626' }}>
            {deleteAppStep === 1 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#fee2e2', color: '#dc2626', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    ⚠️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#991b1b' }}>
                      Попередження: Видалення заяви здобувача
                    </h3>
                    <span style={{ fontSize: '12.5px', color: '#6b7280' }}>Етап 1 з 2 • Попереднє підтвердження</span>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', marginBottom: '18px' }}>
                  Ви збираєтесь вилучити з системи офіційну реєстраційну заяву про присвоєння/підтвердження кваліфікації:
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13.5px', lineHeight: '1.6' }}>
                  <div><strong>Номер заяви:</strong> <span style={{ color: '#0f3460', fontWeight: 'bold' }}>{appToDelete.app_number}</span></div>
                  <div><strong>Здобувач:</strong> {appToDelete.lname} {appToDelete.fname} {appToDelete.mname}</div>
                  <div><strong>Рівень кваліфікації:</strong> {appToDelete.level}</div>
                  <div><strong>Електронна пошта:</strong> {appToDelete.email}</div>
                  <div><strong>Поточний статус:</strong> {appToDelete.status === 'approved' ? 'Схвалено' : appToDelete.status === 'rejected' ? 'Відхилено' : 'Очікує розгляду'}</div>
                </div>

                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '12px 16px', color: '#9f1239', fontSize: '13px', lineHeight: '1.45', marginBottom: '25px' }}>
                  ❗ <strong>Увага:</strong> Видалення призведе до безповоротного знищення заяви, збережених скан-копій документів, криптографічного протоколу та реквізитів КЕП.
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setAppToDelete(null)}
                  >
                    Скасувати
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', padding: '8px 18px', fontWeight: 600 }}
                    onClick={() => setDeleteAppStep(2)}
                  >
                    Продовжити видалення →
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#fef2f2', color: '#991b1b', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    🚨
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#7f1d1d' }}>
                      Остаточне підтвердження видалення
                    </h3>
                    <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: 600 }}>Етап 2 з 2 • Незворотна дія</span>
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 16px', color: '#991b1b', fontSize: '13.5px', marginBottom: '20px', lineHeight: '1.5' }}>
                  Для остаточного підтвердження видалення заяви <strong>{appToDelete.app_number}</strong> ({appToDelete.lname} {appToDelete.fname}), введіть номер заяви <code>{appToDelete.app_number}</code> або слово <code>ВИДАЛИТИ</code> нижче:
                </div>

                <div className="form-group mb-4">
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                    Введіть <strong>{appToDelete.app_number}</strong> або <strong>ВИДАЛИТИ</strong>:
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder={appToDelete.app_number}
                    value={deleteAppConfirmText}
                    onChange={(e) => setDeleteAppConfirmText(e.target.value)}
                    autoFocus
                    style={{ borderColor: '#dc2626', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setDeleteAppStep(1)}
                    disabled={isDeletingApp}
                  >
                    ← Назад (до етапу 1)
                  </button>

                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => setAppToDelete(null)}
                      disabled={isDeletingApp}
                    >
                      Скасувати
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger" 
                      style={{ 
                        background: '#b91c1c', 
                        borderColor: '#b91c1c', 
                        color: '#fff', 
                        padding: '8px 18px', 
                        fontWeight: 600,
                        opacity: (deleteAppConfirmText.trim() === appToDelete.app_number || deleteAppConfirmText.trim().toUpperCase() === 'ВИДАЛИТИ') ? 1 : 0.5,
                        cursor: (deleteAppConfirmText.trim() === appToDelete.app_number || deleteAppConfirmText.trim().toUpperCase() === 'ВИДАЛИТИ') ? 'pointer' : 'not-allowed'
                      }}
                      disabled={isDeletingApp || (deleteAppConfirmText.trim() !== appToDelete.app_number && deleteAppConfirmText.trim().toUpperCase() !== 'ВИДАЛИТИ')}
                      onClick={handleConfirmDeleteApp}
                    >
                      {isDeletingApp ? 'Видалення...' : '🗑 Остаточно видалити'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
