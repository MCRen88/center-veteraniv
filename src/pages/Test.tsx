import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { casesDb } from '../data/casesDb';

type TestMode = 'training' | 'exam' | null;

export const Test: React.FC = () => {
  const { state, saveTestScore } = useAppContext();
  const navigate = useNavigate();

  const [mode, setMode] = useState<TestMode>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [testQuestions, setTestQuestions] = useState(state.questions);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes in seconds
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState('');
  const [wasTerminated, setWasTerminated] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSavingRef = useRef(false);

  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [timePerQuestion, setTimePerQuestion] = useState<{ [key: number]: number }>({});
  const [answerChanges, setAnswerChanges] = useState<{ [key: number]: number }>({});

  const [showCases, setShowCases] = useState(false);
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [caseAnswers, setCaseAnswers] = useState<number[]>([]);
  const [casesFinished, setCasesFinished] = useState(false);
  const [casesScore, setCasesScore] = useState(0);
  const [caseShowFeedback, setCaseShowFeedback] = useState(false);
  const [examEndTime, setExamEndTime] = useState<number | null>(null);
  const isRestored = useRef(false);

  const isImpersonating = !!state.originalAdminUser;

  const exitTest = () => {
    if (state.currentUser) {
      localStorage.removeItem(`lms_active_test_state_${state.currentUser.id}`);
    }
    navigate('/dashboard');
  };

  // Restore test state from localStorage on mount/when currentUser is loaded
  useEffect(() => {
    if (!state.currentUser || isRestored.current) return;
    const saved = localStorage.getItem(`lms_active_test_state_${state.currentUser.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.mode) {
          setMode(parsed.mode);
          setCurrentQuestionIndex(parsed.currentQuestionIndex ?? 0);
          if (parsed.testQuestions && parsed.testQuestions.length > 0) {
            setTestQuestions(parsed.testQuestions);
          }
          setAnswers(parsed.answers ?? []);
          setShowExplanation(parsed.showExplanation ?? false);
          setIsFinished(parsed.isFinished ?? false);
          setScore(parsed.score ?? 0);
          
          let calculatedTimeLeft = parsed.timeLeft ?? 3600;
          if (parsed.mode === 'exam' && parsed.examEndTime) {
            const remaining = Math.round((parsed.examEndTime - Date.now()) / 1000);
            calculatedTimeLeft = remaining > 0 ? remaining : 0;
          }
          setTimeLeft(calculatedTimeLeft);
          setExamEndTime(parsed.examEndTime ?? null);
          
          setWarnings(parsed.warnings ?? 0);
          setWasTerminated(parsed.wasTerminated ?? false);
          setQuestionStartTime(parsed.questionStartTime ?? Date.now());
          setTimePerQuestion(parsed.timePerQuestion ?? {});
          setAnswerChanges(parsed.answerChanges ?? {});
          setShowCases(parsed.showCases ?? false);
          setCurrentCaseIndex(parsed.currentCaseIndex ?? 0);
          setCaseAnswers(parsed.caseAnswers ?? []);
          setCasesFinished(parsed.casesFinished ?? false);
          setCasesScore(parsed.casesScore ?? 0);
          setCaseShowFeedback(parsed.caseShowFeedback ?? false);
        }
      } catch (e) {
        console.error("Error restoring test state:", e);
      }
    }
    isRestored.current = true;
  }, [state.currentUser]);

  // Save test state to localStorage on state changes
  useEffect(() => {
    if (!state.currentUser || !isRestored.current) return;
    if (mode) {
      const stateToSave = {
        mode,
        currentQuestionIndex,
        testQuestions,
        answers,
        showExplanation,
        isFinished,
        score,
        timeLeft,
        warnings,
        wasTerminated,
        questionStartTime,
        timePerQuestion,
        answerChanges,
        showCases,
        currentCaseIndex,
        caseAnswers,
        casesFinished,
        casesScore,
        caseShowFeedback,
        examEndTime
      };
      localStorage.setItem(`lms_active_test_state_${state.currentUser.id}`, JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem(`lms_active_test_state_${state.currentUser.id}`);
    }
  }, [
    state.currentUser,
    mode,
    currentQuestionIndex,
    testQuestions,
    answers,
    showExplanation,
    isFinished,
    score,
    timeLeft,
    warnings,
    wasTerminated,
    questionStartTime,
    timePerQuestion,
    answerChanges,
    showCases,
    currentCaseIndex,
    caseAnswers,
    casesFinished,
    casesScore,
    caseShowFeedback,
    examEndTime
  ]);



  const startCases = () => {
    setShowCases(true);
    setCurrentCaseIndex(0);
    setCaseAnswers(new Array(casesDb.length).fill(-1));
    setCasesFinished(false);
    setCasesScore(0);
    setCaseShowFeedback(false);
  };

  const handleCaseAnswer = (optionIndex: number) => {
    if (caseShowFeedback) return;
    const newCaseAnswers = [...caseAnswers];
    newCaseAnswers[currentCaseIndex] = optionIndex;
    setCaseAnswers(newCaseAnswers);
    setCaseShowFeedback(true);
  };

  const nextCase = () => {
    setCaseShowFeedback(false);
    if (currentCaseIndex < casesDb.length - 1) {
      setCurrentCaseIndex(currentCaseIndex + 1);
    } else {
      let correctCount = 0;
      casesDb.forEach((c, idx) => {
        if (caseAnswers[idx] === c.correctAnswer) {
          correctCount++;
        }
      });
      setCasesScore(correctCount);
      setCasesFinished(true);
    }
  };

  const goToQuestion = (nextIdx: number) => {
    const now = Date.now();
    const elapsed = Math.round((now - questionStartTime) / 1000);
    
    setTimePerQuestion(prev => ({
      ...prev,
      [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + elapsed
    }));
    
    setQuestionStartTime(now);
    setCurrentQuestionIndex(nextIdx);
  };

  useEffect(() => {
    if (!mode) {
      setTestQuestions(state.questions);
    }
  }, [state.questions, mode]);


  const startTest = (selectedMode: TestMode) => {
    setMode(selectedMode);
    setWarnings(0);
    setShowWarningModal(false);
    setWasTerminated(false);
    setTimeLeft(3600);
    
    setQuestionStartTime(Date.now());
    setTimePerQuestion({});
    setAnswerChanges({});

    setShowCases(false);
    setCurrentCaseIndex(0);
    setCaseAnswers([]);
    setCasesFinished(false);
    setCasesScore(0);
    setCaseShowFeedback(false);
    
    if (selectedMode === 'exam') {
      const shuffled = [...state.questions].sort(() => 0.5 - Math.random());
      setTestQuestions(shuffled);
      setExamEndTime(Date.now() + 3600 * 1000);
    } else {
      setTestQuestions(state.questions);
      setExamEndTime(null);
    }
    
    setAnswers(new Array(state.questions.length).fill(-1));
    setCurrentQuestionIndex(0);
    setShowExplanation(false);
    setIsFinished(false);
    setScore(0);
  };

  const handleAnswer = (optionIndex: number) => {
    if (showExplanation && mode === 'training') return;

    const previousAnswer = answers[currentQuestionIndex];
    const isChange = previousAnswer !== -1 && previousAnswer !== optionIndex;
    
    if (isChange) {
      setAnswerChanges(prev => ({
        ...prev,
        [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
      }));
    }

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);

    if (mode === 'training') {
      setShowExplanation(true);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
      setShowExplanation(mode === 'training' && answers[currentQuestionIndex + 1] !== -1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
      setShowExplanation(mode === 'training' && answers[currentQuestionIndex - 1] !== -1);
    }
  };

  const buildTestDetails = (finalScore: number, wasTerminatedOnViolation = false) => {
    const now = Date.now();
    const elapsed = Math.round((now - questionStartTime) / 1000);
    const finalTimePerQuestion = {
      ...timePerQuestion,
      [currentQuestionIndex]: (timePerQuestion[currentQuestionIndex] || 0) + elapsed
    };
    const totalTimeSpent = Object.values(finalTimePerQuestion).reduce((a, b) => a + b, 0);

    const totalQuestions = testQuestions.length;
    const avgTime = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
    
    const categoryStats: { [key: string]: { correct: number; total: number } } = {};
    testQuestions.forEach((q, idx) => {
      const cat = q.catName;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { correct: 0, total: 0 };
      }
      categoryStats[cat].total++;
      if (answers[idx] === q.correct) {
        categoryStats[cat].correct++;
      }
    });
    
    let strongest = '';
    let weakest = '';
    let maxRate = -1;
    let minRate = 2;
    
    Object.keys(categoryStats).forEach(cat => {
      const rate = categoryStats[cat].correct / categoryStats[cat].total;
      if (rate > maxRate) {
        maxRate = rate;
        strongest = cat;
      }
      if (rate < minRate) {
        minRate = rate;
        weakest = cat;
      }
    });

    const totalChanges = Object.values(answerChanges).reduce((a, b) => a + b, 0);

    let style = 'Збалансований';
    let description = 'Кандидат демонструє оптимальний баланс швидкості та якості прийняття рішень. Працює в стабільному темпі, приділяючи помірну увагу кожному питанню.';
    let strengths = ['Стабільний темп роботи', 'Адекватна самооцінка впевненості', 'Низький рівень помилок через неуважність'];
    let weaknesses = ['Можлива легка нерішучість на складних запитаннях'];
    
    const scoreRate = totalQuestions > 0 ? finalScore / totalQuestions : 0;

    if (avgTime < 15 && totalChanges <= 2) {
      style = 'Імпульсивний';
      description = 'Кандидат відповідає дуже швидко, практично без вагань та виправлень. Це може свідчити про високу впевненість у своїх знаннях або схильність до поспішних висновків без глибокого аналізу варіантів.';
      strengths = ['Висока швидкість реакції', 'Інтуїтивне розуміння матеріалу', 'Рішучість'];
      weaknesses = ['Помилки через поспіх', 'Поверхневий аналіз складних ситуацій', 'Ігнорування важливих деталей у формулюваннях'];
    } else if (avgTime > 35 && totalChanges >= 3) {
      style = 'Вагаючий / Невпевнений';
      description = 'Кандидат витрачає багато часу на роздуми та часто змінює вже обрані відповіді. Це вказує на невпевненість у власних знаннях, тривожність під час тесту або бажання перестрахуватися.';
      strengths = ['Ретельна перевірка варіантів', 'Уважність до деталей', 'Бажання уникнути помилок'];
      weaknesses = ['Повільний темп прийняття рішень', 'Часті сумніви', 'Схильність змінювати правильну відповідь на неправильну'];
    } else if (avgTime >= 20 && scoreRate >= 0.75 && totalChanges < 3) {
      style = 'Аналітичний / Системний';
      description = 'Кандидат демонструє структурований підхід: уважно вчитується в кожне питання, аналізує всі варіанти відповідей і приймає зважене рішення з першого разу.';
      strengths = ['Глибокий логічний аналіз', 'Висока концентрація уваги', 'Стабільна впевненість'];
      weaknesses = ['Ризик не вкластися в жорсткі часові ліміти при ускладненні питань'];
    }

    let speedCategory = 'Помірна';
    if (avgTime < 15) speedCategory = 'Швидка';
    if (avgTime > 35) speedCategory = 'Уповільнена';

    let confidence = 'Середня';
    if (totalChanges <= 1) confidence = 'Висока';
    if (totalChanges >= 4) confidence = 'Низька';

    let forecast = `Кандидат готовий до практичної діяльності. Слабке місце — "${weakest.split('.')[0] || weakest}", де спостерігається найбільший відсоток помилок.`;
    if (wasTerminatedOnViolation) {
      forecast = 'Тестування заблоковано та анульовано через систематичні порушення правил (вихід з вкладки/вікна браузера). Спрогнозувати професійну успішність неможливо через недостатність даних.';
    } else if (scoreRate >= 0.75) {
      forecast = `Прогноз позитивний. Кандидат демонструє високий рівень професійної компетентності. Його стиль прийняття рішень (${style.toLowerCase()}) та сильна сторона у сфері "${strongest}" дозволять йому ефективно виконувати обов'язки фахівця із супроводу ветеранів.`;
    } else {
      forecast = `Рекомендується додаткова підготовка. Наразі рівень знань недостатній для успішної сертифікації. Потрібно звернути увагу на зону "${weakest}", а також переглянути підхід до темпу відповідей (зменшити поспіх або сумніви).`;
    }

    let recommendations = 'Продовжуйте практикуватися в тренувальному режимі.';
    if (wasTerminatedOnViolation) {
      recommendations = 'Дотримуйтеся правил академічної доброчесності та не залишайте вікно тестування під час наступної спроби.';
    } else if (style === 'Імпульсивний') {
      recommendations = 'Уповільніть темп. Уважно дочитуйте питання та всі 4 варіанти відповідей до кінця перед вибором.';
    } else if (style === 'Вагаючий / Невпевнений') {
      recommendations = 'Довіряйте першій інтуїтивній відповіді. Намагайтеся не змінювати обраний варіант без вагомих логічних аргументів.';
    } else if (style === 'Аналітичний / Системний') {
      recommendations = 'Дотримуйтеся обраної стратегії. Ви демонструєте ідеальний баланс темпу та якості.';
    }

    const questionsBreakdown = testQuestions.map((q, idx) => ({
      id: q.id,
      question: q.question,
      catId: q.catId,
      catName: q.catName,
      options: q.options,
      correct: q.correct,
      selected: answers[idx],
      timeSpent: finalTimePerQuestion[idx] || 0,
      changes: answerChanges[idx] || 0
    }));

    return {
      questions: questionsBreakdown,
      totalTime: totalTimeSpent,
      tabSwitches: warnings,
      behaviorProfile: {
        style,
        confidence,
        speedCategory,
        description,
        strengths,
        weaknesses,
        forecast,
        recommendations
      }
    };
  };

  const finishTest = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSubmitting(true);

    let finalScore = 0;
    testQuestions.forEach((q, index) => {
      if (answers[index] === q.correct) finalScore++;
    });
    
    const percentage = Math.round((finalScore / testQuestions.length) * 100);
    const details = buildTestDetails(finalScore, false);
    
    try {
      await saveTestScore({
        mode: mode || 'unknown',
        score: finalScore,
        total: testQuestions.length,
        passed: percentage >= 75 && !wasTerminated,
        details
      });
    } catch (err) {
      console.error("Помилка збереження результату:", err);
    }

    setScore(finalScore);
    setIsFinished(true);
  };

  const terminateTest = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSubmitting(true);

    setWasTerminated(true);
    let finalScore = 0;
    testQuestions.forEach((q, index) => {
      if (answers[index] === q.correct) finalScore++;
    });
    
    const details = buildTestDetails(finalScore, true);
    
    try {
      await saveTestScore({
        mode: mode || 'unknown',
        score: finalScore,
        total: testQuestions.length,
        passed: false,
        details
      });
    } catch (err) {
      console.error("Помилка збереження результату при анулюванні:", err);
    }

    setScore(finalScore);
    setIsFinished(true);
  };

  const finishTestRef = useRef(finishTest);
  const terminateTestRef = useRef(terminateTest);
  const lastViolationTimeRef = useRef<number>(0);
  
  useEffect(() => {
    finishTestRef.current = finishTest;
    terminateTestRef.current = terminateTest;
  });

  // Auto-submit test if time left becomes 0 in exam mode
  useEffect(() => {
    if (mode === 'exam' && timeLeft === 0 && !isFinished && !isSubmitting) {
      finishTest();
    }
  }, [mode, timeLeft, isFinished, isSubmitting, finishTest]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!mode || mode !== 'exam' || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTestRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isFinished]);

  useEffect(() => {
    if (!mode || mode !== 'exam' || isFinished) return;

    const handleViolation = (reason: string) => {
      if (isSavingRef.current || isFinished) return; // Ignore warnings after submission started
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1000) {
        // Cooldown to prevent double-triggering when tab change fires both visibilitychange and blur
        return;
      }
      lastViolationTimeRef.current = now;

      setWarnings((prev) => {
        const nextWarnings = prev + 1;
        if (nextWarnings >= 2) {
          terminateTestRef.current();
          return nextWarnings;
        } else {
          setWarningReason(reason);
          setShowWarningModal(true);
          return nextWarnings;
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('перехід на іншу вкладку або згортання браузера');
      }
    };

    const handleBlur = () => {
      handleViolation('втрата фокусу вікна браузера (перехід до іншої програми)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, isFinished]);



  const downloadCert = () => {
    const scorePercentage = Math.round((score / testQuestions.length) * 100);
    const date = new Date().toLocaleDateString('uk-UA');
    
    const certWindow = window.open('', '_blank');
    if (certWindow) {
      certWindow.document.write(`
        <html><head><title>Сертифікат</title>
        <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=Roboto&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Roboto', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
          .cert-border { border: 10px solid #23395d; padding: 40px; text-align: center; width: 800px; position: relative; }
          .cert-title { font-family: 'Comfortaa', sans-serif; font-size: 40px; color: #23395d; margin-bottom: 20px; }
          .cert-name { font-family: 'Comfortaa', sans-serif; font-size: 36px; font-weight: bold; color: #4069a5; margin: 30px 0; text-decoration: underline; }
          .cert-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; font-size: 150px; color: #23395d; font-family: 'Comfortaa'; z-index: -1; pointer-events: none;}
        </style>
        </head><body>
          <div class="cert-border">
            <div class="cert-watermark">ЗОІППО</div>
            <div class="cert-title">СЕРТИФІКАТ</div>
            <div style="font-size: 20px;">про проходження онлайн-тестування</div>
            <div class="cert-name">${currentUser?.name || ''}</div>
            <div style="font-size: 18px; line-height: 1.5; margin-bottom: 40px;">
              Успішно пройшов(ла) тестування на знання професійного стандарту<br>
              "Фахівець із супроводу ветеранів війни та демобілізованих осіб"<br><br>
              <strong>Результат: ${scorePercentage}% (${score} з ${testQuestions.length} правильних відповідей)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <div>Дата: ${date}</div>
              <div>Кваліфікаційний центр ЗОІППО</div>
            </div>
          </div>
          <script>window.print();</script>
        </body></html>
      `);
      certWindow.document.close();
    }
  };

  const currentUser = state.currentUser;

  // Protected Route Check
  if (!currentUser) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ обмежено</h3>
        <p className="mt-3 mb-4">Для проходження тестування необхідно увійти в систему.</p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>Увійти</button>
      </div>
    );
  }

  if (currentUser.role === 'user' && !currentUser.testPermission && !isFinished && !showCases && !mode && !isImpersonating) {
    const hasPreviousScores = currentUser.testScores && currentUser.testScores.length > 0;
    return (
      <div className="container mt-5 mb-5 text-center">
        <h3>Доступ до тестування закрито</h3>
        <p className="mt-3 mb-4 text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {hasPreviousScores 
            ? "Ви вже пройшли тестування. Повторна спроба можлива лише з дозволу адміністратора."
            : "Очікуйте підтвердження від адміністратора. Адміністратор надасть вам дозвіл після перевірки вашої заяви та документів."}
        </p>
        <button className="btn btn-outline" onClick={exitTest}>Повернутися до кабінету</button>
      </div>
    );
  }

  if (isFinished) {
    if (showCases) {
      if (casesFinished) {
        return (
          <div className="container mt-5 mb-5">
            <div className="card text-center" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
              <div style={{ fontSize: '70px', marginBottom: '20px' }}>🏆</div>
              <h2 style={{ fontFamily: 'Comfortaa, sans-serif' }}>Завершено оцінювання кейсів</h2>
              <p style={{ fontSize: '20px', margin: '20px 0 30px' }}>
                Ви успішно розв'язали <strong>{casesScore} з {casesDb.length}</strong> професійних кейсів.
              </p>
              
              <div className="alert alert-info mb-4" style={{ textAlign: 'left', lineHeight: 1.6 }}>
                <strong>Аналіз результату:</strong><br />
                {casesScore >= 8 ? (
                  "Відмінний результат! Ви продемонстрували глибоке розуміння професійного стандарту фахівця із супроводу ветеранів, етичних норм, законодавства та принципів кейс-менеджменту. Ви готові до вирішення складних реальних ситуацій."
                ) : casesScore >= 5 ? (
                  "Хороший результат. Ви орієнтуєтеся в основних ситуаціях, проте деякі рішення потребують більш детального вивчення законодавчої бази (зокрема, щодо захисту персональних даних та протидії домашньому насильству)."
                ) : (
                  "Рекомендується додатково опрацювати нормативно-правові акти та професійний стандарт. Деякі з ваших рішень можуть створювати юридичні або етичні ризики для клієнтів та організації."
                )}
              </div>

              <div className="mt-4 d-flex justify-content-center gap-3">
                <button className="btn btn-outline" onClick={exitTest}>
                  В кабінет
                </button>
                <button className="btn btn-primary" onClick={() => setShowCases(false)}>
                  Назад до результатів тесту
                </button>
                 {(currentUser.role !== 'user' || currentUser.testPermission || isImpersonating) && (
                  <button className="btn btn-primary" style={{ background: '#3498db' }} onClick={startCases}>
                    Спробувати кейси ще раз
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      const currentCase = casesDb[currentCaseIndex];
      const hasSelectedOption = caseAnswers[currentCaseIndex] !== -1;

      return (
        <>
          <style>{`
            .case-container {
              max-width: 850px;
              margin: 0 auto;
            }
            .situation-box {
              background: var(--bg-light);
              border-left: 5px solid var(--blue);
              padding: 20px;
              border-radius: 4px;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 25px;
              color: var(--text-dark);
            }
            .option-card-case {
              padding: 18px 22px;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              margin-bottom: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 15px;
              line-height: 1.5;
              background: white;
              text-align: left;
            }
            .option-card-case:hover {
              border-color: #cbd5e1;
              background: #f8fafc;
              transform: translateY(-1px);
            }
            .option-card-case.correct {
              border-color: #10b981;
              background: #ecfdf5;
              color: #065f46;
              font-weight: 500;
            }
            .option-card-case.wrong {
              border-color: #ef4444;
              background: #fef2f2;
              color: #991b1b;
            }
            .option-card-case.selected {
              border-color: var(--blue);
              background: rgba(81, 144, 207, 0.05);
            }
            .badge-step {
              background: var(--light-blue);
              color: white;
              padding: 4px 10px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: bold;
            }
          `}</style>

          <div className="container mt-4 mb-5 case-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="badge-step">Кейс {currentCaseIndex + 1} з {casesDb.length}</span>
              <span className="text-muted" style={{ fontSize: '14px', fontWeight: 500 }}>
                Практичний блок оцінювання
              </span>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '22px', color: 'var(--dark-blue)', marginBottom: '20px', fontFamily: 'Comfortaa, sans-serif' }}>
                {currentCase.title}
              </h2>

              <div className="situation-box">
                <strong>Опис ситуації:</strong><br />
                {currentCase.situation}
              </div>

              <h3 style={{ fontSize: '18px', lineHeight: 1.4, marginBottom: '20px', fontWeight: 600 }}>
                {currentCase.question}
              </h3>

              <div className="options-list">
                {currentCase.options.map((opt, idx) => {
                  let cardClass = "option-card-case";
                  if (caseAnswers[currentCaseIndex] === idx) cardClass += " selected";
                  
                  if (caseShowFeedback) {
                    if (idx === currentCase.correctAnswer) cardClass += " correct";
                    else if (caseAnswers[currentCaseIndex] === idx) cardClass += " wrong";
                  }

                  return (
                    <div
                      key={idx}
                      className={cardClass}
                      onClick={() => handleCaseAnswer(idx)}
                    >
                      <strong>{String.fromCharCode(65 + idx)})</strong> {opt}
                    </div>
                  );
                })}
              </div>

              {caseShowFeedback && (
                <div className="alert alert-success mt-4" style={{ borderLeft: '5px solid #10b981', background: '#f0fdf4', textAlign: 'left' }}>
                  <h4 className="alert-heading" style={{ fontSize: '16px', color: '#15803d', marginBottom: '8px' }}>
                    {caseAnswers[currentCaseIndex] === currentCase.correctAnswer ? "✅ Правильне рішення!" : "❌ Не зовсім правильний вибір"}
                  </h4>
                  <p style={{ fontSize: '14px', margin: 0, color: '#166534', lineHeight: 1.5 }}>
                    <strong>Обґрунтування:</strong> {currentCase.explanation}
                  </p>
                </div>
              )}

              <div className="d-flex justify-content-end mt-4">
                <button
                  className="btn btn-primary"
                  onClick={nextCase}
                  disabled={!hasSelectedOption}
                >
                  {currentCaseIndex === casesDb.length - 1 ? "Завершити блок кейсів" : "Наступний кейс"}
                </button>
              </div>
            </div>
          </div>
        </>
      );
    }

    const percentage = Math.round((score / testQuestions.length) * 100);
    const passed = percentage >= 75 && !wasTerminated;

    return (
      <div className="container mt-5 mb-5">
        <div className="card text-center" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>Результати тестування</h2>
          <div style={{ fontSize: '80px', fontWeight: 'bold', color: passed ? '#2ecc71' : '#e74c3c' }}>
            {wasTerminated ? '⚠️' : `${percentage}%`}
          </div>
          <p style={{ fontSize: '20px', marginBottom: '30px' }}>
            {wasTerminated 
              ? 'Тестування заблоковано через порушення правил.' 
              : `Ви дали правильну відповідь на ${score} з ${testQuestions.length} запитань.`}
          </p>
          <div className={`alert ${passed ? 'alert-success' : 'alert-danger'}`}>
            {wasTerminated ? (
              <strong>Тестування автоматично завершено та анульовано через повторний вихід з вікна тестування (перемикання вкладок/програм).</strong>
            ) : passed ? (
              "Вітаємо! Ви успішно склали тест і продемонстрували достатній рівень знань професійного стандарту." 
            ) : (
              "На жаль, ви не набрали прохідний бал (75%). Рекомендуємо повторити матеріал та спробувати ще раз."
            )}
          </div>
          
          <div className="mt-4 d-flex justify-content-center gap-3">
            <button className="btn btn-outline" onClick={exitTest}>В кабінет</button>
            {(currentUser.role !== 'user' || currentUser.testPermission || isImpersonating) && (
              <button className="btn btn-primary" onClick={() => startTest(mode)}>Спробувати ще раз</button>
            )}
            {passed && !wasTerminated && (
              <button className="btn btn-primary" style={{ background: '#2ecc71' }} onClick={downloadCert}>
                Завантажити сертифікат
              </button>
            )}
            {!wasTerminated && (
              <button className="btn btn-primary" style={{ background: '#3498db' }} onClick={startCases}>
                Перейти до професійних кейсів
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode) {
    const question = testQuestions[currentQuestionIndex];
    const hasAnsweredAll = answers.every(a => a !== -1);

    return (
      <>
        <style>{`
          .test-layout { display: grid; grid-template-columns: 1fr 300px; gap: 30px; }
          @media (max-width: 992px) { .test-layout { grid-template-columns: 1fr; } }
          .option-card { padding: 15px 20px; border: 2px solid #eee; border-radius: var(--radius-sm); margin-bottom: 15px; cursor: pointer; transition: var(--transition); }
          .option-card:hover { border-color: var(--light-blue); background: var(--bg-light); }
          .option-card.selected { border-color: var(--blue); background: rgba(81, 144, 207, 0.1); }
          .option-card.correct { border-color: #2ecc71; background: rgba(46, 204, 113, 0.1); }
          .option-card.wrong { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
          .q-map-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
          .q-map-btn { aspect-ratio: 1; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; }
          .q-map-btn.current { border-color: var(--blue); border-width: 2px; }
          .q-map-btn.answered { background: var(--light-blue); color: white; border-color: var(--light-blue); }
        `}</style>
        
        {showWarningModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '60px', color: '#f1c40f', marginBottom: '20px' }}>⚠️</div>
              <h3 style={{ color: '#c0392b', marginBottom: '15px', fontFamily: 'Comfortaa, sans-serif' }}>Попередження!</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '20px', color: 'var(--text-dark)' }}>
                Ви вийшли з вікна тестування ({warningReason}). 
                Перемикання вкладок, згортання браузера або перехід до інших програм під час складання іспиту суворо заборонено!
              </p>
              <div style={{
                background: '#fce8e6',
                border: '1px solid #f5c2c7',
                padding: '12px 15px',
                borderRadius: '8px',
                color: '#d93025',
                fontWeight: 'bold',
                fontSize: '18px',
                marginBottom: '20px'
              }}>
                Попередження: {warnings} з 2
              </div>
              <p className="text-muted" style={{ fontSize: '13px', marginBottom: '25px' }}>
                При повторному виході з вікна тестування іспит буде автоматично завершено з результатом "Не складено".
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowWarningModal(false)}>
                Я зрозумів(ла), повернутися до тесту
              </button>
            </div>
          </div>
        )}
        
        <div className="container mt-4 mb-5 test-layout">
          <div>
            <div className="d-flex justify-content-between mb-3">
              <span style={{ color: 'var(--text-muted)' }}>Запитання {currentQuestionIndex + 1} з {testQuestions.length}</span>
              <span style={{ color: 'var(--blue)', fontWeight: 500 }}>{question.catName}</span>
            </div>
            
            <div className="card mb-4">
              <h3 style={{ fontSize: '20px', lineHeight: 1.4, marginBottom: '20px' }}>{question.question}</h3>
              
              <div className="options">
                {question.options.map((opt: string, idx: number) => {
                  let className = "option-card";
                  if (answers[currentQuestionIndex] === idx) className += " selected";
                  
                  if (showExplanation && mode === 'training') {
                    if (idx === question.correct) className += " correct";
                    else if (answers[currentQuestionIndex] === idx) className += " wrong";
                  }
                  
                  return (
                    <div key={idx} className={className} onClick={() => handleAnswer(idx)}>
                      {opt}
                    </div>
                  );
                })}
              </div>

              {showExplanation && mode === 'training' && (
                <div className="alert alert-info mt-4">
                  <strong>Пояснення:</strong><br/>
                  {question.explanation}
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between">
              <button className="btn btn-outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0}>Назад</button>
              
              {currentQuestionIndex < testQuestions.length - 1 ? (
                <button className="btn btn-primary" onClick={nextQuestion}>Далі</button>
              ) : (
                <button className="btn btn-primary" onClick={finishTest} disabled={(!hasAnsweredAll && mode === 'exam') || isSubmitting}>
                  {isSubmitting ? 'Збереження...' : 'Завершити тест'}
                </button>
              )}
            </div>
          </div>
          
          <div>
            <div className="card" style={{ position: 'sticky', top: '100px' }}>
              {mode === 'exam' && (
                <div className="timer-box mb-4" style={{
                  padding: '15px',
                  borderRadius: '8px',
                  background: timeLeft < 300 ? '#fce8e6' : 'var(--bg-light)',
                  border: timeLeft < 300 ? '1px solid #f5c2c7' : '1px solid #ddd',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '5px' }}>Залишилося часу</div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: 'bold', 
                    color: timeLeft < 300 ? '#d93025' : 'var(--dark-blue)',
                    fontFamily: 'monospace'
                  }}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
              )}

              <h4 className="mb-3">Карта питань</h4>
              <div className="q-map-grid mb-4">
                {testQuestions.map((_, idx) => {
                  let classes = "q-map-btn";
                  if (currentQuestionIndex === idx) classes += " current";
                  if (answers[idx] !== -1) classes += " answered";
                  
                  return (
                    <button key={idx} className={classes} onClick={() => setCurrentQuestionIndex(idx)}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              
              {mode === 'exam' && (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={finishTest} disabled={isSubmitting}>
                  {isSubmitting ? 'Збереження...' : 'Здати роботу'}
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .mode-card { padding: 40px 30px; text-align: center; cursor: pointer; height: 100%; }
        .mode-icon { font-size: 50px; margin-bottom: 20px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 900px; margin: 0 auto; }
        @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <section className="container mt-5 mb-5">
        <h2 className="text-center mb-3">Онлайн-тестування</h2>
        <p className="text-center mb-5" style={{ maxWidth: '800px', margin: '0 auto 50px' }}>
          Тестування є обов'язковим етапом для підтвердження кваліфікації. Усі питання розроблені на основі чинного професійного стандарту.
        </p>

        <div className="grid-2">
          <div className="card mode-card" onClick={() => startTest('training')}>
            <div className="mode-icon">📝</div>
            <h3>Тренувальний режим</h3>
            <p className="mb-4 text-muted">Усі запитання. Після кожної відповіді ви одразу бачите пояснення.</p>
            <div className="btn btn-outline">Почати тренування</div>
          </div>
          <div className="card mode-card" onClick={() => startTest('exam')}>
            <div className="mode-icon">🎯</div>
            <h3>Екзаменаційний режим</h3>
            <p className="mb-4 text-muted">60 запитань з таймером. Імітація реального іспиту без підказок (таймер - 60 хв).</p>
            <div className="btn btn-primary">Здати іспит</div>
          </div>
        </div>
      </section>
    </>
  );
};
