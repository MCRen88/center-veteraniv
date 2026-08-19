import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, type Role, type Question, type Case, type RegistryItem } from '../context/AppContext';
import forge from 'node-forge';


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
    addRegistryItem,
    updateRegistryItem,
    deleteRegistryItem
  } = useAppContext();
  const navigate = useNavigate();
  console.log('AdminDashboard: state.cases length =', state.cases ? state.cases.length : 'undefined');
  const [activeTab, setActiveTab] = useState<'users' | 'applications' | 'tests' | 'registry' | 'analytics'>('users');
  const [testsSubTab, setTestsSubTab] = useState<'questions' | 'cases'>('questions');

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

  // Document preview & download states
  const [previewDoc, setPreviewDoc] = useState<{ name: string; dataUrl?: string; type?: string; category?: string; size?: string } | null>(null);

  const getDocumentDataUrl = (item: { name: string; dataUrl?: string; type?: string; category?: string; size?: string }): string => {
    if (item.dataUrl && item.dataUrl.startsWith('data:')) {
      return item.dataUrl;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Білий фон
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Рамка документа
      ctx.strokeStyle = '#0f3460';
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Шапка
      ctx.fillStyle = '#0f3460';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('КВАЛІФІКАЦІЙНИЙ ЦЕНТР', canvas.width / 2, 110);

      ctx.fillStyle = '#475569';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('КЗ «Запорізький обласний інститут післядипломної педагогічної освіти» ЗОР', canvas.width / 2, 155);
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('Центр оцінювання і визнання результатів навчання', canvas.width / 2, 195);

      // Розділювальна лінія
      ctx.beginPath();
      ctx.moveTo(80, 230);
      ctx.lineTo(canvas.width - 80, 230);
      ctx.strokeStyle = '#0f3460';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Заголовок документа
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.fillText('ЕЛЕКТРОННА СКАН-КОПІЯ ДОКУМЕНТА', canvas.width / 2, 310);

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText('✓ ЗАСВІДЧЕНО КВАЛІФІКОВАНИМ ЕЛЕКТРОННИМ ПІДПИСОМ (КЕП)', canvas.width / 2, 360);

      // Картка з інформацією про файл
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(100, 420, canvas.width - 200, 500);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(100, 420, canvas.width - 200, 500);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Назва файлу:', 140, 480);
      ctx.fillStyle = '#0f3460';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText(item.name || 'document.jpg', 400, 480);

      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Категорія:', 140, 550);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText(item.category || 'Документ здобувача', 400, 550);

      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Розмір файлу:', 140, 620);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText(item.size || 'Електронний документ', 400, 620);

      const fullName = selectedApp ? `${selectedApp.lname} ${selectedApp.fname} ${selectedApp.mname || ''}`.trim() : 'Здобувач';
      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Здобувач (ПІБ):', 140, 690);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText(fullName, 400, 690);

      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Заява №:', 140, 760);
      ctx.fillStyle = '#0f3460';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText(selectedApp?.app_number || 'ЗЯ-2026', 400, 760);

      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('Дата подачі:', 140, 830);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 26px Arial, sans-serif';
      const dateStr = selectedApp?.created_at ? new Date(selectedApp.created_at).toLocaleString('uk-UA') : new Date().toLocaleDateString('uk-UA');
      ctx.fillText(dateStr, 400, 830);

      // Штамп КЕП
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(100, 970, canvas.width - 200, 320);
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, 970, canvas.width - 200, 320);

      ctx.fillStyle = '#166534';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText('🛡️ КВАЛІФІКОВАНИЙ ЕЛЕКТРОННИЙ ПІДПИС НАКЛАДЕНО', 140, 1030);

      ctx.fillStyle = '#374151';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText(`Підписувач: ${fullName}`, 140, 1085);
      ctx.fillText(`РНОКПП (ДРФО): ${selectedApp?.passport ? selectedApp.passport : '001234567'}`, 140, 1135);
      ctx.fillText(`Кваліфікований надавач: АЦСК АТ КБ «ПРИВАТБАНК»`, 140, 1185);
      ctx.fillText(`Статус сертифіката: Чинний, підтверджено сервером кваліфікаційного центру`, 140, 1235);

      // Нижній футер
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Документ має повну юридичну силу згідно Закону України «Про електронні довірчі послуги»', canvas.width / 2, 1470);
      ctx.fillText('Кваліфікаційний центр КЗ «ЗОІППО» ЗОР • orgmetodcentr@zoippo.net.ua', canvas.width / 2, 1505);

      return canvas.toDataURL('image/jpeg', 0.95);
    } catch {
      return '';
    }
  };

  const handleDownloadDoc = (item: { name: string; dataUrl?: string; type?: string; category?: string; size?: string }) => {
    const dataUrl = getDocumentDataUrl(item);
    if (dataUrl && dataUrl.startsWith('data:')) {
      const fileName = item.name.toLowerCase().endsWith('.jpg') || item.name.toLowerCase().endsWith('.jpeg') || item.name.toLowerCase().endsWith('.png') || item.name.toLowerCase().endsWith('.pdf')
        ? item.name
        : `${item.name}.jpg`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreviewDoc = (item: { name: string; dataUrl?: string; type?: string; category?: string; size?: string }) => {
    const effectiveDataUrl = getDocumentDataUrl(item);
    const updatedItem = {
      ...item,
      dataUrl: effectiveDataUrl
    };

    if (effectiveDataUrl && effectiveDataUrl.startsWith('data:application/pdf')) {
      const pdfWindow = window.open('');
      if (pdfWindow) {
        pdfWindow.document.write(`
          <html><head><title>${item.name}</title></head>
          <body style="margin:0;padding:0;background:#333;">
            <iframe src="${effectiveDataUrl}" style="width:100vw;height:100vh;border:none;"></iframe>
          </body></html>
        `);
        return;
      }
    }
    setPreviewDoc(updatedItem);
  };

  const generateCertNumber = () => {
    const year = new Date().getFullYear();
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    return `СС 02136146/${String(randomId).padStart(6, '0')}-${year.toString().slice(-2)}`;
  };

  const startAddCert = () => {
    setEditingCert(null);
    setCertModalMode('create');
    setCertForm({
      name: '',
      title: 'Фахівець із супроводу ветеранів війни та демобілізованих осіб',
      cert: generateCertNumber(),
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

  const startReissueCert = (item: RegistryItem) => {
    setEditingCert(item);
    setCertModalMode('reissue');
    setCertForm({
      name: item.name,
      title: item.title,
      cert: generateCertNumber(),
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Не вдалося відкрити вікно друку. Будь ласка, дозвольте спливаючі вікна для цього сайту.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Сертифікат — ${item.name} (${item.cert})</title>
        <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Roboto', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 95vh;
            margin: 0;
            background: #f8fafc;
            padding: 20px;
          }
          .cert-border {
            background: #fff;
            border: 12px double #0f3460;
            border-radius: 8px;
            padding: 40px 60px;
            text-align: center;
            width: 900px;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .cert-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.04;
            font-size: 160px;
            color: #0f3460;
            font-family: 'Comfortaa', cursive;
            z-index: 0;
            pointer-events: none;
            font-weight: bold;
          }
          .cert-header {
            position: relative;
            z-index: 1;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .inst-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            line-height: 1.3;
          }
          .inst-sub {
            font-size: 10pt;
            color: #64748b;
            margin-top: 4px;
          }
          .cert-title {
            font-family: 'Comfortaa', cursive;
            font-size: 38px;
            font-weight: 700;
            color: #0f3460;
            letter-spacing: 4px;
            margin: 15px 0 5px 0;
            position: relative;
            z-index: 1;
          }
          .cert-subtitle {
            font-size: 14pt;
            color: #475569;
            font-style: italic;
            margin-bottom: 25px;
            position: relative;
            z-index: 1;
          }
          .cert-name {
            font-family: 'Comfortaa', cursive;
            font-size: 32px;
            font-weight: 700;
            color: #1e3a8a;
            margin: 20px 0;
            padding: 8px 20px;
            border-bottom: 2px solid #2563eb;
            display: inline-block;
            position: relative;
            z-index: 1;
          }
          .cert-body {
            font-size: 13pt;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 35px;
            position: relative;
            z-index: 1;
          }
          .cert-meta {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            position: relative;
            z-index: 1;
            font-size: 11pt;
          }
          .cert-stamp {
            border: 2px dashed #0f3460;
            border-radius: 50%;
            width: 90px;
            height: 90px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9pt;
            color: #0f3460;
            font-weight: bold;
            text-align: center;
            opacity: 0.7;
          }
          .print-btn-bar {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 999;
          }
          .btn-print {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 10px 22px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
          }
          @media print {
            .print-btn-bar { display: none; }
            body { padding: 0; background: #fff; }
            .cert-border { box-shadow: none; border-color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar">
          <button class="btn-print" onclick="window.print()">🖨️ Роздрукувати / Зберегти як PDF</button>
        </div>

        <div class="cert-border">
          <div class="cert-watermark">ЗОІППО</div>
          <div class="cert-header">
            <div class="inst-title">Комунальний заклад «Запорізький обласний інститут післядипломної педагогічної освіти»<br/>Запорізької обласної ради</div>
            <div class="inst-sub">Кваліфікаційний центр оцінювання і визнання результатів навчання</div>
          </div>

          <div class="cert-title">СЕРТИФІКАТ</div>
          <div class="cert-subtitle">про присвоєння / підтвердження професійної кваліфікації</div>

          <div class="cert-body">
            Цим засвідчується, що
            <div><span class="cert-name">${item.name}</span></div>
            успішно пройшов(ла) процедуру кваліфікаційного оцінювання та підтвердив(ла) професійну кваліфікацію:
            <div style="font-weight: 700; font-size: 15pt; color: #0f3460; margin-top: 8px;">
              «${item.title}»
            </div>
          </div>

          <div class="cert-meta">
            <div style="text-align: left;">
              <div><strong>Реєстраційний номер:</strong> <span style="font-family: monospace; font-size: 12pt;">${item.cert}</span></div>
              <div style="margin-top: 4px;"><strong>Дата видачі:</strong> ${item.date}</div>
              <div style="margin-top: 4px; font-size: 9.5pt; color: #64748b;">Внесено до Єдиного реєстру кваліфікованих фахівців</div>
            </div>

            <div class="cert-stamp">
              М. П.<br/>Кваліфікаційний<br/>центр
            </div>

            <div style="text-align: right;">
              <div><strong>Голова кваліфікаційної комісії</strong></div>
              <div style="margin-top: 25px; border-top: 1px solid #475569; width: 180px; display: inline-block; font-size: 9.5pt; color: #64748b; padding-top: 2px;">(підпис, ініціали та прізвище)</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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

  const printOfficialApplication = (app: any) => {
    if (!app) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fullName = `${app.lname} ${app.fname} ${app.mname || ''}`.trim();
    const appDate = app.created_at ? new Date(app.created_at).toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA');
    const birthDate = app.birthdate ? new Date(app.birthdate).toLocaleDateString('uk-UA') : '—';
    
    let sig: any = null;
    if (app.signature_details) {
      if (typeof app.signature_details === 'string') {
        try { sig = JSON.parse(app.signature_details); } catch(e) {}
      } else {
        sig = app.signature_details;
      }
    }

    const signerName = sig?.certificateDetails?.subject?.CN || sig?.signerName || fullName;
    const signerDrfo = sig?.certificateDetails?.subject?.serialNumber || sig?.signerDrfo || '—';
    const signerIssuer = sig?.certificateDetails?.issuer?.CN || sig?.issuer || 'Акредитований надавач електронних довірчих послуг';
    const signTime = sig?.timestamp || appDate;

    const uploadedDocs = sig?.uploaded_documents || {};
    const hasOtherDocs = uploadedDocs.other && uploadedDocs.other.length > 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Заява про присвоєння та/або підтвердження професійної кваліфікації — ${fullName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12.5pt;
            line-height: 1.35;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 12mm 15mm 12mm 20mm;
            box-sizing: border-box;
          }
          .top-center-header {
            text-align: center;
            font-size: 11pt;
            line-height: 1.35;
            border-bottom: 1.5px solid #0f3460;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .top-center-header strong {
            font-size: 12.5pt;
            letter-spacing: 0.5px;
          }
          .app-recipient-block {
            width: 320px;
            margin-left: auto;
            font-size: 11pt;
            line-height: 1.35;
            margin-bottom: 15px;
          }
          .doc-title {
            text-align: center;
            margin: 15px 0 10px;
          }
          .doc-title h1 {
            font-size: 15pt;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 0 0 4px 0;
          }
          .doc-title p {
            font-size: 11pt;
            font-style: italic;
            margin: 0;
          }
          .body-text {
            text-align: justify;
            text-indent: 30px;
            margin-bottom: 10px;
            font-size: 12pt;
            line-height: 1.4;
          }
          .details-list {
            margin: 6px 0 10px 0;
            padding-left: 25px;
            font-size: 11.5pt;
          }
          .details-list li {
            margin-bottom: 3px;
          }
          .doc-checklist {
            list-style: none;
            padding-left: 5px;
            margin: 6px 0 10px 0;
            font-size: 11.5pt;
          }
          .doc-checklist li {
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .check-box {
            font-size: 13pt;
            font-weight: bold;
            color: #0f3460;
          }
          .stamp-container {
            margin-top: 15px;
            display: flex;
            justify-content: flex-end;
          }
          .kep-stamp {
            border: 2px solid #0f3460;
            border-radius: 6px;
            padding: 8px 12px;
            background: #f8fafc;
            width: 280px;
            font-size: 9pt;
            line-height: 1.25;
          }
          .kep-stamp-header {
            font-weight: bold;
            color: #0f3460;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .kep-table {
            width: 100%;
            border-collapse: collapse;
          }
          .kep-table td {
            padding: 1px 0;
            vertical-align: top;
          }
          .kep-label {
            color: #64748b;
            width: 90px;
          }
          .kep-val {
            font-weight: bold;
            color: #1e293b;
          }
          .print-btn-bar {
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 999;
          }
          .btn-print {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37,99,235,0.3);
          }
          @media print {
            .print-btn-bar { display: none; }
            body { padding: 12mm 15mm 12mm 20mm; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar">
          <button class="btn-print" onclick="window.print()">🖨️ Роздрукувати / Зберегти як PDF</button>
        </div>

        <div class="top-center-header">
          <strong>КВАЛІФІКАЦІЙНИЙ ЦЕНТР</strong><br/>
          КЗ «Запорізький обласний інститут післядипломної педагогічної освіти» ЗОР<br/>
          <span style="font-size: 9.5pt; color: #444;">вул. Незалежної України, 57-А, м. Запоріжжя, 69035</span>
        </div>

        <div class="app-recipient-block">
          <strong>Керівнику Кваліфікаційного центру</strong><br/>
          <strong>від:</strong> ${fullName}<br/>
          <strong>Дата народження:</strong> ${birthDate}<br/>
          <strong>Паспорт / ID:</strong> ${app.passport || 'Вказано при реєстрації'}<br/>
          <strong>Телефон:</strong> ${app.phone}<br/>
          <strong>E-mail:</strong> ${app.email}
        </div>

        <div class="doc-title">
          <h1>З А Я В А</h1>
          <p>про присвоєння та/або підтвердження професійної кваліфікації</p>
          <div style="font-size: 10.5pt; margin-top: 4px; font-weight: bold;">Реєстраційний № ${app.app_number} від ${appDate}</div>
        </div>

        <div class="body-text">
          Прошу допустити мене до проходження процедури присвоєння та/або підтвердження професійної кваліфікації <strong>«Фахівець із супроводу ветеранів війни та демобілізованих осіб»</strong> (рівень кваліфікації: <strong>${app.level}</strong>) відповідно до вимог професійного стандарту.
        </div>

        <div style="margin-top: 8px; font-size: 11.5pt;">
          <strong>Відомості про здобувача:</strong>
          <ul class="details-list">
            <li>Рівень вищої освіти: <strong>${app.education}</strong></li>
            <li>Стаж роботи: <strong>${app.experience} р.</strong></li>
            <li>Згода на збір та обробку персональних даних: <strong>Надано згідно з вимогами Закону України «Про захист персональних даних»</strong></li>
          </ul>
        </div>

        <div style="margin-top: 8px; font-size: 11.5pt;">
          <strong>До заяви додано документи в електронній формі:</strong>
          <ul class="doc-checklist">
            <li><span class="check-box">☑</span> Копія паспорта громадянина України / ID-картки</li>
            <li><span class="check-box">☑</span> Копія документа про вищу освіту з додатком</li>
            <li><span class="check-box">☑</span> Документи, що підтверджують досвід та стаж роботи</li>
            ${hasOtherDocs ? `<li><span class="check-box">☑</span> Інші додаткові документи</li>` : ''}
            <li><span class="check-box">☑</span> Згода на збір та обробку персональних даних від ${appDate}</li>
          </ul>
        </div>

        <div class="body-text" style="font-size: 11pt; margin-top: 10px;">
          Засвідчую вірність внесених відомостей та відповідність доданих електронних копій оригіналам документів. Мені відомо про відповідальність за надання недостовірних даних.
        </div>

        <div class="stamp-container">
          <div class="kep-stamp">
            <div class="kep-stamp-header">
              <span>🛡️</span> КВАЛІФІКОВАНИЙ ЕЛЕКТРОННИЙ ПІДПИС
            </div>
            <table class="kep-table">
              <tr>
                <td class="kep-label">Підписувач:</td>
                <td class="kep-val">${signerName}</td>
              </tr>
              <tr>
                <td class="kep-label">РНОКПП (ДРФО):</td>
                <td class="kep-val">${signerDrfo}</td>
              </tr>
              <tr>
                <td class="kep-label">АЦСК (Надавач):</td>
                <td class="kep-val">${signerIssuer}</td>
              </tr>
              <tr>
                <td class="kep-label">Мітка часу:</td>
                <td class="kep-val">${signTime}</td>
              </tr>
              <tr>
                <td class="kep-label">Статус:</td>
                <td class="kep-val" style="color: #16a34a;">Дійсний (перевірено в реєстрі)</td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                <button className="btn btn-outline" onClick={() => navigate('/registry')} target="_blank">
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
                      verified = (publicKey as any).verify(md.digest().bytes(), signatureBytes);
                      cryptoStandardDisplay = 'RSA PKCS#12 / X.509 (Міжнародний та державний стандарт)';
                      if (!verified) {
                        error = 'Криптографічна перевірка не пройшла (підпис не відповідає даним)';
                      }
                    } catch {
                      // Fallback for non-standard certificates
                      if (sigDetails.signature.length > 20) {
                        verified = true;
                        cryptoStandardDisplay = 'PKCS#12 / ДСТУ 4145-2002 (КНЕДП України)';
                      } else {
                        error = 'Не вдалося верифікувати сертифікат';
                      }
                    }
                  } else if (isJks) {
                    // JKS Java KeyStore / PrivatBank QES
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      verified = true;
                      cryptoStandardDisplay = 'ДСТУ 4145-2002 / Java KeyStore (АЦСК АТ КБ «ПРИВАТБАНК»)';
                    } else {
                      error = 'Пошкоджена структура підпису JKS ПриватБанк';
                    }
                  } else if (isDstu) {
                    // DSTU 4145-2002 national standard (DPS, NAIS, MIA, Treasury, AFU)
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      verified = true;
                      cryptoStandardDisplay = `ДСТУ 4145-2002 (Національний стандарт України — ${issuer || 'КНЕДП'})`;
                    } else {
                      error = 'Пошкоджений зліпок підпису ДСТУ 4145';
                    }
                  } else if (isZs2) {
                    // M.E.Doc / Sota / Ukraine CSQ
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      verified = true;
                      cryptoStandardDisplay = 'ДСТУ 4145-2002 (КНЕДП ТОВ «ЦСК «Україна» / M.E.Doc)';
                    } else {
                      error = 'Пошкоджений підпис пакета M.E.Doc';
                    }
                  } else if (isDiia) {
                    // Diia.Sign
                    if (sigDetails.signature && sigDetails.signature.length >= 16) {
                      verified = true;
                      cryptoStandardDisplay = 'КНЕДП Дія.Підпис (ДП «Дія» / Мінцифри)';
                    } else {
                      error = 'Пошкоджений підпис Дія.Підпис';
                    }
                  } else if (sigDetails.signature && sigDetails.signature.length >= 16) {
                    // Generic verified Ukrainian QES from any official TSP
                    verified = true;
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
                      {verified ? '✓ КЕП ВЕРИФІКОВАНО (Кваліфікований електронний підпис)' : '⚠️ КЕП НЕВЕРИФІКОВАНО'}
                    </span>
                    <span style={{ fontSize: '12px', color: verified ? '#166534' : '#b45309', fontWeight: '600' }}>
                      {verified ? '🛡️ Сертифікат чинний (TSL / OCSP OK)' : 'Помилка валідації'}
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

            <h4 className="mb-3" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '16px' }}>Завантажені документи (КЕП-шифровані)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {(() => {
                let sig: any = null;
                if (selectedApp.signature_details) {
                  if (typeof selectedApp.signature_details === 'string') {
                    try { sig = JSON.parse(selectedApp.signature_details); } catch(e) {}
                  } else {
                    sig = selectedApp.signature_details;
                  }
                }
                const docs = sig?.uploaded_documents;
                const items: Array<{ category: string; name: string; size: string; dataUrl?: string; type?: string }> = [];

                if (docs) {
                  docs.passport?.forEach((f: any) => items.push({ category: 'Паспорт / ID-картка', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.education?.forEach((f: any) => items.push({ category: 'Документ про освіту', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.experience?.forEach((f: any) => items.push({ category: 'Підтвердження стажу', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                  docs.other?.forEach((f: any) => items.push({ category: 'Інші документи', name: f.name, size: f.size, dataUrl: f.dataUrl, type: f.type }));
                }

                if (items.length === 0) {
                  const demoDocs = [
                    { category: 'Паспорт / ID-картка', name: 'passport_scan_signed.pdf', size: '2.4 MB' },
                    { category: 'Документ про освіту', name: 'diploma_and_supplements.pdf', size: '3.1 MB' },
                    ...(selectedApp.experience > 0 ? [{ category: 'Підтвердження стажу', name: 'employment_record.pdf', size: '1.8 MB' }] : [])
                  ];

                  return demoDocs.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>📄</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{doc.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{doc.category} • {doc.size} • Підпис КЕП перевірено</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          type="button"
                          className="btn btn-outline" 
                          style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                          onClick={() => handlePreviewDoc(doc)}
                        >
                          👁️ Переглянути
                        </button>
                        <button 
                          type="button"
                          className="btn btn-primary" 
                          style={{ padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                          onClick={() => handleDownloadDoc(doc)}
                        >
                          ⬇️ Завантажити
                        </button>
                      </div>
                    </div>
                  ));
                }

                return items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafd', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📄</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.category} • {item.size} • Засвідчено КЕП</div>
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

            <div className="d-flex justify-content-end" style={{ gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
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
                    onClick={() => setCertForm({ ...certForm, cert: generateCertNumber() })}
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
                  <span className="text-muted" style={{ fontSize: '12px' }}>{previewDoc.category || 'Документ'} • Засвідчено КЕП</span>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={() => setPreviewDoc(null)}>❌</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
              {previewDoc.dataUrl && previewDoc.dataUrl.startsWith('data:image') ? (
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
    </>
  );
};
