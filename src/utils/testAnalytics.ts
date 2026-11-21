// Behaviour profile of an exam attempt, derived from the saved, server-verified details
// (per-question correct answers are filled in by the database trigger, migration 011/012).

export interface QuestionResult {
  id: number | string;
  question?: string;
  catId?: string;
  catName?: string;
  options?: string[];
  correct?: number;
  selected?: number;
  timeSpent?: number;
  changes?: number;
  explanation?: string;
}

export interface BehaviorProfile {
  style: string;
  confidence: string;
  speedCategory: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  forecast: string;
  recommendations: string;
}

export interface TestDetails {
  questions?: QuestionResult[];
  totalTime?: number;
  tabSwitches?: number;
  selectedVariant?: number | null;
  terminated?: boolean;
  behaviorProfile?: BehaviorProfile;
}

export function computeBehaviorProfile(details: TestDetails): BehaviorProfile {
  const questions = details.questions || [];
  const terminated = Boolean(details.terminated);
  const totalQuestions = questions.length;
  const totalTimeSpent = questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
  const avgTime = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
  const totalChanges = questions.reduce((sum, q) => sum + (q.changes || 0), 0);
  const isCorrect = (q: QuestionResult) => typeof q.correct === 'number' && q.selected === q.correct;
  const score = questions.filter(isCorrect).length;

  const categoryStats: Record<string, { correct: number; total: number }> = {};
  questions.forEach(q => {
    const cat = q.catName || 'Загальні питання';
    categoryStats[cat] = categoryStats[cat] || { correct: 0, total: 0 };
    categoryStats[cat].total++;
    if (isCorrect(q)) categoryStats[cat].correct++;
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

  let style = 'Збалансований';
  let description = 'Кандидат демонструє оптимальний баланс швидкості та якості прийняття рішень. Працює в стабільному темпі, приділяючи помірну увагу кожному питанню.';
  let strengths: string[] = ['Стабільний темп роботи', 'Адекватна самооцінка впевненості', 'Низький рівень помилок через неуважність'];
  let weaknesses: string[] = ['Можлива легка нерішучість на складних запитаннях'];
  const scoreRate = totalQuestions > 0 ? score / totalQuestions : 0;

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

  let forecast: string;
  if (terminated) {
    forecast = 'Тестування заблоковано та анульовано через систематичні порушення правил (вихід з вкладки/вікна браузера). Спрогнозувати професійну успішність неможливо через недостатність даних.';
  } else if (scoreRate >= 0.75) {
    forecast = `Прогноз позитивний. Кандидат демонструє високий рівень професійної компетентності. Його стиль прийняття рішень (${style.toLowerCase()}) та сильна сторона у сфері "${strongest}" дозволять йому ефективно виконувати обов'язки фахівця із супроводу ветеранів.`;
  } else {
    forecast = `Рекомендується додаткова підготовка. Наразі рівень знань недостатній для успішної сертифікації. Потрібно звернути увагу на зону "${weakest}", а також переглянути підхід до темпу відповідей (зменшити поспіх або сумніви).`;
  }

  let recommendations = 'Повторіть матеріал та спробуйте ще раз.';
  if (terminated) {
    recommendations = 'Дотримуйтеся правил академічної доброчесності та не залишайте вікно тестування під час наступної спроби.';
  } else if (style === 'Імпульсивний') {
    recommendations = 'Уповільніть темп. Уважно дочитуйте питання та всі 4 варіанти відповідей до кінця перед вибором.';
  } else if (style === 'Вагаючий / Невпевнений') {
    recommendations = 'Довіряйте першій інтуїтивній відповіді. Намагайтеся не змінювати обраний варіант без вагомих логічних аргументів.';
  } else if (style === 'Аналітичний / Системний') {
    recommendations = 'Дотримуйтеся обраної стратегії. Ви демонструєте ідеальний баланс темпу та якості.';
  }

  return { style, confidence, speedCategory, description, strengths, weaknesses, forecast, recommendations };
}

// Older attempts stored the profile; newer ones are computed from verified data.
// Accepts any stored details object (pages declare their own shapes of the same JSON).
export function getBehaviorProfile(raw: object | null | undefined): BehaviorProfile | null {
  if (!raw) return null;
  const details = raw as TestDetails;
  if (details.behaviorProfile) return details.behaviorProfile;
  if (!details.questions || details.questions.length === 0) return null;
  return computeBehaviorProfile(details);
}
