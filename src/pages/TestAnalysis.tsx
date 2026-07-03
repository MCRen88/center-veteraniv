import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { speakText, stopSpeaking } from '../utils/tts';

interface QuestionDetail {
  id?: number;
  question: string;
  catId?: string;
  catName?: string;
  options: string[];
  correct: number;
  selected: number;
  timeSpent: number;
  changes: number;
  explanation?: string;
}

interface BehaviorProfile {
  style: string;
  confidence: string;
  speedCategory: string;
  description: string;
  strengths?: string[];
  weaknesses?: string[];
  forecast: string;
  recommendations: string;
}

interface TestScoreDetails {
  questions?: QuestionDetail[];
  totalTime: number;
  tabSwitches: number;
  behaviorProfile?: BehaviorProfile;
}

interface TestScore {
  id: string;
  user_id: string;
  score: number;
  total: number;
  passed: boolean;
  mode: string;
  created_at: string;
  details: TestScoreDetails | null;
}

export const TestAnalysis: React.FC = () => {
  const { scoreId } = useParams<{ scoreId: string }>();
  const navigate = useNavigate();
  useAppContext(); // Ensure context is loaded if needed
  
  const [score, setScore] = useState<TestScore | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleSpeakQuestion = (idx: number, q: QuestionDetail) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
    } else {
      // Build text representation
      const letters = ['А', 'Б', 'В', 'Г', 'Д'];
      const optionsText = q.options?.map((opt: string, oIdx: number) => `Варіант ${letters[oIdx] || (oIdx + 1)}: ${opt}`).join('. ') || '';
      
      const isCorrect = Number(q.selected) === Number(q.correct);
      const selectedText = q.selected !== -1 && q.options && q.options[q.selected]
        ? `Ваша відповідь: Варіант ${letters[q.selected] || (q.selected + 1)}, ${q.options[q.selected]}.`
        : 'Ви не відповіли на це питання.';
        
      const correctText = q.options && q.options[q.correct]
        ? `Правильна відповідь: Варіант ${letters[q.correct] || (q.correct + 1)}, ${q.options[q.correct]}.`
        : '';
        
      const resultStatusText = isCorrect ? 'Це правильна відповідь.' : `Це неправильна відповідь. ${correctText}`;
      const explanationText = q.explanation ? `Обґрунтування відповіді: ${q.explanation}` : '';
      
      const textToSpeak = `Запитання ${idx + 1}: ${q.question}. ${optionsText}. ${selectedText} ${resultStatusText} ${explanationText}`;
      
      speakText(
        textToSpeak,
        () => setSpeakingIdx(idx),
        () => setSpeakingIdx(null)
      );
    }
  };

  useEffect(() => {
    const fetchScoreDetails = async () => {
      if (!scoreId) return;
      setLoading(true);
      setError(null);
      
      try {
        const { data: scoreData, error: scoreErr } = await supabase
          .from('test_scores')
          .select('*')
          .eq('id', scoreId)
          .single();

        if (scoreErr) {
          throw new Error(scoreErr.message);
        }

        if (scoreData) {
          setScore(scoreData as TestScore);
          
          // Fetch user profile name
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', scoreData.user_id)
            .single();
            
          if (!profileErr && profileData) {
            setUserName(profileData.name);
          } else {
            setUserName('Невідомий користувач');
          }
        } else {
          setError('Спробу тестування не знайдено.');
        }
      } catch (err: unknown) {
        console.error('Помилка при завантаженні аналізу:', err);
        setError('Не вдалося завантажити деталі спроби тестування.');
      } finally {
        setLoading(false);
      }
    };

    fetchScoreDetails();
  }, [scoreId]);

  const formatTime = (seconds: number) => {
    if (!seconds && seconds !== 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} хв ${s} с` : `${s} с`;
  };

  if (loading) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <div style={{ display: 'inline-block', width: '50px', height: '50px', border: '5px solid var(--bg-light)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p className="mt-3">Завантаження аналізу спроби...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="container mt-5 mb-5 text-center">
        <div style={{ fontSize: '50px', marginBottom: '20px' }}>⚠️</div>
        <h3>Помилка</h3>
        <p className="mt-2 mb-4 text-muted">{error || 'Виникла невідома помилка.'}</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Повернутися назад</button>
      </div>
    );
  }

  const percentage = Math.round((score.score / score.total) * 100);
  const passed = score.passed;
  const details = score.details;

  return (
    <>
      <style>{`
        .analysis-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .back-button-container {
          margin-bottom: 25px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }

        .stat-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: var(--white);
          border: 1px solid rgba(81, 144, 207, 0.15);
          border-radius: var(--radius-md);
          padding: 20px;
          text-align: center;
          box-shadow: var(--shadow-card);
        }

        .stat-card-icon {
          font-size: 28px;
          display: block;
          margin-bottom: 8px;
        }

        .stat-card-value {
          font-family: 'Comfortaa', cursive;
          font-size: 22px;
          font-weight: 700;
          color: var(--dark-blue);
          margin-bottom: 4px;
        }

        .stat-card-label {
          font-size: 12px;
          color: var(--text-muted);
        }

        .profile-card {
          border-left: 5px solid var(--rich-blue) !important;
          background: var(--white);
          margin-bottom: 30px;
        }

        .profile-title {
          font-size: 16px;
          color: var(--dark-blue);
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }

        .profile-badges {
          display: flex;
          gap: 12px;
          margin: 15px 0;
          flex-wrap: wrap;
        }

        .profile-badge {
          font-size: 12px;
          font-weight: bold;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .badge-style { background: #e3f2fd; color: #1976d2; }
        .badge-conf { background: #e8f5e9; color: #2e7d32; }
        .badge-speed { background: #fff3e0; color: #e65100; }

        .profile-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-body);
          margin-bottom: 20px;
        }

        .strengths-weaknesses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .strengths-column h5 { color: #2e7d32; font-size: 13px; font-weight: bold; }
        .weaknesses-column h5 { color: #c62828; font-size: 13px; font-weight: bold; }

        .profile-list {
          padding-left: 15px;
          margin: 0;
          list-style-type: disc;
          font-size: 13px;
          color: var(--text-body);
        }

        .profile-list li {
          margin-bottom: 4px;
        }

        .profile-block {
          border-radius: var(--radius-sm);
          padding: 12px 15px;
          margin-bottom: 12px;
        }

        .profile-block-forecast {
          background: #f0f4f8;
          border-left: 4px solid var(--blue);
        }

        .profile-block-recommendations {
          background: #f2faf4;
          border-left: 4px solid #2ecc71;
        }

        .block-title {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          display: block;
          margin-bottom: 4px;
        }

        .block-desc {
          font-size: 13px;
          margin: 0;
        }

        .question-card {
          background: var(--white);
          border-radius: var(--radius-md);
          padding: 25px;
          margin-bottom: 20px;
          box-shadow: var(--shadow-card);
          border: 1px solid rgba(81, 144, 207, 0.1);
        }

        .question-card.correct-card {
          border-left: 5px solid #2ecc71;
        }

        .question-card.incorrect-card {
          border-left: 5px solid #e74c3c;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .question-num {
          font-family: 'Comfortaa', cursive;
          font-size: 16px;
          font-weight: 700;
          color: var(--dark-blue);
        }

        .question-badges {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .badge-cat {
          background: #e2e8f0;
          color: #4a5568;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: bold;
          border-radius: 4px;
        }

        .badge-info-meta {
          background: #f0f4f8;
          color: #64748b;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 4px;
        }

        .badge-result {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .badge-result-correct {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .badge-result-incorrect {
          background: #fce8e6;
          color: #c62828;
        }

        .question-text {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.5;
          color: var(--text-dark);
          margin-bottom: 18px;
        }

        .options-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .option-item {
          padding: 12px 15px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          line-height: 1.4;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid #edf2f7;
        }

        .option-item-default {
          background: #fcfdfe;
          color: var(--text-body);
        }

        .option-item-correct-only {
          border-color: #c6f6d5;
          background: #f0fff4;
          color: #22543d;
          font-weight: 500;
        }

        .option-item-selected-correct {
          border-color: #38a169;
          background: #e6fffa;
          color: #234e52;
          font-weight: 600;
        }

        .option-item-selected-incorrect {
          border-color: #feb2b2;
          background: #fff5f5;
          color: #742a2a;
          font-weight: 600;
        }

        .explanation-box {
          margin-top: 15px;
          background: #f7fafc;
          border-top: 1px dashed #e2e8f0;
          padding-top: 12px;
          font-size: 13px;
          color: #4a5568;
          line-height: 1.5;
        }
      `}</style>

      <section className="container mt-5 mb-5 analysis-container">
        <div className="back-button-container">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            ← Назад до результатів
          </button>
        </div>

        <div className="card mb-4">
          <h2 style={{ fontFamily: 'Comfortaa, sans-serif' }}>Аналіз спроби тестування</h2>
          <p className="text-muted">Детальний звіт про теоретичне оцінювання знань професійного стандарту.</p>
          
          <div className="meta-grid" style={{ marginTop: '20px' }}>
            <div>
              <span className="text-muted" style={{ fontSize: '12px' }}>Кандидат:</span>
              <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '16px', color: 'var(--text-dark)' }}>{userName}</p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '12px' }}>Дата спроби:</span>
              <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '16px', color: 'var(--text-dark)' }}>
                {new Date(score.created_at).toLocaleString('uk-UA')}
              </p>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '12px' }}>Режим тестування:</span>
              <p style={{ fontWeight: 'bold', margin: '2px 0 0', fontSize: '16px', color: 'var(--text-dark)' }}>
                {score.mode === 'exam' ? '🎯 Екзамен (Іспит)' : '📝 Тренування'}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card-grid">
          <div className="stat-card">
            <span className="stat-card-icon">🎯</span>
            <div className="stat-card-value">{score.score} / {score.total}</div>
            <div style={{ marginBottom: '8px' }}>
              <span className={`badge-result ${passed ? 'badge-result-correct' : 'badge-result-incorrect'}`}>
                {passed ? 'Складено' : 'Не складено'}
              </span>
            </div>
            <div className="stat-card-label">Оцінка ({percentage}%)</div>
          </div>

          <div className="stat-card">
            <span className="stat-card-icon">⏱️</span>
            <div className="stat-card-value">
              {details && details.totalTime ? formatTime(details.totalTime) : '-'}
            </div>
            <div className="stat-card-label" style={{ marginTop: '23px' }}>Загальний час</div>
          </div>

          <div className="stat-card">
            <span className="stat-card-icon">🔄</span>
            <div className="stat-card-value">
              {details && details.questions ? details.questions.reduce((acc: number, q: QuestionDetail) => acc + (q.changes || 0), 0) : 0}
            </div>
            <div className="stat-card-label" style={{ marginTop: '23px' }}>Змін відповідей</div>
          </div>

          <div className="stat-card" style={{ background: details && details.tabSwitches > 0 ? '#fdf2f2' : '' }}>
            <span className="stat-card-icon">⚠️</span>
            <div className="stat-card-value" style={{ color: details && details.tabSwitches > 0 ? '#c0392b' : '' }}>
              {details ? details.tabSwitches : 0}
            </div>
            <div className="stat-card-label" style={{ color: details && details.tabSwitches > 0 ? '#c0392b' : '', marginTop: '23px' }}>
              Перемикань вкладок
            </div>
          </div>
        </div>

        {/* PSYCHOMETRIC PORTRAIT / BEHAVIORAL PROFILE */}
        {details && details.behaviorProfile && (
          <div className="card profile-card">
            <h4 className="profile-title">
              🧠 Психометричний портрет кандидата
            </h4>
            
            <div className="profile-badges">
              <div className="profile-badge badge-style">
                Манера: {details.behaviorProfile.style}
              </div>
              <div className="profile-badge badge-conf">
                Впевненість: {details.behaviorProfile.confidence}
              </div>
              <div className="profile-badge badge-speed">
                Темп: {details.behaviorProfile.speedCategory}
              </div>
            </div>

            <p className="profile-text">
              {details.behaviorProfile.description}
            </p>

            <div className="strengths-weaknesses-grid">
              <div className="strengths-column">
                <h5>✓ Сильні сторони манери:</h5>
                <ul className="profile-list">
                  {details.behaviorProfile.strengths?.map((str: string, i: number) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>
              <div className="weaknesses-column">
                <h5>✗ Зони ризику / Слабкості:</h5>
                <ul className="profile-list">
                  {details.behaviorProfile.weaknesses?.map((weak: string, i: number) => (
                    <li key={i}>{weak}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="profile-block profile-block-forecast">
              <span className="block-title" style={{ color: 'var(--rich-blue)' }}>
                🔮 Прогноз професійної успішності:
              </span>
              <p className="block-desc" style={{ fontWeight: '500', color: 'var(--text-dark)' }}>
                {details.behaviorProfile.forecast}
              </p>
            </div>

            <div className="profile-block profile-block-recommendations">
              <span className="block-title" style={{ color: '#27ae60' }}>
                💡 Рекомендації для кандидата:
              </span>
              <p className="block-desc" style={{ color: 'var(--text-dark)' }}>
                {details.behaviorProfile.recommendations}
              </p>
            </div>
          </div>
        )}

        <h3 className="mb-4" style={{ fontFamily: 'Comfortaa, sans-serif' }}>
          📋 Детальний розбір відповідей по кожному питанню
        </h3>

        {!details || !details.questions || details.questions.length === 0 ? (
          <div className="alert alert-info">
            <strong>Детальна статистика відповідей відсутня.</strong>
            <p className="mt-1 mb-0">Ця спроба була пройдена до оновлення системи. Детальні відповіді по кожному питанню для неї не були збережені.</p>
          </div>
        ) : (
          <div>
            {details.questions.map((q: QuestionDetail, idx: number) => {
              const isCorrect = Number(q.selected) === Number(q.correct);
              return (
                <div key={idx} className={`question-card ${isCorrect ? 'correct-card' : 'incorrect-card'}`}>
                  <div className="question-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span className="question-num">Запитання {idx + 1}</span>
                      <button
                        className={`btn ${speakingIdx === idx ? 'btn-danger tts-speaking' : 'btn-outline'}`}
                        onClick={() => handleSpeakQuestion(idx, q)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          lineHeight: 1,
                          transition: 'all 0.2s ease-in-out'
                        }}
                        title={speakingIdx === idx ? "Зупинити озвучування" : "Озвучити запитання, варіанти відповідей та обґрунтування"}
                      >
                        {speakingIdx === idx ? (
                          <>⏹️ Зупинити</>
                        ) : (
                          <>🔊 Озвучити</>
                        )}
                      </button>
                    </div>
                    <div className="question-badges">
                      <span className="badge-cat">
                        Функція {q.catId || q.catName?.split('.')[0] || 'Тест'}
                      </span>
                      <span className="badge-info-meta">⏱️ {formatTime(q.timeSpent)}</span>
                      <span className="badge-info-meta">🔄 Змін: {q.changes || 0}</span>
                      <span className={`badge-result ${isCorrect ? 'badge-result-correct' : 'badge-result-incorrect'}`}>
                        {isCorrect ? 'Правильно' : 'Неправильно'}
                      </span>
                    </div>
                  </div>

                  <div className="question-text">{q.question}</div>

                  <div className="options-list">
                    {q.options?.map((opt: string, optIdx: number) => {
                      let itemClass = "option-item option-item-default";
                      let indicator = "○";
                      
                      const isOptionCorrect = optIdx === Number(q.correct);
                      const isOptionSelected = optIdx === Number(q.selected);

                      if (isOptionCorrect) {
                        if (isOptionSelected) {
                          itemClass = "option-item option-item-selected-correct";
                          indicator = "🟢";
                        } else {
                          itemClass = "option-item option-item-correct-only";
                          indicator = "✓";
                        }
                      } else if (isOptionSelected) {
                        itemClass = "option-item option-item-selected-incorrect";
                        indicator = "🔴";
                      }

                      return (
                        <div key={optIdx} className={itemClass}>
                          <span style={{ fontSize: '16px', userSelect: 'none' }}>{indicator}</span>
                          <div>
                            <strong>{String.fromCharCode(65 + optIdx)})</strong> {opt}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show explanation always since it helps analysis */}
                  {q.explanation && (
                    <div className="explanation-box">
                      <strong>Обґрунтування відповіді:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};
