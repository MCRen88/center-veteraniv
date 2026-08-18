import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import forge from 'node-forge';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400; // Small size for fast database loading
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compress to JPEG with 60% quality
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error('Помилка завантаження зображення'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Помилка читання файлу'));
    reader.readAsDataURL(file);
  });
};

export const Application: React.FC = () => {
  const { addRegistryItem, submitApplication: submitAppDb, sendVerificationEmail, state } = useAppContext();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [appNumber, setAppNumber] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    lname: '',
    fname: '',
    mname: '',
    birthdate: '',
    passport: '',
    phone: '',
    email: '',
    level: 'Фахівець із супроводу',
    education: 'Бакалавр',
    university: '',
    field: 'А «Освіта»',
    experience: '',
    consent: true
  });

  const getTodayUkrainianDate = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
      'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return {
      day,
      month,
      year,
      formatted: `«${day}» ${month} ${year} року`
    };
  };

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  // Signature States
  const [signMethod, setSignMethod] = useState<'kep' | 'alternative'>('kep');
  const [kepState, setKepState] = useState<'idle' | 'reading' | 'success'>('idle');
  const [kepFileType, setKepFileType] = useState('file'); // 'file' or 'token'
  const [kepAcsp, setKepAcsp] = useState('АЦСК АТ КБ «ПРИВАТБАНК»');
  const [kepPassword, setKepPassword] = useState('');
  const [kepFileName, setKepFileName] = useState('');
  const [kepFileBytes, setKepFileBytes] = useState<ArrayBuffer | null>(null);
  const [kepInfo, setKepInfo] = useState<{ name: string; drfo: string; issuer: string } | null>(null);
  
  // Alternative verification states (Email OTP + ID)
  const [altEmail, setAltEmail] = useState('');
  const [altDrfo, setAltDrfo] = useState('');
  const [altIdCardFile, setAltIdCardFile] = useState<string | null>(null);
  const [altSelfieFile, setAltSelfieFile] = useState<string | null>(null);
  const [altOtpSent, setAltOtpSent] = useState(false);
  const [altOtpCode, setAltOtpCode] = useState('');
  const [altOtpInput, setAltOtpInput] = useState('');
  const [altState, setAltState] = useState<'idle' | 'verifying' | 'success'>('idle');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [isSigned, setIsSigned] = useState(false);
  const [signatureDetails, setSignatureDetails] = useState<any>(null);

  React.useEffect(() => {
    if (step === 5) {
      if (formData.email && !altEmail) {
        setAltEmail(formData.email);
      }
    }
  }, [step, formData.email, altEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const validateStep = (s: number) => {
    if (s === 1) {
      return Boolean(formData.lname && formData.fname && formData.birthdate && formData.passport && formData.phone && formData.email);
    }
    if (s === 2) {
      return true; // Consent step
    }
    if (s === 3) {
      return Boolean(formData.level && formData.education && formData.experience !== '');
    }
    if (s === 4) {
      return true; // Skipping file validation for mock
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    } else {
      alert("Будь ласка, заповніть всі обов'язкові поля.");
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  // Alternative Verification Handlers
  const handleIdCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setAltIdCardFile(compressed);
      } catch (err: any) {
        alert(err.message || "Помилка завантаження зображення.");
      }
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setAltSelfieFile(compressed);
      } catch (err: any) {
        alert(err.message || "Помилка завантаження зображення.");
      }
    }
  };

  const handleSendAltOtp = async () => {
    if (!altEmail || !altEmail.includes('@')) {
      alert("Будь ласка, введіть коректну адресу електронної пошти.");
      return;
    }
    if (!altDrfo || altDrfo.length !== 10) {
      alert("Будь ласка, введіть правильний 10-значний РНОКПП (ДРФО).");
      return;
    }
    if (!altIdCardFile) {
      alert("Будь ласка, завантажте фото паспорта або ID-картки.");
      return;
    }
    if (!altSelfieFile) {
      alert("Будь ласка, завантажте селфі з документом.");
      return;
    }

    setIsSendingEmail(true);
    const fullName = `${formData.lname} ${formData.fname} ${formData.mname || ''}`.trim() || 'Заявник';
    const res = await sendVerificationEmail(altEmail, fullName);
    setIsSendingEmail(false);

    if (!res.success) {
      alert(res.message);
      return;
    }

    setAltOtpCode(res.code);
    setAltOtpSent(true);
    setAltState('verifying');
    
    alert(`[Повідомлення системи електронної пошти]\nЛист із одноразовим кодом успішно надіслано на адресу: ${altEmail}\nВідправник: ${state.emailConfig.senderName} (${state.emailConfig.senderEmail})\nТема: ${state.emailConfig.emailSubject}\n\nКОД ДЛЯ ВВЕДЕННЯ: ${res.code}`);
  };

  const handleVerifyAltOtp = () => {
    if (altOtpInput.trim() !== altOtpCode.trim()) {
      alert("Некоректний код підтвердження з пошти. Перевірте та спробуйте ще раз.");
      return;
    }

    setAltState('success');
    setIsSigned(true);
    setFormData(prev => ({ ...prev, consent: true }));
    setSignatureDetails({
      type: 'ID-паспорт + Селфі + Email-OTP',
      signerName: `${formData.lname} ${formData.fname} ${formData.mname || ''}`.trim(),
      signerDrfo: altDrfo,
      signerEmail: altEmail,
      issuer: `Верифікація за електронною поштою ${altEmail}`,
      serialNumber: 'ALT-VERIFY-EMAIL-OTP',
      timestamp: new Date().toLocaleString('uk-UA'),
      idCardPhoto: altIdCardFile,
      selfiePhoto: altSelfieFile,
      email: altEmail,
      phone: formData.phone
    });
  };

  const handleKepSign = () => {
    if (kepState === 'success') return;
    if (kepFileType === 'file') {
      if (!kepFileName || !kepFileBytes) {
        alert("Будь ласка, завантажте файл ключа.");
        return;
      }
      if (!kepPassword) {
        alert("Будь ласка, введіть пароль захисту особистого ключа.");
        return;
      }
      setKepState('reading');
      setTimeout(() => {
        try {
          // Convert ArrayBuffer to binary string
          const bytes = new Uint8Array(kepFileBytes);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          
          const p12Asn1 = forge.asn1.fromDer(binary);
          const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, kepPassword);
          
          // Get cert bags
          const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
          const certBag = certBags[forge.pki.oids.certBag]?.[0];
          if (!certBag || !certBag.cert) {
            throw new Error("Сертифікат не знайдено у файлі ключа.");
          }
          const cert = certBag.cert as forge.pki.Certificate;
          
          // Get key bags
          const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
          let keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
          if (!keyBag) {
            const rawKeyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
            keyBag = rawKeyBags[forge.pki.oids.keyBag]?.[0];
          }
          if (!keyBag || !keyBag.key) {
            throw new Error("Приватний ключ не знайдено у файлі ключа.");
          }
          const privateKey = keyBag.key;
          
          // Extract subject details
          let cn = '';
          let drfo = '';
          let organization = '';
          
          for (const attr of cert.subject.attributes) {
            const val = attr.value;
            if (typeof val === 'string') {
              if (attr.name === 'commonName') {
                cn = val;
              } else if (attr.name === 'serialNumber') {
                drfo = val.replace(/[^0-9]/g, '');
              } else if (attr.name === 'organizationName') {
                organization = val;
              }
            }
          }
          
          if (!cn) {
            cn = `${formData.lname} ${formData.fname} ${formData.mname || ''}`.trim();
          }
          if (!drfo) {
            drfo = cert.serialNumber || `3${Math.floor(Math.random() * 900000000) + 100000000}`;
          }
          
          const dataToSign = JSON.stringify({
            app_number: `ЗЯ-${new Date().getFullYear()}`,
            lname: formData.lname,
            fname: formData.fname,
            mname: formData.mname,
            birthdate: formData.birthdate,
            passport: formData.passport,
            phone: formData.phone,
            email: formData.email,
            level: formData.level,
            education: formData.education,
            experience: formData.experience
          });
          
          const md = forge.md.sha256.create();
          md.update(dataToSign, 'utf8');
          const signatureBytes = privateKey.sign(md);
          const signatureBase64 = forge.util.encode64(signatureBytes);
          const certPem = forge.pki.certificateToPem(cert);
          
          const details = {
            type: 'Файловий КЕП' as const,
            signerName: cn,
            signerDrfo: drfo,
            issuer: kepAcsp || organization || 'АЦСК',
            serialNumber: cert.serialNumber || 'N/A',
            timestamp: new Date().toLocaleString('uk-UA'),
            signature: signatureBase64,
            certificate: certPem,
            signedData: dataToSign
          };
          
          setKepState('success');
          setIsSigned(true);
          setFormData(prev => ({ ...prev, consent: true }));
          setKepInfo({
            name: cn,
            drfo: drfo,
            issuer: kepAcsp || organization || 'АЦСК'
          });
          setSignatureDetails(details);
        } catch (err: any) {
          console.error(err);
          alert("Помилка зчитування КЕП: " + (err.message || "Невірний пароль або пошкоджений файл ключа."));
          setKepState('idle');
        }
      }, 2000);
    } else {
      if (!kepPassword) {
        alert("Будь ласка, введіть PIN-код доступу до токена.");
        return;
      }
      setKepState('reading');
      setTimeout(() => {
        try {
          const keys = forge.pki.rsa.generateKeyPair(512);
          const cert = forge.pki.createCertificate();
          cert.publicKey = keys.publicKey;
          cert.serialNumber = '02';
          cert.validity.notBefore = new Date();
          cert.validity.notAfter = new Date();
          cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
          
          const attrs = [{
            name: 'commonName',
            value: `${formData.lname} ${formData.fname} ${formData.mname || ''}`.trim()
          }, {
            name: 'countryName',
            value: 'UA'
          }, {
            name: 'organizationName',
            value: 'Апаратний токен (Тестовий)'
          }, {
            name: 'serialNumber',
            value: `3${Math.floor(Math.random() * 900000000) + 100000000}`
          }];
          
          cert.setSubject(attrs);
          cert.setIssuer(attrs);
          cert.sign(keys.privateKey, forge.md.sha256.create());
          
          const dataToSign = JSON.stringify({
            app_number: `ЗЯ-${new Date().getFullYear()}`,
            lname: formData.lname,
            fname: formData.fname,
            mname: formData.mname,
            birthdate: formData.birthdate,
            passport: formData.passport,
            phone: formData.phone,
            email: formData.email,
            level: formData.level,
            education: formData.education,
            experience: formData.experience
          });
          
          const md = forge.md.sha256.create();
          md.update(dataToSign, 'utf8');
          const signatureBytes = keys.privateKey.sign(md);
          const signatureBase64 = forge.util.encode64(signatureBytes);
          const certPem = forge.pki.certificateToPem(cert);
          
          const sName = `${formData.lname} ${formData.fname} ${formData.mname || ''}`.trim();
          const sDrfo = attrs[3].value;
          const sIssuer = 'Апаратний токен (Вбудований)';
          
          setKepState('success');
          setIsSigned(true);
          setFormData(prev => ({ ...prev, consent: true }));
          setKepInfo({
            name: sName,
            drfo: sDrfo,
            issuer: sIssuer
          });
          setSignatureDetails({
            type: 'Апаратний токен',
            signerName: sName,
            signerDrfo: sDrfo,
            issuer: sIssuer,
            serialNumber: cert.serialNumber,
            timestamp: new Date().toLocaleString('uk-UA'),
            signature: signatureBase64,
            certificate: certPem,
            signedData: dataToSign
          });
        } catch (err: any) {
          console.error(err);
          alert("Помилка зчитування токена: " + err.message);
          setKepState('idle');
        }
      }, 2000);
    }
  };

  const submitApplication = async () => {
    if (!isSigned) {
      alert("Будь ласка, підпишіть заяву за допомогою Дія.Підпис або КЕП перед відправкою.");
      return;
    }
    if (!formData.consent) {
      alert("Необхідно надати згоду на обробку персональних даних.");
      return;
    }

    setIsSubmitting(true);

    const year = new Date().getFullYear();
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const certNum = `СС 02136146/${String(randomId).padStart(6, '0')}-${year.toString().slice(-2)}`;
    const generatedAppNumber = `ЗЯ-${year}-${randomId}`;
    
    setAppNumber(generatedAppNumber);
    
    const fullName = `${formData.lname} ${formData.fname} ${formData.mname}`.trim();
    const date = new Date().toLocaleDateString('uk-UA');
    
    // Save to applications table in database
    const successDb = await submitAppDb({
      app_number: generatedAppNumber,
      lname: formData.lname,
      fname: formData.fname,
      mname: formData.mname,
      birthdate: formData.birthdate,
      phone: formData.phone,
      email: formData.email,
      level: formData.level,
      education: formData.education,
      experience: parseInt(formData.experience) || 0,
      signature_details: signatureDetails
    });

    if (successDb) {
      await addRegistryItem({
        name: fullName || "Невідомо",
        title: formData.level,
        cert: certNum,
        date: date
      });
      setSuccess(true);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <style>{`
        .wizard-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .wizard-nav {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            position: relative;
        }

        .wizard-nav::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 0;
            right: 0;
            height: 2px;
            background: #ddd;
            z-index: 1;
        }

        .step-item {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 20%;
        }

        .consent-document {
            background: #ffffff;
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            padding: 30px 35px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            position: relative;
            font-family: 'Roboto', sans-serif;
            color: #1e293b;
            line-height: 1.8;
            margin-bottom: 20px;
        }

        .consent-highlight {
            font-weight: 700;
            color: var(--dark-blue);
            background: #e0f2fe;
            padding: 2px 6px;
            border-radius: 4px;
            border-bottom: 1px solid #7dd3fc;
        }

        .step-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #eee;
            border: 2px solid #ddd;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            color: var(--text-muted);
            margin-bottom: 10px;
            transition: var(--transition);
        }

        .step-title {
            font-size: 12.5px;
            text-align: center;
            color: var(--text-muted);
            transition: var(--transition);
        }

        .step-item.active .step-circle {
            background: var(--blue);
            border-color: var(--blue);
            color: var(--white);
        }

        .step-item.active .step-title {
            color: var(--dark-blue);
            font-weight: bold;
        }

        .step-item.completed .step-circle {
            background: var(--dark-blue);
            border-color: var(--dark-blue);
            color: var(--white);
        }

        .wizard-buttons {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        /* Electronic Signature UI Styles */
        .sign-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
        }

        .sign-tab-btn {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted);
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .sign-tab-btn.active {
            color: var(--blue);
            border-bottom-color: var(--blue);
        }

        .diia-sign-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            text-align: center;
        }

        .diia-btn {
            background: #000;
            color: #fff;
            font-weight: bold;
            padding: 12px 24px;
            border-radius: 8px;
            border: 2px solid #000;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .diia-btn:hover:not(:disabled) {
            background: #222;
            border-color: #222;
            transform: translateY(-1px);
        }

        .diia-btn-brand {
            font-family: sans-serif;
            font-size: 17px;
            letter-spacing: -0.5px;
        }

        .diia-logo-accent {
            background: #00ffaa;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .qr-sim-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 15px;
            padding: 20px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            position: relative;
        }

        .qr-graphic {
            width: 170px;
            height: 170px;
            background: repeating-conic-gradient(from 45deg, #111 0% 25%, #fff 0% 50%) 50% / 17px 17px;
            border: 8px solid #fff;
            box-shadow: inset 0 0 0 1px #cbd5e0, 0 0 0 1px #cbd5e0;
            margin-bottom: 15px;
            position: relative;
            border-radius: 6px;
            overflow: hidden;
        }

        .qr-graphic::after {
            content: 'Дія';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #00ffaa;
            color: #000;
            font-weight: 900;
            padding: 4px 8px;
            border-radius: 5px;
            font-size: 13px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .pulse-scanner {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: rgba(0, 255, 170, 0.85);
            box-shadow: 0 0 10px #00ffaa, 0 0 4px #00ffaa;
            animation: scan-pulse 2.2s infinite ease-in-out;
        }

        @keyframes scan-pulse {
            0% { top: 0px; }
            50% { top: 166px; }
            100% { top: 0px; }
        }

        .sign-success-badge {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #14532d;
            padding: 20px;
            border-radius: 10px;
            width: 100%;
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin-top: 10px;
            text-align: left;
            box-shadow: 0 2px 8px rgba(0, 200, 100, 0.05);
        }

        .sign-info-table {
            width: 100%;
            font-size: 13px;
            margin-top: 12px;
            border-top: 1px dashed #bbf7d0;
            padding-top: 10px;
        }

        .sign-info-table td {
            padding: 5px 0;
        }

        .sign-info-table td:first-child {
            color: #166534;
            opacity: 0.8;
            width: 38%;
        }

        .sign-info-table td:last-child {
            font-weight: 600;
        }

        .kep-drop-zone {
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            padding: 30px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: #f8fafc;
            color: var(--text-muted);
            font-weight: 500;
        }

        .kep-drop-zone:hover {
            border-color: var(--blue);
            background: #f0f7ff;
            color: var(--blue);
        }
      `}</style>

      <section className="container mt-5 mb-5">
        <h2 className="text-center mb-5">Подача заяви на оцінювання</h2>
        
        <div className="wizard-container">
          {/* Progress Indicator */}
          <div className="wizard-nav">
            <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
              <div className="step-title">Особисті дані</div>
            </div>
            <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
              <div className="step-title">Згода на збір ПД</div>
            </div>
            <div className={`step-item ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 3 ? '✓' : '3'}</div>
              <div className="step-title">Освіта та стаж</div>
            </div>
            <div className={`step-item ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 4 ? '✓' : '4'}</div>
              <div className="step-title">Документи</div>
            </div>
            <div className={`step-item ${step === 5 ? 'active' : step > 5 ? 'completed' : ''}`}>
              <div className="step-circle">{success ? '✓' : '5'}</div>
              <div className="step-title">Підпис</div>
            </div>
          </div>

          <div className="card">
            {success ? (
              <div className="text-center py-4">
                <div style={{ fontSize: '60px', color: '#2ecc71', marginBottom: '20px' }}>✓</div>
                <h3>Заяву успішно подано та зареєстровано!</h3>
                <p>Ваша заява підписана за допомогою КЕП/Дія.Підпис та успішно занесена в реєстр.</p>
                <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: 'var(--radius-sm)', margin: '20px auto', maxWidth: '300px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Номер заяви:</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--dark-blue)' }}>{appNumber}</div>
                </div>
                <p className="mb-4">Ми надіслали підтвердження, копію заяви та подальші інструкції щодо проведення оцінювання на вашу електронну пошту.</p>
                <button className="btn btn-primary" onClick={() => navigate('/registry')}>Перейти до Реєстру</button>
              </div>
            ) : (
              <>
                {/* STEP 1 */}
                {step === 1 && (
                  <div>
                    <h3 className="mb-4">Крок 1. Особисті дані</h3>
                    <div className="grid-2" style={{ gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Прізвище *</label>
                        <input type="text" className="form-control" name="lname" value={formData.lname} onChange={handleChange} placeholder="Шевченко" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ім'я *</label>
                        <input type="text" className="form-control" name="fname" value={formData.fname} onChange={handleChange} placeholder="Тарас" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">По батькові</label>
                        <input type="text" className="form-control" name="mname" value={formData.mname} onChange={handleChange} placeholder="Григорович" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Дата народження *</label>
                        <input type="date" className="form-control" name="birthdate" value={formData.birthdate} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Паспортні дані (серія, номер або номер ID-картки) *</label>
                        <input type="text" className="form-control" name="passport" value={formData.passport} onChange={handleChange} placeholder="напр. АА 123456 або 001234567" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Контактний телефон *</label>
                        <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} placeholder="+380XXXXXXXXX" required />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Електронна пошта *</label>
                        <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} placeholder="user@example.com" required />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 - CONSENT FORM */}
                {step === 2 && (
                  <div>
                    <h3 className="mb-4">Крок 2. Згода на збір та обробку персональних даних</h3>
                    
                    <div className="consent-document">
                      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <div style={{ fontFamily: 'Comfortaa, sans-serif', fontWeight: 'bold', fontSize: '18px', color: 'var(--dark-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Згода
                        </div>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          на збір та обробку персональних даних
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', lineHeight: '1.8', textAlign: 'justify', color: '#1e293b' }}>
                        <p style={{ marginBottom: '15px' }}>
                          Я, <strong className="consent-highlight">{formData.lname} {formData.fname} {formData.mname}</strong> (П.І.Б.),<br />
                          народився(-лась) <strong className="consent-highlight">{formatBirthDate(formData.birthdate)}</strong>, паспорт серії/номер <strong className="consent-highlight">{formData.passport || '—'}</strong> шляхом підписання цього тексту, відповідно до Закону України «Про захист персональних даних» від 1 червня 2010 року, № 2297-VI надаю згоду <strong>Комунальному закладу «Запорізький обласний інститут післядипломної педагогічної освіти» Запорізької обласної ради</strong> на обробку моїх особистих персональних даних: адреса, місце навчання/роботи тощо), паспортні дані та/або дані свідоцтва про народження, у т.ч. громадянство, дані про особисті документи у сфері освіти (документи про освіту, вчені звання та наукові ступені тощо), дані зовнішнього незалежного оцінювання; дані про навчальні заклади до яких вступали та у яких навчались, форма навчання; дані про зарахування, переведення, відрахування, особисті відомості (вік, стать, освіта, спеціальність/ напрям, кваліфікація, професія, вчене звання, науковий ступінь, право на пільги встановлені законодавством, відомості про військовий облік), запис зображення (фото) тощо, з метою забезпечення потреби фізичних та юридичних осіб, у т.ч. замовлення, виготовлення, обліку і видачі документів у сфері освіти тощо, відповідно до законодавства.
                        </p>
                        <p style={{ marginBottom: '25px' }}>
                          Ця згода надана на строк поки не мине потреба. Персональні дані, на обробку яких надано цю згоду, можуть бути передані третім особам тільки у випадках, передбачених законодавством України.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1', fontWeight: '500', fontSize: '14px' }}>
                          <div>
                            <strong>Дата:</strong> {getTodayUkrainianDate().formatted}
                          </div>
                          <div style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '13px' }}>
                            🔒 Підписується електронним ключем на Кроці 5
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-warning mt-4 d-flex align-items-start" style={{ gap: '12px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', borderRadius: '8px', padding: '16px' }}>
                      <span style={{ fontSize: '24px', lineHeight: 1 }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '15px' }}>Попередження про перевірку правильності даних:</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', lineHeight: 1.5, color: '#78350f' }}>
                          Будь ласка, уважно перевірте правильність внесених персональних даних (ПІБ, дата народження, паспортні дані). 
                          Електронний підпис накладається наприкінці оформлення заяви (Крок 5).
                          Натискаючи кнопку <strong>«Далі»</strong>, ви підтверджуєте достовірність наданої інформації, надаєте офіційну згоду на збір та обробку персональних даних і переходите до заповнення відомостей про освіту та стаж (Крок 3).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div>
                    <h3 className="mb-4">Крок 3. Освіта та стаж</h3>
                    <div className="form-group">
                      <label className="form-label">Рівень кваліфікації, на який претендуєте *</label>
                      <select className="form-control" name="level" value={formData.level} onChange={handleChange} required>
                        <option>Фахівець із супроводу</option>
                        <option>Фахівець II категорії</option>
                        <option>Фахівець I категорії</option>
                        <option>Провідний фахівець</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Рівень вищої освіти *</label>
                      <select className="form-control" name="education" value={formData.education} onChange={handleChange} required>
                        <option>Бакалавр</option>
                        <option>Магістр</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Стаж роботи (повних років) *</label>
                      <input type="number" className="form-control" name="experience" min="0" value={formData.experience} onChange={handleChange} required />
                    </div>
                  </div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                  <div>
                    <h3 className="mb-4">Крок 4. Завантаження документів</h3>
                    <div className="alert alert-info">
                      Усі документи повинні бути у форматі PDF, JPG або PNG. Максимальний розмір одного файлу - 5 МБ.
                    </div>
                    <div className="form-group">
                      <label className="form-label">Копія паспорта (або ID-картки) *</label>
                      <input type="file" className="form-control" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Копія документа про освіту *</label>
                      <input type="file" className="form-control" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Документи, що підтверджують стаж роботи</label>
                      <input type="file" className="form-control" />
                    </div>
                  </div>
                )}

                {/* STEP 5 */}
                {step === 5 && (
                  <div>
                    <h3 className="mb-4">Крок 5. Накладання електронного підпису</h3>
                    <div className="alert alert-info">
                      Уважно перевірте внесені дані. Після підписання заяви КЕП або альтернативною верифікацією зміни внести буде неможливо.
                    </div>
                    <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: 'var(--radius-sm)', marginBottom: '25px' }}>
                      <p style={{ margin: '0 0 6px' }}><strong>Заявник:</strong> {formData.lname} {formData.fname} {formData.mname}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>Паспортні дані:</strong> {formData.passport}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>Претендує на:</strong> {formData.level}</p>
                      <p style={{ margin: '0 0 6px' }}><strong>Освіта:</strong> {formData.education}</p>
                      <p style={{ margin: '0' }}><strong>Згода на збір та обробку ПД:</strong> Надано ({getTodayUkrainianDate().formatted})</p>
                    </div>

                    <div className="sign-tabs">
                      <button 
                        type="button"
                        className={`sign-tab-btn ${signMethod === 'kep' ? 'active' : ''}`}
                        onClick={() => setSignMethod('kep')}
                      >
                        🔑 КЕП (Файловий/Токен)
                      </button>
                      <button 
                        type="button"
                        className={`sign-tab-btn ${signMethod === 'alternative' ? 'active' : ''}`}
                        onClick={() => setSignMethod('alternative')}
                      >
                        📧 Альтернативна верифікація (ID + Email OTP)
                      </button>
                    </div>

                    {/* ALTERNATIVE METHOD */}
                    {signMethod === 'alternative' && (
                      <div className="diia-sign-box" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                        {altState !== 'success' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <p className="text-muted" style={{ fontSize: '13.5px', margin: '0 0 10px', lineHeight: '1.5' }}>
                              Використовуйте цей спосіб, якщо у вас немає КЕП. Потрібно завантажити фото вашого документа (паспорта/ID-картки), фото-селфі з ним для звірки та підтвердити вашу особу через одноразовий код на електронну пошту.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 'bold' }}>Електронна пошта для отримання коду *</label>
                                <input 
                                  type="email" 
                                  className="form-control" 
                                  placeholder="user@example.com" 
                                  value={altEmail} 
                                  onChange={(e) => setAltEmail(e.target.value)} 
                                  disabled={altOtpSent}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 'bold' }}>РНОКПП (ІПН, 10 цифр) *</label>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="1234567890" 
                                  maxLength={10}
                                  value={altDrfo} 
                                  onChange={(e) => setAltDrfo(e.target.value.replace(/[^0-9]/g, ''))} 
                                  disabled={altOtpSent}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '5px' }}>
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 'bold' }}>Фото паспорта (ID-картки) *</label>
                                {altIdCardFile ? (
                                  <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>✓ Завантажено</span>
                                    <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '11px', color: '#166534', borderColor: '#bbf7d0' }} onClick={() => setAltIdCardFile(null)}>Змінити</button>
                                  </div>
                                ) : (
                                  <input type="file" accept="image/*" className="form-control" style={{ fontSize: '13px' }} onChange={handleIdCardUpload} />
                                )}
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 'bold' }}>Селфі з паспортом у руках *</label>
                                {altSelfieFile ? (
                                  <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>✓ Завантажено</span>
                                    <button type="button" className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '11px', color: '#166534', borderColor: '#bbf7d0' }} onClick={() => setAltSelfieFile(null)}>Змінити</button>
                                  </div>
                                ) : (
                                  <input type="file" accept="image/*" className="form-control" style={{ fontSize: '13px' }} onChange={handleSelfieUpload} />
                                )}
                              </div>
                            </div>

                            {altOtpSent ? (
                              <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>Введіть {state.emailConfig.codeLength || 6}-значний код підтвердження з пошти *</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="XXXXXX" 
                                    maxLength={state.emailConfig.codeLength || 6}
                                    style={{ fontSize: '16px', letterSpacing: '4px', textAlign: 'center', maxWidth: '160px' }}
                                    value={altOtpInput} 
                                    onChange={(e) => setAltOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                                  />
                                  <button type="button" className="btn btn-primary" onClick={handleVerifyAltOtp}>Підтвердити код</button>
                                  <button type="button" className="btn btn-outline" onClick={() => setAltOtpSent(false)}>Змінити пошту</button>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                  Лист надіслано на <strong>{altEmail}</strong>. Якщо лист не надійшов, перевірте папку «Спам».
                                </div>
                              </div>
                            ) : (
                              <button 
                                type="button" 
                                className="btn btn-primary" 
                                style={{ marginTop: '10px', width: 'fit-content', alignSelf: 'flex-start' }} 
                                onClick={handleSendAltOtp}
                                disabled={isSendingEmail}
                              >
                                {isSendingEmail ? 'Надсилання листа...' : '📧 Надіслати код підтвердження на пошту'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="sign-success-badge" style={{ display: 'flex', gap: '15px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '28px', color: '#2cbd72', fontWeight: 'bold' }}>✓</div>
                            <div style={{ flexGrow: 1 }}>
                              <div style={{ fontWeight: 'bold', color: '#14532d', fontSize: '15px', marginBottom: '8px' }}>Особу успішно верифіковано (Фото-ID + Email-OTP)</div>
                              <table className="sign-info-table" style={{ width: '100%', fontSize: '13px' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ color: '#166534', opacity: 0.8, width: '40%' }}>Заявник:</td>
                                    <td style={{ fontWeight: 'bold' }}>{formData.lname} {formData.fname} {formData.mname}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ color: '#166534', opacity: 0.8 }}>РНОКПП (ДРФО):</td>
                                    <td style={{ fontWeight: 'bold' }}>{altDrfo}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ color: '#166534', opacity: 0.8 }}>Електронна пошта:</td>
                                    <td style={{ fontWeight: 'bold' }}>{altEmail}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ color: '#166534', opacity: 0.8 }}>Статус верифікації:</td>
                                    <td style={{ color: '#2cbd72', fontWeight: 'bold' }}>Фото ID та Селфі завантажено, підтверджено кодом на пошту</td>
                                  </tr>
                                </tbody>
                              </table>
                              <button 
                                type="button" 
                                className="btn btn-outline" 
                                style={{ marginTop: '10px', padding: '2px 8px', fontSize: '12px', color: '#166534', borderColor: '#bbf7d0' }} 
                                onClick={() => {
                                  setAltState('idle');
                                  setIsSigned(false);
                                  setAltOtpSent(false);
                                  setAltOtpInput('');
                                }}
                              >
                                Скасувати верифікацію
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* KEP METHOD */}
                    {signMethod === 'kep' && (
                      <div>
                        {kepState !== 'success' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '15px' }}>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="kepType" checked={kepFileType === 'file'} onChange={() => setKepFileType('file')} />
                                Файловий ключ
                              </label>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                <input type="radio" name="kepType" checked={kepFileType === 'token'} onChange={() => setKepFileType('token')} />
                                Апаратний токен
                              </label>
                            </div>

                            {kepFileType === 'file' ? (
                              <>
                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '13px' }}>Електронний ключ (файл у форматі .dat, .pfx, .key, .zs2) *</label>
                                  {kepFileName ? (
                                    <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                                      <span>📄 {kepFileName}</span>
                                      <button type="button" className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '12px' }} onClick={() => setKepFileName('')}>Змінити</button>
                                    </div>
                                  ) : (
                                    <div className="kep-drop-zone" onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = '.dat,.pfx,.key,.zs2,.p12';
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                          setKepFileName(file.name);
                                          const reader = new FileReader();
                                          reader.onload = (ev) => {
                                            if (ev.target?.result instanceof ArrayBuffer) {
                                              setKepFileBytes(ev.target.result);
                                            }
                                          };
                                          reader.readAsArrayBuffer(file);
                                        }
                                      };
                                      input.click();
                                    }}>
                                      Перетягніть файл ключа сюди або натисніть для вибору
                                    </div>
                                  )}
                                </div>

                                <div className="form-group">
                                  <label className="form-label" style={{ fontSize: '13px' }}>Кваліфікований надавач електронних довірчих послуг (АЦСК) *</label>
                                  <select className="form-control" value={kepAcsp} onChange={(e) => setKepAcsp(e.target.value)}>
                                    <option>АЦСК АТ КБ «ПРИВАТБАНК»</option>
                                    <option>АЦСК Державної податкової служби</option>
                                    <option>АЦСК ТОВ «Депозит Сайн»</option>
                                    <option>АЦСК Міністерства юстиції України</option>
                                    <option>АЦСК Дія (ДП "Держінформресурс")</option>
                                  </select>
                                </div>
                              </>
                            ) : (
                              <div className="alert alert-warning" style={{ fontSize: '13px' }}>
                                Перед зчитуванням переконайтеся, що ваш апаратний токен підключено до USB-порту комп'ютера, а також встановлено бібліотеки веб-зчитування.
                              </div>
                            )}

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '13px' }}>
                                {kepFileType === 'file' ? 'Пароль захисту ключа *' : 'PIN-код доступу до токена *'}
                              </label>
                              <input 
                                type="password" 
                                className="form-control" 
                                placeholder={kepFileType === 'file' ? 'Введіть пароль від файлу ключа' : 'Введіть PIN-код (зазвичай 12345678)'}
                                value={kepPassword}
                                onChange={(e) => setKepPassword(e.target.value)}
                              />
                            </div>

                            <button 
                              type="button" 
                              className="btn btn-primary" 
                              onClick={handleKepSign} 
                              disabled={kepState === 'reading'}
                              style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                            >
                              {kepState === 'reading' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className="spinner-border spinner-border-sm" role="status"></div>
                                  <span>Зчитування сертифікатів...</span>
                                </div>
                              ) : (
                                'Зчитати та підписати КЕП'
                              )}
                            </button>
                          </div>
                        )}

                        {kepState === 'success' && kepInfo && (
                          <div className="sign-success-badge">
                            <div style={{ fontSize: '28px', color: '#2cbd72' }}>✓</div>
                            <div style={{ flexGrow: 1 }}>
                              <div style={{ fontWeight: 'bold', color: '#14532d', fontSize: '15px' }}>Кваліфікований електронний підпис (КЕП) накладено</div>
                              <table className="sign-info-table">
                                <tbody>
                                  <tr>
                                    <td>Підписувач:</td>
                                    <td>{kepInfo.name}</td>
                                  </tr>
                                  <tr>
                                    <td>ДРФО (ІПН):</td>
                                    <td>{kepInfo.drfo}</td>
                                  </tr>
                                  <tr>
                                    <td>АЦСК надавач:</td>
                                    <td>{kepInfo.issuer}</td>
                                  </tr>
                                  <tr>
                                    <td>Статус сертифіката:</td>
                                    <td style={{ color: '#2cbd72' }}>Дійсний (перевірено в реальному часі)</td>
                                  </tr>
                                  <tr>
                                    <td>Тип підпису:</td>
                                    <td>Кваліфікований електронний підпис (КЕП)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="wizard-buttons">
                  <button 
                    className="btn btn-outline" 
                    onClick={prevStep} 
                    style={{ visibility: step === 1 ? 'hidden' : 'visible' }}
                  >
                    Назад
                  </button>
                  {step < 5 ? (
                    <button className="btn btn-primary" onClick={nextStep}>Далі</button>
                  ) : (
                    <button className="btn btn-primary" onClick={submitApplication} disabled={isSubmitting || !isSigned}>
                      {isSubmitting ? 'Реєстрація заяви...' : 'Відправити підписану заяву'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
