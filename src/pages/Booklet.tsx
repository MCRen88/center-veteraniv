import React from 'react';
import { Link } from 'react-router-dom';

export const Booklet: React.FC = () => {
  return (
    <div className="promo-banner-page">
      <style>{`
        /* ==================== РЕКЛАМНИЙ СТИЛЬНИЙ БАНЕР ЦЕНТРУ ==================== */
        .promo-banner-page {
          min-height: calc(100vh - 70px);
          background: #070f1e;
          background-image: 
            radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.4) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(217, 119, 6, 0.25) 0px, transparent 45%),
            radial-gradient(at 50% 100%, rgba(37, 99, 235, 0.3) 0px, transparent 50%);
          color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px 20px 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-showcase {
          max-width: 1160px;
          width: 100%;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          box-shadow: 
            0 25px 60px -15px rgba(0, 0, 0, 0.7),
            0 0 40px rgba(37, 99, 235, 0.15);
          overflow: hidden;
          position: relative;
        }

        /* Ambient Glow & Watermark */
        .banner-watermark {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 320px;
          height: 320px;
          opacity: 0.04;
          pointer-events: none;
          fill: #ffffff;
        }

        /* Top Bar */
        .banner-topbar {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 14px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .topbar-institution {
          font-family: 'Montserrat', sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .topbar-institution img {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
        }

        .topbar-badge {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.35);
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* Main Banner Content */
        .banner-body {
          padding: 44px 36px 36px;
        }

        .banner-hero-head {
          text-align: center;
          max-width: 860px;
          margin: 0 auto 36px;
        }

        .banner-slogan-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .banner-main-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 38px;
          font-weight: 800;
          line-height: 1.2;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .banner-main-title .gold-gradient {
          background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .banner-subtext {
          font-size: 17px;
          color: #cbd5e1;
          line-height: 1.5;
          max-width: 720px;
          margin: 0 auto;
        }

        /* Highlights Ticker */
        .banner-stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }

        .stat-badge {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          padding: 16px 14px;
          text-align: center;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
        }
        .stat-badge:hover {
          transform: translateY(-2px);
          border-color: rgba(56, 189, 248, 0.4);
          background: rgba(30, 58, 138, 0.15);
        }

        .stat-icon {
          font-size: 20px;
          margin-bottom: 6px;
        }

        .stat-value {
          font-family: 'Montserrat', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #fbbf24;
          margin-bottom: 3px;
        }

        .stat-desc {
          font-size: 12.5px;
          color: #94a3b8;
          font-weight: 500;
          line-height: 1.3;
        }

        /* 3-Column Promo Cards (Trifold Banner Aesthetic) */
        .promo-trifold {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 36px;
        }

        .promo-col {
          background: rgba(255, 255, 255, 0.03);
          border: 1.2px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.25s ease;
        }
        .promo-col:hover {
          border-color: rgba(245, 158, 11, 0.45);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 10px 30px -10px rgba(245, 158, 11, 0.15);
        }

        .promo-col-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .promo-col-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 58, 138, 0.4) 100%);
          border: 1px solid rgba(56, 189, 248, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .promo-col-icon.gold {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%);
          border-color: rgba(251, 191, 36, 0.4);
        }

        .tryzub-promo-svg {
          width: 20px;
          height: 20px;
          fill: #fbbf24;
        }

        .promo-col-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 15.5px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .promo-col-subtitle {
          font-size: 11.5px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .promo-col-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-grow: 1;
        }

        .promo-col-list li {
          font-size: 13.5px;
          color: #cbd5e1;
          line-height: 1.45;
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .list-dot {
          color: #38bdf8;
          font-weight: 800;
          font-size: 15px;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .list-dot.gold {
          color: #fbbf24;
        }

        /* Exam Pill inside middle column */
        .exam-mini-box {
          margin-top: 14px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .exam-mini-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #38bdf8;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
        }

        .exam-mini-items {
          font-size: 12px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }

        /* Bottom Action Bar */
        .banner-action-card {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1.5px solid rgba(59, 130, 246, 0.35);
          border-radius: 16px;
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .action-text h4 {
          font-family: 'Montserrat', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .action-text p {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .btn-cta-gold {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #0b1526;
          font-family: 'Montserrat', sans-serif;
          font-size: 14.5px;
          font-weight: 800;
          padding: 13px 26px;
          border-radius: 30px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-cta-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.6);
          color: #070f1e;
        }

        .action-contacts {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 13.5px;
          color: #cbd5e1;
        }

        .action-contacts a {
          color: #38bdf8;
          text-decoration: none;
          font-weight: 600;
        }
        .action-contacts a:hover {
          text-decoration: underline;
        }

        /* Legal / Certification Tag */
        .banner-footer-note {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .banner-stats-bar {
            grid-template-columns: repeat(2, 1fr);
          }
          .promo-trifold {
            grid-template-columns: 1fr;
          }
          .banner-main-title {
            font-size: 30px;
          }
        }

        @media (max-width: 768px) {
          .promo-banner-page {
            padding: 16px 10px;
          }
          .banner-body {
            padding: 24px 18px;
          }
          .banner-main-title {
            font-size: 24px;
          }
          .banner-subtext {
            font-size: 15px;
          }
          .banner-stats-bar {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .stat-badge {
            padding: 12px 8px;
          }
          .stat-value {
            font-size: 17px;
          }
          .banner-action-card {
            flex-direction: column;
            text-align: center;
            padding: 20px 16px;
          }
          .action-buttons {
            flex-direction: column;
            width: 100%;
          }
          .btn-cta-gold {
            width: 100%;
            justify-content: center;
          }
          .action-contacts {
            flex-direction: column;
            gap: 6px;
          }
          .action-contacts .contact-sep {
            display: none;
          }
        }
      `}</style>

      {/* SHOWCASE BANNER CARD */}
      <div className="banner-showcase">
        {/* Subtle Background Trident Watermark */}
        <svg className="banner-watermark" viewBox="-65 10 130 205">
          <path d="M5.985561 78.82382a104.079383 104.079383 0 0 0 14.053598 56.017033 55 55 0 0 1-13.218774 70.637179A20 20 0 0 0 0 212.5a20 20 0 0 0-6.820384-7.021968 55 55 0 0 1-13.218774-70.637179A104.079383 104.079383 0 0 0-5.98556 78.82382l-1.599642-45.260519A30.103986 30.103986 0 0 1 0 12.5a30.103986 30.103986 0 0 1 7.585202 21.063301zM5 193.624749a45 45 0 0 0 6.395675-53.75496A114.079383 114.079383 0 0 1 0 112.734179a114.079383 114.079383 0 0 1-11.395675 27.13561A45 45 0 0 0-5 193.624749V162.5H5z"/>
          <path id="tz_bg_wing" d="M27.779818 75.17546A62.64982 62.64982 0 0 1 60 27.5v145H0l-5-10a22.5 22.5 0 0 1 17.560976-21.95122l14.634147-3.292683a10 10 0 1 0-4.427443-19.503751zm5.998315 34.353887a20 20 0 0 1-4.387889 37.482848l-14.634146 3.292683A12.5 12.5 0 0 0 5 162.5h45V48.265462a52.64982 52.64982 0 0 0-12.283879 28.037802zM42 122.5h10v10H42z"/>
          <use href="#tz_bg_wing" transform="scale(-1 1)"/>
        </svg>

        {/* Top Header Bar */}
        <div className="banner-topbar">
          <div className="topbar-institution">
            <img src="/logo-zoippo.png" alt="КЗ «ЗОІППО» ЗОР" />
            <span>Комунальний заклад «Запорізький обласний інститут післядипломної педагогічної освіти» ЗОР</span>
          </div>
          <div className="topbar-badge">
            <span>🏛️</span> Офіційна кваліфікація
          </div>
        </div>

        {/* Main Body */}
        <div className="banner-body">
          {/* Hero Section */}
          <div className="banner-hero-head">
            <div className="banner-slogan-eyebrow">
              <span>★</span> Ваш досвід — ваша офіційна кваліфікація
            </div>
            <h1 className="banner-main-title">
              Кваліфікаційний центр<br />
              <span className="gold-gradient">сертифікації фахівців</span> із супроводу ветеранів
            </h1>
            <p className="banner-subtext">
              Фахова підготовка на базі інституту або пряме оцінювання наявного практичного досвіду. 
              Отримайте сертифікат державного зразка за професійним стандартом Мінветеранів.
            </p>
          </div>

          {/* Quick Stats Highlights */}
          <div className="banner-stats-bar">
            <div className="stat-badge">
              <div className="stat-icon">🎓</div>
              <div className="stat-value">База ЗОІППО</div>
              <div className="stat-desc">Фахова підготовка або оцінювання за наявним досвідом</div>
            </div>

            <div className="stat-badge">
              <div className="stat-icon">⏱️</div>
              <div className="stat-value">150 хвилин</div>
              <div className="stat-desc">Оцінювання: 90 хв теорія (тести) + 60 хв практика (кейси)</div>
            </div>

            <div className="stat-badge">
              <div className="stat-icon">🌐</div>
              <div className="stat-value">Zoom / Очно</div>
              <div className="stat-desc">Онлайн для всієї України або очно в м.&nbsp;Запоріжжя</div>
            </div>

            <div className="stat-badge">
              <div className="stat-icon">📜</div>
              <div className="stat-value">5 днів</div>
              <div className="stat-desc">Видача державного сертифіката та реєстрація в базі</div>
            </div>
          </div>

          {/* 3-Column Promo Trifold Presentation */}
          <div className="promo-trifold">
            {/* Column 1: Хто ви? */}
            <div className="promo-col">
              <div className="promo-col-top">
                <div className="promo-col-icon gold">
                  <svg className="tryzub-promo-svg" viewBox="-65 10 130 205">
                    <path d="M5.985561 78.82382a104.079383 104.079383 0 0 0 14.053598 56.017033 55 55 0 0 1-13.218774 70.637179A20 20 0 0 0 0 212.5a20 20 0 0 0-6.820384-7.021968 55 55 0 0 1-13.218774-70.637179A104.079383 104.079383 0 0 0-5.98556 78.82382l-1.599642-45.260519A30.103986 30.103986 0 0 1 0 12.5a30.103986 30.103986 0 0 1 7.585202 21.063301zM5 193.624749a45 45 0 0 0 6.395675-53.75496A114.079383 114.079383 0 0 1 0 112.734179a114.079383 114.079383 0 0 1-11.395675 27.13561A45 45 0 0 0-5 193.624749V162.5H5z"/>
                    <path id="tz_col1" d="M27.779818 75.17546A62.64982 62.64982 0 0 1 60 27.5v145H0l-5-10a22.5 22.5 0 0 1 17.560976-21.95122l14.634147-3.292683a10 10 0 1 0-4.427443-19.503751zm5.998315 34.353887a20 20 0 0 1-4.387889 37.482848l-14.634146 3.292683A12.5 12.5 0 0 0 5 162.5h45V48.265462a52.64982 52.64982 0 0 0-12.283879 28.037802zM42 122.5h10v10H42z"/>
                    <use href="#tz_col1" transform="scale(-1 1)"/>
                  </svg>
                </div>
                <div>
                  <h3 className="promo-col-title">Цільова аудиторія</h3>
                  <div className="promo-col-subtitle">Принцип «Рівний — рівному»</div>
                </div>
              </div>

              <ul className="promo-col-list">
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Ветерани та члени родин:</strong> отримання офіційного фаху для підтримки побратимів у громаді.</div>
                </li>
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Практики та психологи:</strong> легалізація волонтерського або соціального стажу державним дипломом.</div>
                </li>
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Діючі фахівці:</strong> підвищення категорії до I, II кат. або провідного фахівця (6–7 рівні НРК).</div>
                </li>
              </ul>
            </div>

            {/* Column 2: Як це відбувається? */}
            <div className="promo-col">
              <div className="promo-col-top">
                <div className="promo-col-icon">
                  <span>🚀</span>
                </div>
                <div>
                  <h3 className="promo-col-title">Формат та регламент</h3>
                  <div className="promo-col-subtitle">Зручно • Прозоро • Онлайн</div>
                </div>
              </div>

              <ul className="promo-col-list">
                <li>
                  <span className="list-dot">✓</span>
                  <div><strong>Підготовка в інституті:</strong> можливість пройти фаховий курс на базі ЗОІППО перед складанням іспиту.</div>
                </li>
                <li>
                  <span className="list-dot">✓</span>
                  <div><strong>Подання заяви за 5 хв:</strong> повністю онлайн через портал із накладанням КЕП.</div>
                </li>
                <li>
                  <span className="list-dot">✓</span>
                  <div><strong>Дистанційний іспит Zoom:</strong> складайте з будь-якого міста України або очно в Центрі (м.&nbsp;Запоріжжя).</div>
                </li>
              </ul>

              <div className="exam-mini-box">
                <div className="exam-mini-title">
                  <span>⏱️ Структура іспиту (150 хв)</span>
                  <span style={{ color: '#fbbf24' }}>≥ 75%</span>
                </div>
                <div className="exam-mini-items">
                  <span>📝 Теорія (100 тестів)</span>
                  <span>💼 Практика (10 кейсів)</span>
                </div>
              </div>
            </div>

            {/* Column 3: Що ви отримуєте? */}
            <div className="promo-col">
              <div className="promo-col-top">
                <div className="promo-col-icon gold">
                  <span>🛡️</span>
                </div>
                <div>
                  <h3 className="promo-col-title">Державні гарантії</h3>
                  <div className="promo-col-subtitle">Легітимність • Фінансування</div>
                </div>
              </div>

              <ul className="promo-col-list">
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Офіційний сертифікат:</strong> визнання кваліфікації за стандартом Мінветеранів.</div>
                </li>
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Миттєва верифікація:</strong> кожен документ перевіряється в онлайн-реєстрі Центру за номером.</div>
                </li>
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Державне фінансування:</strong> можливість компенсації вартості за Постановою КМУ №&nbsp;1595.</div>
                </li>
                <li>
                  <span className="list-dot gold">✓</span>
                  <div><strong>Академічна якість:</strong> провідні експерти інституту, прозорі критерії оцінки та право на апеляцію.</div>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Call-to-Action Card */}
          <div className="banner-action-card">
            <div className="action-text">
              <h4>Готові підтвердити свій фах та отримати сертифікат?</h4>
              <p>Подайте електронну заяву через КЕП в один клік або зверніться за консультацією.</p>
            </div>

            <div className="action-buttons">
              <Link to="/application" className="btn-cta-gold">
                <span>📝</span> Подати онлайн-заяву
              </Link>

              <div className="action-contacts">
                <span>📞 <a href="tel:0617171772">(061) 717-17-72</a></span>
                <span className="contact-sep">•</span>
                <span>📱 <a href="tel:0964772017">096 477 20 17</a></span>
              </div>
            </div>
          </div>

          {/* Legal Note */}
          <div className="banner-footer-note">
            Діє на підставі Положення про Центр (протокол Вченої ради №&nbsp;6 від 26.06.2026&nbsp;р.),<br />
            постанови КМУ №&nbsp;956 та Закону України «Про&nbsp;освіту».
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booklet;
