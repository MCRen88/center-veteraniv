import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  const [calcLevel, setCalcLevel] = useState('Фахівець із супроводу');
  const [calcField, setCalcField] = useState('А «Освіта»');
  const [calcEdu, setCalcEdu] = useState('Бакалавр');
  const [calcExp, setCalcExp] = useState(0);
  const [calcResult, setCalcResult] = useState<{status: 'success'|'error', text: string} | null>(null);

  const checkCompliance = () => {
    let requiredExp = 0;
    
    if (calcLevel === "Фахівець II категорії") requiredExp = 1;
    if (calcLevel === "Фахівець I категорії") requiredExp = 2; // спрощено
    if (calcLevel === "Провідний фахівець") requiredExp = 3;

    if (calcLevel === "Провідний фахівець" && calcEdu !== "Магістр") {
        setCalcResult({
            status: 'error',
            text: "Невідповідність: Для провідного фахівця потрібен рівень Магістра."
        });
        return;
    }

    if (calcExp < requiredExp) {
        setCalcResult({
            status: 'error',
            text: `Невідповідність: Недостатній стаж роботи. Потрібно мінімум ${requiredExp} рік/років.`
        });
        return;
    }

    setCalcResult({
        status: 'success',
        text: "Відповідає вимогам! Ви можете подавати заяву на сертифікацію."
    });
  };

  return (
    <div className="home-page">
      <style>{`
        .hero {
            position: relative;
            background: linear-gradient(135deg, var(--dark-blue) 0%, var(--rich-blue) 35%, var(--blue) 65%, var(--light-blue) 100%);
            padding: 80px 0;
            color: var(--white);
            overflow: hidden;
            text-align: center;
        }
        
        .hero::before, .hero::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
        }
        
        .hero::before {
            width: 300px;
            height: 300px;
            top: -100px;
            left: -100px;
        }
        
        .hero::after {
            width: 400px;
            height: 400px;
            bottom: -150px;
            right: -150px;
        }

        .hero-content {
            position: relative;
            z-index: 2;
            max-width: 800px;
            margin: 0 auto;
        }

        .hero-logo {
            width: 110px;
            height: 110px;
            margin-bottom: 20px;
            background: white;
            border-radius: 50%;
            padding: 0;
            object-fit: cover;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .hero-institution {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            opacity: 0.9;
        }

        .hero-title {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 30px;
            color: var(--white);
        }

        .hero-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
        }

        @media (max-width: 768px) {
            .hero-title { font-size: 28px; }
            .hero-buttons { flex-direction: column; }
        }

        .grid-4 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }

        .feature-icon {
            font-size: 40px;
            margin-bottom: 15px;
        }
        
        /* TIMELINE */
        .timeline {
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: relative;
            padding-left: 40px;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--light-blue);
        }

        .timeline-step {
            position: relative;
            background: var(--white);
            padding: 20px;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-card);
        }

        .timeline-step::before {
            content: attr(data-step);
            position: absolute;
            left: -55px;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            background: var(--rich-blue);
            color: var(--white);
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            font-family: 'Comfortaa', cursive;
            border: 3px solid var(--bg-light);
        }

        /* TABLE */
        .qual-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--white);
            border-radius: var(--radius-md);
            overflow: hidden;
            box-shadow: var(--shadow-card);
        }

        .qual-table th, .qual-table td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        .qual-table th {
            background-color: var(--dark-blue);
            color: var(--white);
            font-family: 'Comfortaa', cursive;
            font-weight: 500;
        }

        .qual-table tr:last-child td {
            border-bottom: none;
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="container hero-content">
          <img src="/logo-zoippo.png" alt="ЗОІППО" className="hero-logo" />
          <div className="hero-institution">Комунальний заклад «Запорізький обласний інститут післядипломної педагогічної освіти» Запорізької обласної ради</div>
          <h1 className="hero-title">Кваліфікаційний центр сертифікації фахівців із супроводу ветеранів</h1>
          <div className="hero-buttons">
            <Link to="/test" className="btn btn-secondary">Пройти тестування</Link>
            <Link to="/application" className="btn btn-secondary">Подати заяву</Link>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="container mt-5 mb-5">
        <h2 className="text-center mb-4">Про центр</h2>
        <div className="grid-4">
          <div className="card text-center">
            <div className="feature-icon">🏛️</div>
            <h3>Акредитований центр</h3>
            <p>Діємо на підставі акредитації Національного агентства кваліфікацій.</p>
          </div>
          <div className="card text-center">
            <div className="feature-icon">📋</div>
            <h3>Сертифікація за профстандартом</h3>
            <p>Оцінювання здійснюється за професійним стандартом від Мінветеранів.</p>
          </div>
          <div className="card text-center">
            <div className="feature-icon">🎓</div>
            <h3>Кваліфіковані експерти</h3>
            <p>Оцінювання проводять експерти з практичним досвідом психосоціальної підтримки.</p>
          </div>
          <div className="card text-center">
            <div className="feature-icon">🤝</div>
            <h3>Супровід ветеранів</h3>
            <p>Наша місія — забезпечення якості надання послуг ветеранам та їхнім родинам.</p>
          </div>
        </div>
      </section>

      {/* HOW TO SECTION */}
      <section className="container mb-5">
        <h2 className="text-center mb-4">Як отримати сертифікат</h2>
        <div className="timeline">
          <div className="timeline-step" data-step="1">
            <h4>Подання заяви та документів</h4>
            <p>Кандидат подає онлайн-заяву з копіями документів про освіту та стаж.</p>
          </div>
          <div className="timeline-step" data-step="2">
            <h4>Попередня співбесіда з кандидатом</h4>
            <p>Зустріч з експертами для визначення готовності до оцінювання.</p>
          </div>
          <div className="timeline-step" data-step="3">
            <h4>Рішення про допуск</h4>
            <p>Центр приймає офіційне рішення про допуск до процедури оцінювання.</p>
          </div>
          <div className="timeline-step" data-step="4">
            <h4>Узгодження дати, часу та оплати</h4>
            <p>Підписання договору та узгодження графіка оцінювання.</p>
          </div>
          <div className="timeline-step" data-step="5">
            <h4>Проведення оцінювання (КОМ)</h4>
            <p>Кандидат складає теоретичне тестування та виконує практичне завдання.</p>
          </div>
          <div className="timeline-step" data-step="6">
            <h4>Видача сертифіката</h4>
            <p>Протягом 5 днів після успішного оцінювання видається сертифікат, а дані вносяться до Реєстру.</p>
          </div>
        </div>
      </section>

      {/* QUALIFICATIONS & CALCULATOR */}
      <section className="container mb-5">
        <h2 className="text-center mb-4">Вимоги до кваліфікацій</h2>
        
        <div className="table-responsive">
          <table className="qual-table mb-4">
            <thead>
              <tr>
                <th>Назва кваліфікації</th>
                <th>Рівень НРК</th>
                <th>Вимоги до освіти</th>
                <th>Вимоги до стажу</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Фахівець із супроводу</td>
                <td>6</td>
                <td>Бакалавр</td>
                <td>Без вимог</td>
              </tr>
              <tr>
                <td>Фахівець II категорії</td>
                <td>6</td>
                <td>Бакалавр</td>
                <td>1 рік</td>
              </tr>
              <tr>
                <td>Фахівець I категорії</td>
                <td>6</td>
                <td>Бакалавр</td>
                <td>2-3 роки</td>
              </tr>
              <tr>
                <td>Провідний фахівець</td>
                <td>7</td>
                <td>Магістр</td>
                <td>За посадовою інструкцією (від 3 років)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 className="text-center mb-3">Калькулятор відповідності</h3>
          <p className="text-center mb-4">Перевірте, чи відповідаєте ви вимогам професійного стандарту для бажаної категорії.</p>
          
          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Рівень кваліфікації</label>
              <select className="form-control" value={calcLevel} onChange={e => setCalcLevel(e.target.value)}>
                <option>Фахівець із супроводу</option>
                <option>Фахівець II категорії</option>
                <option>Фахівець I категорії</option>
                <option>Провідний фахівець</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Галузь знань</label>
              <select className="form-control" value={calcField} onChange={e => setCalcField(e.target.value)}>
                <option>А «Освіта»</option>
                <option>В «Культура, мистецтво та гуманітарні науки»</option>
                <option>С «Соціальні науки, журналістика та інформація»</option>
                <option>D «Бізнес, адміністрування та право»</option>
                <option>F «Інформаційні технології»</option>
                <option>G «Інженерія, виробництво та будівництво»</option>
                <option>I «Охорона здоров'я та соціальне забезпечення»</option>
                <option>J «Транспорт та послуги»</option>
                <option>К «Безпека та оборона»</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Рівень вищої освіти</label>
              <select className="form-control" value={calcEdu} onChange={e => setCalcEdu(e.target.value)}>
                <option>Бакалавр</option>
                <option>Магістр</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Стаж роботи (років)</label>
              <input type="number" className="form-control" min="0" value={calcExp} onChange={e => setCalcExp(Number(e.target.value))} />
            </div>
          </div>
          
          <div className="text-center mt-3 mb-3">
            <button className="btn btn-primary" onClick={checkCompliance}>Перевірити відповідність</button>
          </div>
          
          {calcResult && (
            <div className={`alert ${calcResult.status === 'success' ? 'alert-success' : 'alert-danger'} mt-3`}>
              <strong>{calcResult.status === 'success' ? '✓' : '✗'}</strong> {calcResult.text}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
