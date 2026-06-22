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
      full: "Ця постанова визначає правові та організаційні засади створення, функціонування та акредитації кваліфікаційних центрів Національним агентством кваліфікацій. Вона регламентує вимоги до матеріально-технічної бази, кадрового забезпечення та процедур оцінювання."
    },
    {
      id: 2,
      icon: "📜",
      title: "Постанова КМУ №956",
      subtitle: "від 15 вересня 2021 р.",
      desc: "Порядок присвоєння та підтвердження професійних кваліфікацій.",
      full: "Документ регламентує процедуру взаємодії здобувача з кваліфікаційним центром, етапи подання заяви, проходження попередньої співбесіди, процедури оцінювання (теоретичного та практичного), а також порядок видачі сертифіката про присвоєння кваліфікації."
    },
    {
      id: 3,
      icon: "📜",
      title: "Професійний стандарт",
      subtitle: "Наказ Мінветеранів №508",
      desc: "Фахівець із супроводу ветеранів війни та демобілізованих осіб.",
      full: "Професійний стандарт визначає 8 трудових функцій, якими має володіти фахівець. Зокрема: організація роботи, ведення обліку, проведення зустрічей, консультування, сприяння отриманню послуг, організація заходів, взаємодія з органами влади, та професійний розвиток."
    },
    {
      id: 4,
      icon: "📚",
      title: "Програма підвищення кваліфікації",
      subtitle: "ЗОІППО",
      desc: "Навчальна програма підготовки фахівців.",
      full: "Програма обсягом 150 годин, спрямована на підготовку фахівців із супроводу. Включає теоретичні модулі з нормативно-правового регулювання, психології взаємодії з ветеранами, та практичні кейси з вирішення типових проблем демобілізованих осіб."
    }
  ];

  return (
    <>
      <style>{`
        .doc-card {
            cursor: pointer;
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
        }
        
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }

        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; }
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
                  <h3 style={{ marginBottom: 0, fontSize: '18px' }}>{doc.title}</h3>
                  <div className="doc-subtitle">{doc.subtitle}</div>
                </div>
              </div>
              <div className="doc-body">
                <p><strong>{doc.desc}</strong></p>
                {openDoc === doc.id && (
                  <div className="doc-expand">
                    {doc.full}
                  </div>
                )}
                <div className="mt-3 text-center" style={{ color: 'var(--light-blue)', fontSize: '12px', marginTop: '15px' }}>
                  {openDoc === doc.id ? '▲ Згорнути' : '▼ Розгорнути деталі'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};
