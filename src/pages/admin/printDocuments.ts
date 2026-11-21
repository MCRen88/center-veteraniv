import { escapeHtml, sanitizeDataUrl } from '../../utils/escapeHtml';
import { getBehaviorProfile, type QuestionResult } from '../../utils/testAnalytics';
import type { Application, RegistryItem, TestScore, User } from '../../context/AppContext';

export interface DocumentItem {
  name: string;
  dataUrl?: string;
  type?: string;
  category?: string;
  size?: string;
}

interface ApplicationSignatureDetails {
  certificateDetails?: {
    subject?: {
      CN?: string;
      serialNumber?: string;
    };
    issuer?: {
      CN?: string;
    };
  };
  signerName?: string;
  signerDrfo?: string;
  issuer?: string;
  timestamp?: string;
  uploaded_documents?: {
    other?: unknown[];
  };
}

// Only real uploaded content is returned. (Previously a missing file was replaced by a
// generated "document" image with sample data, which admins could mistake for a real scan.)
export const getDocumentDataUrl = (item: DocumentItem): string =>
  item.dataUrl && item.dataUrl.startsWith('data:') ? item.dataUrl : '';

export const downloadDocument = (item: DocumentItem): boolean => {
  const dataUrl = getDocumentDataUrl(item);
  if (dataUrl) {
    // Keep the uploaded name: appending ".jpg" made Word/other documents unopenable.
    const fileName = item.name;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
  return false;
};

export const openPdfPreview = (name: string, effectiveDataUrl: string): boolean => {
  const pdfWindow = window.open('');
  if (pdfWindow) {
    pdfWindow.document.write(`
      <html><head><title>${escapeHtml(name)}</title></head>
      <body style="margin:0;padding:0;background:#333;">
        <iframe src="${escapeHtml(sanitizeDataUrl(effectiveDataUrl))}" style="width:100vw;height:100vh;border:none;"></iframe>
      </body></html>
    `);
    return true;
  }
  return false;
};

export const printCertificate = (item: RegistryItem): void => {
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
        <title>Сертифікат — ${escapeHtml(item.name)} (${escapeHtml(item.cert)})</title>
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
            <div><span class="cert-name">${escapeHtml(item.name)}</span></div>
            успішно пройшов(ла) процедуру кваліфікаційного оцінювання та підтвердив(ла) професійну кваліфікацію:
            <div style="font-weight: 700; font-size: 15pt; color: #0f3460; margin-top: 8px;">
              «${escapeHtml(item.title)}»
            </div>
          </div>

          <div class="cert-meta">
            <div style="text-align: left;">
              <div><strong>Реєстраційний номер:</strong> <span style="font-family: monospace; font-size: 12pt;">${escapeHtml(item.cert)}</span></div>
              <div style="margin-top: 4px;"><strong>Дата видачі:</strong> ${escapeHtml(item.date)}</div>
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

export const printOfficialApplication = (app: Application | null): void => {
  if (!app) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const fullName = `${app.lname} ${app.fname} ${app.mname || ''}`.trim();
  const appDate = app.created_at ? new Date(app.created_at).toLocaleDateString('uk-UA') : new Date().toLocaleDateString('uk-UA');
  const birthDate = app.birthdate ? new Date(app.birthdate).toLocaleDateString('uk-UA') : '—';

  let sig: ApplicationSignatureDetails | null = null;
  if (app.signature_details) {
    if (typeof app.signature_details === 'string') {
      try {
        sig = JSON.parse(app.signature_details) as ApplicationSignatureDetails;
      } catch {
        sig = null;
      }
    } else {
      sig = app.signature_details as ApplicationSignatureDetails;
    }
  }

  const signerName = sig?.certificateDetails?.subject?.CN || sig?.signerName || fullName;
  const signerDrfo = sig?.certificateDetails?.subject?.serialNumber || sig?.signerDrfo || '—';
  const signerIssuer = sig?.certificateDetails?.issuer?.CN || sig?.issuer || 'Акредитований надавач електронних довірчих послуг';
  const signTime = sig?.timestamp || appDate;

  const uploadedDocs = sig?.uploaded_documents || {};
  const hasOtherDocs = Boolean(uploadedDocs.other && uploadedDocs.other.length > 0);

  const htmlContent = `
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Заява про присвоєння та/або підтвердження професійної кваліфікації — ${escapeHtml(fullName)}</title>
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
          <strong>від:</strong> ${escapeHtml(fullName)}<br/>
          <strong>Дата народження:</strong> ${escapeHtml(birthDate)}<br/>
          <strong>Паспорт / ID:</strong> ${escapeHtml(app.passport || 'Вказано при реєстрації')}<br/>
          <strong>Телефон:</strong> ${escapeHtml(app.phone)}<br/>
          <strong>E-mail:</strong> ${escapeHtml(app.email)}
        </div>

        <div class="doc-title">
          <h1>З А Я В А</h1>
          <p>про присвоєння та/або підтвердження професійної кваліфікації</p>
          <div style="font-size: 10.5pt; margin-top: 4px; font-weight: bold;">Реєстраційний № ${escapeHtml(app.app_number)} від ${escapeHtml(appDate)}</div>
        </div>

        <div class="body-text">
          Прошу допустити мене до проходження процедури присвоєння та/або підтвердження професійної кваліфікації <strong>«Фахівець із супроводу ветеранів війни та демобілізованих осіб»</strong> (рівень кваліфікації: <strong>${escapeHtml(app.level)}</strong>) відповідно до вимог професійного стандарту.
        </div>

        <div style="margin-top: 8px; font-size: 11.5pt;">
          <strong>Відомості про здобувача:</strong>
          <ul class="details-list">
            <li>Рівень вищої освіти: <strong>${escapeHtml(app.education)}</strong></li>
            <li>Стаж роботи: <strong>${escapeHtml(app.experience)} р.</strong></li>
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
            <li><span class="check-box">☑</span> Згода на збір та обробку персональних даних від ${escapeHtml(appDate)}</li>
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
                <td class="kep-val">${escapeHtml(signerName)}</td>
              </tr>
              <tr>
                <td class="kep-label">РНОКПП (ДРФО):</td>
                <td class="kep-val">${escapeHtml(signerDrfo)}</td>
              </tr>
              <tr>
                <td class="kep-label">АЦСК (Надавач):</td>
                <td class="kep-val">${escapeHtml(signerIssuer)}</td>
              </tr>
              <tr>
                <td class="kep-label">Мітка часу:</td>
                <td class="kep-val">${escapeHtml(signTime)}</td>
              </tr>
              <tr>
                <td class="kep-label">Статус:</td>
                <td class="kep-val">Чинність сертифіката порталом не перевірялась</td>
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

export const printDiagnosticReport = (user: User | null, score: TestScore | null): void => {
  if (!user || !score) return;
  const percentage = Math.round((score.score / score.total) * 100);
  const date = new Date(score.created_at).toLocaleString('uk-UA');
  const details = score.details;
  const behavior = getBehaviorProfile(details);

  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(`
        <html><head><title>Діагностичний звіт: ${escapeHtml(user.name)}</title>
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
              <strong>Кандидат:</strong> ${escapeHtml(user.name)}<br/>
              <strong>Email:</strong> ${escapeHtml(user.email)}<br/>
              <strong>ID:</strong> ${escapeHtml(user.id)}
            </div>
            <div class="meta-item">
              <strong>Дата тестування:</strong> ${escapeHtml(date)}<br/>
              <strong>Режим:</strong> ${score.mode === 'exam' ? '🎯 Екзамен' : '📝 Тренування'}<br/>
              <strong>Оцінка:</strong> ${escapeHtml(score.score)} з ${escapeHtml(score.total)} (${percentage}%) &nbsp;
              <span class="badge ${score.passed ? 'passed' : 'failed'}">${score.passed ? 'Складено' : 'Не складено'}</span>
            </div>
          </div>

          <div class="section-title">🧠 Психометричний портрет та поведінковий профіль</div>
          ${behavior ? `
            <div class="portrait-box">
              <p><strong>Манера відповідей:</strong> ${escapeHtml(behavior.style)} | <strong>Впевненість:</strong> ${escapeHtml(behavior.confidence)} | <strong>Темп:</strong> ${escapeHtml(behavior.speedCategory)}</p>
              <p style="margin-top: 10px;">${escapeHtml(behavior.description)}</p>
            </div>
            <div class="grid-2">
              <div>
                <strong style="color: #27ae60;">✓ Сильні сторони:</strong>
                <ul class="bullet-list" style="margin-top: 8px;">
                  ${behavior.strengths?.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Немає даних</li>'}
                </ul>
              </div>
              <div>
                <strong style="color: #c0392b;">✗ Зони ризику / Слабкості:</strong>
                <ul class="bullet-list" style="margin-top: 8px;">
                  ${behavior.weaknesses?.map((w: string) => `<li>${escapeHtml(w)}</li>`).join('') || '<li>Немає даних</li>'}
                </ul>
              </div>
            </div>
            <div style="margin-top: 20px; background: #f0f7ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3498db;">
              <strong>🔮 Прогноз професійної успішності:</strong>
              <p style="margin: 5px 0 0; font-size: 13px;">${escapeHtml(behavior.forecast)}</p>
            </div>
            <div style="margin-top: 15px; background: #f4fbf7; padding: 15px; border-radius: 6px; border-left: 4px solid #2ecc71;">
              <strong>💡 Рекомендації для кандидата:</strong>
              <p style="margin: 5px 0 0; font-size: 13px;">${escapeHtml(behavior.recommendations)}</p>
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
                  details.questions.forEach((q: QuestionResult) => {
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
                      <td style="font-weight: bold; width: 40px;">${escapeHtml(k)}</td>
                      <td>${escapeHtml(stat.name)}</td>
                      <td style="text-align: center; width: 80px;">${escapeHtml(stat.correct)} з ${escapeHtml(stat.total)}</td>
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
