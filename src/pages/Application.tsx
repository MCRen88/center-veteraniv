import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export const Application: React.FC = () => {
  const { addRegistryItem, submitApplication: submitAppDb } = useAppContext();
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
    phone: '',
    email: '',
    level: 'Фахівець із супроводу',
    education: 'Бакалавр',
    university: '',
    field: 'А «Освіта»',
    experience: '',
    consent: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const validateStep = (s: number) => {
    if (s === 1) {
      return formData.lname && formData.fname && formData.birthdate && formData.phone && formData.email;
    }
    if (s === 2) {
      return formData.level && formData.education && formData.experience !== '';
    }
    if (s === 3) {
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

  const submitApplication = async () => {
    if (!formData.consent) {
      alert("Необхідно надати згоду на обробку персональних даних.");
      return;
    }

    setIsSubmitting(true);

    const year = new Date().getFullYear();
    const randomId = Math.floor(Math.random() * 9000) + 1000;
    const certNum = `СС ${Math.floor(Math.random() * 90000000) + 10000000}/${String(randomId).padStart(6, '0')}-${year.toString().slice(-2)}`;
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
      experience: parseInt(formData.experience) || 0
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
            width: 25%;
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
            font-size: 13px;
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
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
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
              <div className="step-title">Освіта та стаж</div>
            </div>
            <div className={`step-item ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
              <div className="step-circle">{step > 3 ? '✓' : '3'}</div>
              <div className="step-title">Документи</div>
            </div>
            <div className={`step-item ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
              <div className="step-circle">{success ? '✓' : '4'}</div>
              <div className="step-title">Підтвердження</div>
            </div>
          </div>

          <div className="card">
            {success ? (
              <div className="text-center py-4">
                <div style={{ fontSize: '60px', color: '#2ecc71', marginBottom: '20px' }}>✓</div>
                <h3>Заяву успішно подано!</h3>
                <p>Ваша заява підписана КЕП та зареєстрована в системі.</p>
                <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: 'var(--radius-sm)', margin: '20px auto', maxWidth: '300px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Номер заяви:</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--dark-blue)' }}>{appNumber}</div>
                </div>
                <p className="mb-4">Ми надіслали підтвердження та подальші інструкції на вашу електронну пошту.</p>
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
                        <input type="text" className="form-control" name="lname" value={formData.lname} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ім'я *</label>
                        <input type="text" className="form-control" name="fname" value={formData.fname} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">По батькові</label>
                        <input type="text" className="form-control" name="mname" value={formData.mname} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Дата народження *</label>
                        <input type="date" className="form-control" name="birthdate" value={formData.birthdate} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Контактний телефон *</label>
                        <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Електронна пошта *</label>
                        <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} required />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div>
                    <h3 className="mb-4">Крок 2. Освіта та стаж</h3>
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

                {/* STEP 3 */}
                {step === 3 && (
                  <div>
                    <h3 className="mb-4">Крок 3. Завантаження документів</h3>
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

                {/* STEP 4 */}
                {step === 4 && (
                  <div>
                    <h3 className="mb-4">Крок 4. Підписання КЕП</h3>
                    <div className="alert alert-info">
                      Уважно перевірте внесені дані. Після накладання Кваліфікованого електронного підпису (КЕП) зміни внести буде неможливо.
                    </div>
                    <div style={{ background: 'var(--bg-light)', padding: '20px', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                      <p><strong>Заявник:</strong> {formData.lname} {formData.fname} {formData.mname}</p>
                      <p><strong>Претендує на:</strong> {formData.level}</p>
                      <p><strong>Освіта:</strong> {formData.education}</p>
                    </div>
                    <div className="form-group d-flex align-items-center" style={{ gap: '10px' }}>
                      <input type="checkbox" id="w-consent" name="consent" checked={formData.consent} onChange={handleChange} required />
                      <label htmlFor="w-consent">Я даю згоду на обробку моїх персональних даних згідно з чинним законодавством України.</label>
                    </div>
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
                  {step < 4 ? (
                    <button className="btn btn-primary" onClick={nextStep}>Далі</button>
                  ) : (
                    <button className="btn btn-primary" onClick={submitApplication} disabled={isSubmitting}>
                      {isSubmitting ? 'Обробка КЕП...' : 'Підписати та відправити'}
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
