import React, { useState } from 'react';

export const Docs: React.FC = () => {
  const [openDoc, setOpenDoc] = useState<number | null>(null);

  const toggleDoc = (id: number) => {
    setOpenDoc(openDoc === id ? null : id);
  };

  const docs = [
    {
      id: 1,
      icon: "📜",
      title: "Постанова КМУ №986",
      subtitle: "від 22 вересня 2021 р.",
      desc: "Деякі питання акредитації кваліфікаційних центрів.",
      full: "Ця постанова визначає правові та організаційні засади створення, функціонування та акредитації кваліфікаційних центрів Національним агентством кваліфікацій. Регламентує процедуру надання права на присвоєння та підтвердження професійних кваліфікацій, вимоги до матеріально-технічної бази, кадрового забезпечення та процедур оцінювання.",
      pdfUrl: "https://zakon.rada.gov.ua/laws/show/986-2021-%D0%BF#Text"
    },
    {
      id: 2,
      icon: "📜",
      title: "Постанова КМУ №956",
      subtitle: "від 15 вересня 2021 р.",
      desc: "Порядок присвоєння та підтвердження професійних кваліфікацій.",
      full: "Визначає процедуру взаємодії здобувача з кваліфікаційним центром, етапи подання заяви, проходження попередньої співбесіди, процедури теоретичного та практичного оцінювання, а також порядок видачі та реєстрації сертифікатів про присвоєння кваліфікації.",
      pdfUrl: "https://zakon.rada.gov.ua/laws/show/956-2021-%D0%BF#Text"
    },
    {
      id: 3,
      icon: "📜",
      title: "Професійний стандарт",
      subtitle: "Наказ Мінветеранів №835 від 10.10.2025 р.",
      desc: "Фахівець із супроводу ветеранів війни та демобілізованих осіб.",
      full: "Визначає 8 ключових трудових функцій фахівця (організація роботи, ведення обліку, консультування, допомога в отриманні послуг, взаємодія з органами влади тощо), вимоги до освіти, стажу роботи, кваліфікаційних рівнів та регулярного підвищення кваліфікації.",
      pdfUrl: "https://register.nqa.gov.ua/"
    },
    {
      id: 4,
      icon: "📜",
      title: "Положення про ОМЦ ЗОІППО",
      subtitle: "Затверджено рішенням Вченої ради від 26.06.2026 р. (протокол № 6)",
      desc: "Положення про Організаційно-методичний центр КЗ «ЗОІППО» ЗОР.",
      full: "Це Положення визначає правовий статус, мету, завдання, напрями діяльності та функції Організаційно-методичного центру (Центру) як структурного підрозділу КЗ «ЗОІППО» ЗОР.\n\n" +
            "Основні функції та завдання Центру включають:\n" +
            "• Організаційно-методичний та кадровий супровід діяльності Інституту.\n" +
            "• Проведення процедури оцінювання та визнання результатів навчання, присвоєння та/або підтвердження професійних кваліфікацій, здобутих шляхом неформальної та інформальної освіти.\n" +
            "• Видача відповідних документів (сертифікатів) про присвоєння професійних кваліфікацій.\n" +
            "• Забезпечення розвитку кадрового потенціалу та супровід ключових управлінських процесів.",
      pdfUrl: "/docs/Положення  ОМЦ 2026.pdf"
    },
    {
      id: 5,
      icon: "📜",
      title: "Порядок присвоєння кваліфікацій",
      subtitle: "Введено в дію наказом ректора КЗ «ЗОІППО» ЗОР",
      desc: "Порядок присвоєння (підтвердження) професійних кваліфікацій Центром.",
      full: "Цей документ визначає процедуру присвоєння та/або підтвердження професійних кваліфікацій Організаційно-методичним центром КЗ «ЗОІППО» ЗОР за професійним стандартом «Фахівець із супроводу ветеранів війни та демобілізованих осіб».\n\n" +
            "Він регламентує:\n" +
            "• Порядок звернення здобувачів та перелік необхідних документів.\n" +
            "• Процедуру теоретичного та практичного оцінювання.\n" +
            "• Прийняття рішень про присвоєння/підтвердження професійної кваліфікації.\n" +
            "• Порядок видачі та реєстрації сертифікатів.",
      pdfUrl: "/docs/Порядок присвоєння професійних кваліфікацій ЗОІППО.pdf"
    },
    {
      id: 6,
      icon: "🏢",
      title: "Технічні вимоги",
      subtitle: "Матеріально-технічна база кваліфікаційного центру",
      desc: "Вимоги до приміщень, обладнання та робочих місць для оцінювання.",
      full: "Згідно з Постановою № 986 та вимогами Національного агентства кваліфікацій, матеріально-технічне забезпечення включає:\n\n" +
            "• Приміщення: Наявність обладнаних консультаційних зон та кабінетів для моделювання практичних ситуацій супроводу, а також класів для теоретичного оцінювання.\n" +
            "• Обладнання: Сучасні персональні комп'ютери з підключенням до Інтернету, ліцензійне програмне забезпечення, оргтехніка (принтери, сканери), засоби зв'язку, надійні системи захисту інформації та сейфи для конфіденційних матеріалів.\n" +
            "• Доступність та інклюзивність: Обов'язкова безбар'єрність приміщень (пандуси, ліфти або розташування на першому поверсі, тактильні елементи, адаптовані санвузли) відповідно до вимог ДБН В.2.2-40:2018.\n" +
            "• Безпека: Відповідність правилам протипожежної безпеки, наявність облаштованого укриття та аптечок першої медичної допомоги.",
      pdfUrl: null
    }
  ];

  return (
    <>
      <style>{`
        .doc-card {
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .doc-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        
        .doc-header {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .doc-icon {
            font-size: 32px;
            background: var(--bg-light);
            width: 60px;
            height: 60px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
        }
        
        .doc-body {
            margin-top: 15px;
            display: flex;
            flex-direction: column;
            height: calc(100% - 75px);
            justify-content: space-between;
        }
        
        .doc-subtitle {
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 10px;
        }
        
        .doc-expand {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px dashed #ddd;
            color: var(--text-body);
            font-size: 14px;
            line-height: 1.6;
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }

        .tech-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0 20px;
            font-size: 13px;
        }
        
        .tech-table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        
        .tech-table tr:nth-child(even) {
            background: #f7fafc;
        }
        
        .tech-table td:first-child {
            font-weight: 600;
            color: var(--dark-blue);
            width: 32%;
        }
        
        .badge-tech-success {
            background: #e6fffa;
            color: #234e52;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11.5px;
            display: inline-block;
        }
        
        .tech-list {
            list-style: none;
            padding-left: 0;
            margin: 10px 0 20px;
            font-size: 13px;
        }
        
        .tech-list li {
            margin-bottom: 8px;
            padding-left: 0px;
        }
        
        .doc-links-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        
        .tech-doc-btn {
            padding: 8px 10px !important;
            font-size: 12px !important;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-decoration: none !important;
            border: 1px solid #cbd5e0 !important;
            border-radius: 6px !important;
            color: var(--text-body) !important;
            background: white !important;
            transition: all 0.2s;
        }
        
        .tech-doc-btn:hover {
            background: var(--dark-blue) !important;
            color: white !important;
            border-color: var(--dark-blue) !important;
        }

        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
            .doc-links-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <section className="container mt-5 mb-5">
        <h2 className="text-center mb-4">Нормативна база</h2>
        <p className="text-center mb-5">Основні документи, що регламентують діяльність кваліфікаційного центру та процедуру оцінювання.</p>
        
        <div className="grid-2">
          {docs.map(doc => (
            <div key={doc.id} className="card doc-card" onClick={() => toggleDoc(doc.id)}>
              <div className="doc-header">
                <div className="doc-icon">{doc.icon}</div>
                <div>
                  <h3 style={{ marginBottom: 0, fontSize: '18px', color: 'var(--dark-blue)', fontFamily: 'Comfortaa, sans-serif' }}>{doc.title}</h3>
                  <div className="doc-subtitle">{doc.subtitle}</div>
                </div>
              </div>
              <div className="doc-body">
                <div>
                  <p style={{ margin: '5px 0 10px' }}><strong>{doc.desc}</strong></p>
                  {openDoc === doc.id && (
                    <div className="doc-expand">
                      {doc.id === 6 ? (
                        <div className="tech-specs">
                          <p style={{ marginBottom: '10px' }}>
                            <strong>📋 Паспорт приміщення Центру:</strong>
                          </p>
                          <table className="tech-table">
                            <tbody>
                              <tr>
                                <td>📍 Адреса об'єкта</td>
                                <td>м. Запоріжжя, вул. Незалежної України, 57А (Вознесенівський район)</td>
                              </tr>
                              <tr>
                                <td>🏢 Балансоутримувач</td>
                                <td>КЗ «Запорізький обласний інститут післядипломної педагогічної освіти» ЗОР</td>
                              </tr>
                              <tr>
                                <td>📐 Загальна площа</td>
                                <td>658.5 кв. м (підвальні приміщення літ. А-4)</td>
                              </tr>
                              <tr>
                                <td>♿ Інклюзивність</td>
                                <td>
                                  <span className="badge-tech-success">✓ Забезпечено в повному обсязі</span>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Безбар'єрний доступ, пандуси, адаптовані санвузли
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                           <p style={{ marginTop: '15px', marginBottom: '10px' }}>
                            <strong>⚙️ Інженерні системи, обладнання та безпека:</strong>
                          </p>
                          <ul className="tech-list">
                            <li>💻 <strong>Комп'ютерне обладнання:</strong> Наявні персональні комп'ютери та ноутбуки з ліцензійним ПЗ та стабільним підключенням до мережі Інтернет для безперебійного тестування кандидатів</li>
                            <li>🌬️ <strong>Вентиляція:</strong> Справна примусова припливно-витяжна система (згідно з Актом ДСНС №1004)</li>
                            <li>🚰 <strong>Водопостачання та каналізація:</strong> Справні централізовані мережі, наявні облаштовані санвузли</li>
                            <li>⚡ <strong>Електроживлення та зв'язок:</strong> Централізоване із заземленням, швидкісний Wi-Fi</li>
                            <li>🛡️ <strong>Цивільний захист:</strong> Об'єкт офіційно визнано <strong>ГОТОВИМ</strong> до використання як найпростіше укриття</li>
                          </ul>

                          <p style={{ marginTop: '15px', marginBottom: '8px' }}>
                            <strong>📂 Затверджена технічна документація:</strong>
                          </p>
                          <div className="doc-links-grid">
                            <a href="/docs/act_1004.pdf" target="_blank" rel="noopener noreferrer" className="tech-doc-btn" onClick={(e) => e.stopPropagation()}>
                              📄 Акт ДСНС (PDF)
                            </a>
                            <a href="/docs/bti_plan.jpg" target="_blank" rel="noopener noreferrer" className="tech-doc-btn" onClick={(e) => e.stopPropagation()}>
                              🗺️ План БТІ (JPG)
                            </a>
                            <a href="/docs/bti_explication_1.jpg" target="_blank" rel="noopener noreferrer" className="tech-doc-btn" onClick={(e) => e.stopPropagation()}>
                              📋 Експлікація ч.1 (JPG)
                            </a>
                            <a href="/docs/bti_explication_2.jpg" target="_blank" rel="noopener noreferrer" className="tech-doc-btn" onClick={(e) => e.stopPropagation()}>
                              📋 Експлікація ч.2 (JPG)
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-line' }}>
                          {doc.full}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                  {doc.pdfUrl ? (
                    <a
                      href={doc.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '6px 15px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📄 Відкрити
                    </a>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🏢 Технічний паспорт приміщення</span>
                  )}
                  
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '6px 15px', fontSize: '13px' }}
                  >
                    {openDoc === doc.id ? '▲ Згорнути' : '▼ Детальніше'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
