import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import type { RegistryRow, TestScoreRow, ApplicationRow } from '../lib/database.types';
import { trackActivity, type VisitRecord } from '../utils/tracker';
import type { TestDetails } from '../utils/testAnalytics';

export type Role = 'user' | 'teacher' | 'admin';
export type { VisitRecord };

export type RegistryItem = RegistryRow;
export type TestScore = TestScoreRow;
export type Application = ApplicationRow;

// correct / explanation are present only for admins and teachers (migration 012).
export interface Question {
  id: number;
  catId: string;
  catName: string;
  question: string;
  options: string[];
  correct?: number;
  explanation?: string;
}

export interface Case {
  id: number;
  title: string;
  situation: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  testPermission: boolean;
  testScores: TestScore[];
  lastSeenAt?: string | null;
  lastSignInAt?: string | null;
  currentPage?: string | null;
  currentDevice?: string | null;
}

export interface OnlineUser {
  id: string;
  name: string;
  email: string;
  role: Role | 'guest';
  lastSeenAt: string;
  currentPage: string;
  currentDevice: string;
  isOnline: boolean;
  isAway: boolean;
  sessionId?: string;
}

interface AppState {
  registry: RegistryItem[];
  questions: Question[];
  cases: Case[];
  users: User[];
  applications: Application[];
  visits: VisitRecord[];
  onlineUsers: OnlineUser[];
  currentUser: User | null;
  originalAdminUser: User | null;
  isLoading: boolean;
}

interface AppContextType {
  state: AppState;
  addRegistryItem: (item: Omit<RegistryItem, 'id'>) => Promise<void>;
  updateRegistryItem: (id: number, item: Omit<RegistryItem, 'id'>) => Promise<void>;
  deleteRegistryItem: (id: number) => Promise<void>;
  // Auth
  // Resolves to the signed-in user's role, or null when the credentials are wrong.
  login: (email: string, pass: string) => Promise<Role | null>;
  logout: () => Promise<void>;
  // Admin User Mgmt
  adminCreateUser: (user: {email: string, password: string, name: string, role: Role, testPermission: boolean}) => Promise<void>;
  adminUpdateUser: (userId: string, updates: { name?: string, email?: string, password?: string, role?: Role, testPermission?: boolean }) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  grantTestPermission: (userId: string, granted: boolean) => Promise<void>;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  // User Actions
  saveTestScore: (score: Omit<TestScore, 'id' | 'created_at' | 'user_id'> & { details?: TestDetails }) => Promise<TestScore | null>;
  submitApplication: (app: Omit<Application, 'id' | 'created_at' | 'status' | 'app_number' | 'email_verified'>) => Promise<string | null>;
  loadApplicationDetails: (id: string) => Promise<Application | null>;
  updateApplicationStatus: (id: string, status: 'pending' | 'approved' | 'rejected') => Promise<void>;
  deleteApplication: (id: string) => Promise<boolean>;
  // Admin Test Mgmt
  addQuestion: (q: Omit<Question, 'id'>) => Promise<void>;
  updateQuestion: (id: number, q: Omit<Question, 'id'>) => Promise<void>;
  deleteQuestion: (id: number) => Promise<void>;
  // Admin Case Mgmt
  addCase: (c: Omit<Case, 'id'>) => Promise<void>;
  updateCase: (id: number, c: Omit<Case, 'id'>) => Promise<void>;
  deleteCase: (id: number) => Promise<void>;
  // Email verification (codes are generated and checked by the api service)
  sendVerificationEmail: (toEmail: string, recipientName?: string) => Promise<{ success: boolean; message: string }>;
  verifyEmailCode: (toEmail: string, code: string) => Promise<{ success: boolean; message: string }>;
  fetchData: () => Promise<void>;
  fetchVisitsData: () => Promise<void>;
}

const defaultState: AppState = {
  registry: [],
  questions: [],
  cases: [],
  users: [],
  applications: [],
  visits: [],
  onlineUsers: [],
  currentUser: null,
  originalAdminUser: null,
  isLoading: true
};

const ONLINE_MS = 2 * 60 * 1000;
const AWAY_MS = 5 * 60 * 1000;

// Application list columns: signature_details (with uploaded scans) is loaded per application.
const APPLICATION_LIST_COLUMNS = 'id, app_number, lname, fname, mname, birthdate, passport, phone, email, level, education, experience, status, created_at, email_verified';

// Raw database rows as returned by PostgREST (snake_case).
interface QuestionRow {
  id: number;
  cat_id?: string;
  catId?: string;
  cat_name?: string;
  catName?: string;
  question?: string;
  options?: string[];
  correct?: number;
  explanation?: string;
}

interface CaseRow {
  id: number;
  title: string;
  situation: string;
  question: string;
  options: string[];
  correct_answer?: number;
  correctAnswer?: number;
  explanation: string;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  last_seen_at: string | null;
  current_page: string | null;
  current_device: string | null;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

const toQuestion = (q: QuestionRow): Question => ({
  id: q.id,
  catId: q.cat_id || q.catId || '1',
  catName: q.cat_name || q.catName || 'Загальні питання',
  question: q.question || '',
  options: q.options || [],
  correct: typeof q.correct === 'number' ? q.correct : undefined,
  explanation: typeof q.explanation === 'string' ? q.explanation : undefined
});

const toCase = (c: CaseRow): Case => ({
  id: c.id,
  title: c.title,
  situation: c.situation,
  question: c.question,
  options: c.options,
  correctAnswer: c.correct_answer ?? c.correctAnswer ?? 0,
  explanation: c.explanation
});

// Registered users come from profiles.last_seen_at, guests from their latest visit row.
const buildOnlineList = (profiles: ProfileRow[] | null, visits: VisitRecord[] | null): OnlineUser[] => {
  const now = Date.now();
  const list: OnlineUser[] = [];

  (profiles || []).forEach(p => {
    if (!p.last_seen_at) return;
    const diffMs = now - new Date(p.last_seen_at).getTime();
    if (diffMs > AWAY_MS) return;
    list.push({
      id: p.id,
      name: p.name,
      email: p.email || '',
      role: p.role as Role,
      lastSeenAt: p.last_seen_at,
      currentPage: p.current_page || '/',
      currentDevice: p.current_device || 'Невідомий пристрій',
      isOnline: diffMs <= ONLINE_MS,
      isAway: diffMs > ONLINE_MS
    });
  });

  const seenSessions = new Set<string>();
  (visits || []).forEach(v => {
    if (v.user_id || !v.session_id || seenSessions.has(v.session_id)) return;
    const lastSeenAt = v.last_seen_at || v.created_at || new Date(0).toISOString();
    const diffMs = now - new Date(lastSeenAt).getTime();
    if (diffMs > AWAY_MS) return;
    seenSessions.add(v.session_id);
    list.push({
      id: `guest_${v.session_id}`,
      name: `Гість (${v.session_id.slice(0, 8)})`,
      email: 'Неавторизований відвідувач',
      role: 'guest',
      lastSeenAt,
      currentPage: v.path || '/',
      currentDevice: v.browser ? `${v.device_type === 'Mobile' ? '📱' : '🖥️'} ${v.browser} (${v.os || ''})` : 'Гість',
      isOnline: diffMs <= ONLINE_MS,
      isAway: diffMs > ONLINE_MS,
      sessionId: v.session_id
    });
  });

  return list;
};

// Database errors raised by migration 011 -> messages for people.
const DB_ERROR_MESSAGES: Record<string, string> = {
  test_not_permitted: 'Допуск до тестування відсутній або вже використаний. Зверніться до адміністратора.',
  too_few_questions: 'Тест містить недостатньо питань. Результат не зараховано.',
  unknown_question: 'Тест містить питання, яких немає в банку завдань. Результат не зараховано.',
  duplicate_questions: 'Тест містить повторювані питання. Результат не зараховано.',
  invalid_mode: 'Для кандидатів зараховується лише режим екзамену.',
  email_not_verified: 'Email не підтверджено. Отримайте та введіть код підтвердження ще раз.',
  missing_required_fields: 'Не заповнені обовʼязкові поля заяви.'
};
const dbErrorMessage = (message?: string) => {
  const key = Object.keys(DB_ERROR_MESSAGES).find(k => message?.includes(k));
  return key ? DB_ERROR_MESSAGES[key] : (message || 'Невідома помилка');
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const fetchCurrentUserProfile = async (userId: string, email: string): Promise<User | null> => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      const { data: scores } = await supabase.from('test_scores').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return {
        id: profile.id,
        name: profile.name,
        email: email,
        role: profile.role as Role,
        testPermission: profile.test_permission,
        testScores: scores || [],
        lastSeenAt: profile.last_seen_at || null,
        lastSignInAt: profile.last_sign_in_at || null,
        currentPage: profile.current_page || null,
        currentDevice: profile.current_device || null
      };
    }
    return null;
  };

  const fetchData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    const { data: registry, error: rError } = await supabase.from('registry').select('*');
    if (rError) console.error('AppContext error fetching registry:', rError.message);

    let usersList: User[] = [];
    let applicationsList: Application[] = [];
    let visitsList: VisitRecord[] = [];
    let onlineUsersList: OnlineUser[] = [];
    
    // Retrieve current user profile dynamically to avoid stale state closures
    const { data: { session } } = await supabase.auth.getSession();
    let currentRole: string | null = null;
    if (session?.user) {
      const { data: profile, error: pSingleError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (pSingleError) {
        console.error('AppContext error fetching user role:', pSingleError.message);
      }
      if (profile) {
        currentRole = profile.role;
      }
    }
    
    // Test content is only for signed-in users; correct answers only for staff.
    let questionsList: Question[] = [];
    let casesList: Case[] = [];
    if (session?.user) {
      const isStaff = currentRole === 'admin' || currentRole === 'teacher';
      const [questionsRes, casesRes] = await Promise.all([
        isStaff
          ? supabase.rpc('get_questions_full')
          : supabase.from('questions').select('id, cat_id, cat_name, question, options').order('id'),
        supabase.from('cases').select('*').order('id', { ascending: true })
      ]);
      if (questionsRes.error) console.error('AppContext error fetching questions:', questionsRes.error.message);
      if (casesRes.error) console.error('AppContext error fetching cases:', casesRes.error.message);
      questionsList = (questionsRes.data || []).map(toQuestion);
      casesList = (casesRes.data || []).map(toCase);
    }

    if (currentRole === 'admin' || currentRole === 'teacher') {
      const [profilesRes, scoresRes, appsRes, visitsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('test_scores').select('*'),
        supabase.from('applications').select(APPLICATION_LIST_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('user_visits').select('*').order('created_at', { ascending: false }).limit(500)
      ]);
      if (profilesRes.error) console.error('AppContext error fetching profiles list:', profilesRes.error.message);
      if (scoresRes.error) console.error('AppContext error fetching test scores:', scoresRes.error.message);
      if (appsRes.error) console.error('AppContext error fetching applications list:', appsRes.error.message);
      if (visitsRes.error) console.error('AppContext error fetching user_visits:', visitsRes.error.message);

      const scoresByUser = new Map<string, TestScore[]>();
      (scoresRes.data || []).forEach(sc => {
        const list = scoresByUser.get(sc.user_id) || [];
        list.push(sc);
        scoresByUser.set(sc.user_id, list);
      });

      usersList = (profilesRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email || '',
        role: p.role as Role,
        testPermission: p.test_permission,
        testScores: scoresByUser.get(p.id) || [],
        lastSeenAt: p.last_seen_at || null,
        lastSignInAt: p.last_sign_in_at || null,
        currentPage: p.current_page || null,
        currentDevice: p.current_device || null
      }));
      applicationsList = (appsRes.data || []) as Application[];
      visitsList = visitsRes.data || [];
      onlineUsersList = buildOnlineList(profilesRes.data, visitsRes.data);
    }

    setState(prev => ({
      ...prev,
      questions: questionsList,
      cases: casesList,
      registry: registry || [],
      users: usersList,
      applications: applicationsList,
      visits: visitsList,
      onlineUsers: onlineUsersList,
      isLoading: false
    }));
  };

  const fetchVisitsData = async () => {
    try {
      const [visitsRes, profilesRes] = await Promise.all([
        supabase.from('user_visits').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('*').order('created_at', { ascending: false })
      ]);
      if (visitsRes.error) console.error('Error in fetchVisitsData (user_visits):', visitsRes.error.message);
      if (profilesRes.error) console.error('Error in fetchVisitsData (profiles):', profilesRes.error.message);

      const profiles = profilesRes.data || [];
      const profileById = new Map(profiles.map(p => [p.id, p]));
      setState(prev => ({
        ...prev,
        visits: visitsRes.data || [],
        onlineUsers: buildOnlineList(profiles, visitsRes.data),
        users: prev.users.map(u => {
          const p = profileById.get(u.id);
          return p ? {
            ...u,
            lastSeenAt: p.last_seen_at || null,
            lastSignInAt: p.last_sign_in_at || null,
            currentPage: p.current_page || null,
            currentDevice: p.current_device || null
          } : u;
        })
      }));
    } catch (err) {
      console.error('Error fetching visits data:', err);
    }
  };

  useEffect(() => {
    // Initial Session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userProfile = await fetchCurrentUserProfile(session.user.id, session.user.email || '');
        setState(prev => ({ ...prev, currentUser: userProfile, isLoading: false }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
      fetchData();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await fetchCurrentUserProfile(session.user.id, session.user.email || '');
        setState(prev => ({ ...prev, currentUser: userProfile }));
        // INITIAL_SESSION is handled by getSession() above; this is a real sign-in.
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, currentUser: null, originalAdminUser: null, users: [], applications: [], visits: [], onlineUsers: [] }));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const addRegistryItem = async (item: Omit<RegistryItem, 'id'>) => {
    const { data, error } = await supabase.from('registry').insert([item]).select();
    if (!error && data) {
      setState(prev => ({ ...prev, registry: [data[0], ...prev.registry] }));
    } else {
      console.error(error);
      alert("Помилка збереження реєстру");
    }
  };

  const updateRegistryItem = async (id: number, item: Omit<RegistryItem, 'id'>) => {
    const { data, error } = await supabase.from('registry').update(item).eq('id', id).select();
    if (!error && data) {
      setState(prev => ({
        ...prev,
        registry: prev.registry.map(r => r.id === id ? data[0] : r)
      }));
    } else {
      console.error(error);
      alert("Помилка оновлення запису реєстру");
    }
  };

  const deleteRegistryItem = async (id: number) => {
    const { error } = await supabase.from('registry').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        registry: prev.registry.filter(r => r.id !== id)
      }));
    } else {
      console.error(error);
      alert("Помилка видалення запису реєстру");
    }
  };

  const login = async (email: string, pass: string): Promise<Role | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error || !data?.user) {
      return null;
    }
    const userProfile = await fetchCurrentUserProfile(data.user.id, data.user.email || email);
    if (userProfile) {
      await trackActivity({
        path: window.location.pathname,
        action: 'login',
        user: userProfile
      });
    }
    return userProfile?.role ?? 'user';
  };

  const logout = async () => {
    if (state.currentUser) {
      await trackActivity({
        path: window.location.pathname,
        action: 'logout',
        user: state.currentUser
      });
    }
    await supabase.auth.signOut();
  };

  // User accounts are managed by the api service; the browser never holds the service_role key.
  const adminCreateUser = async (userParams: {email: string, password: string, name: string, role: Role, testPermission: boolean}) => {
    try {
      await apiRequest('/admin/users', 'POST', userParams);
      await fetchData();
    } catch (e) {
      alert("Помилка створення користувача: " + errorMessage(e));
    }
  };

  const adminUpdateUser = async (userId: string, updates: { name?: string, email?: string, password?: string, role?: Role, testPermission?: boolean }) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, 'PATCH', updates);
      await fetchData();
    } catch (e) {
      alert("Помилка при оновленні: " + errorMessage(e));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const adminDeleteUser = async (userId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await apiRequest(`/admin/users/${encodeURIComponent(userId)}`, 'DELETE');
      await fetchData();
    } catch (e) {
      alert("Помилка при видаленні: " + errorMessage(e));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const grantTestPermission = async (userId: string, granted: boolean) => {
    const { error } = await supabase.from('profiles').update({ test_permission: granted }).eq('id', userId);
    if (!error) {
      await fetchData();
    } else {
      alert("Помилка надання допуску: " + error.message);
    }
  };

  const saveTestScore = async (score: Omit<TestScore, 'id' | 'created_at' | 'user_id'> & { details?: TestDetails }) => {
    if (!state.currentUser) return null;

    // The returned row carries the score and correct answers set by the database.
    const { data, error } = await supabase.from('test_scores').insert([{
      ...score,
      user_id: state.currentUser.id
    }]).select();

    if (!error && data) {
      // For candidates the database scores the test and revokes the permission
      // (migration 011). An impersonating admin revokes it explicitly.
      let nextPermission = state.currentUser.testPermission;
      if (state.currentUser.role === 'user') {
        nextPermission = false;
        if (state.originalAdminUser) {
          const { error: permError } = await supabase.from('profiles').update({ test_permission: false }).eq('id', state.currentUser.id);
          if (permError) {
            console.error("Error revoking test permission:", permError.message);
          }
        }
      }

      setState(prev => ({
        ...prev,
        currentUser: {
          ...prev.currentUser!,
          testPermission: nextPermission,
          testScores: [data[0], ...prev.currentUser!.testScores]
        }
      }));
      fetchData();
      return data[0] as TestScore;
    }
    alert("Помилка збереження результату: " + dbErrorMessage(error?.message));
    return null;
  };

  // Returns the application number assigned by the database, or null on error.
  const submitApplication = async (app: Omit<Application, 'id' | 'created_at' | 'status' | 'app_number' | 'email_verified'>) => {
    const { data, error } = await supabase.rpc('submit_application', { p: app });
    if (error || typeof data !== 'string') {
      alert("Помилка подачі заяви: " + dbErrorMessage(error?.message));
      return null;
    }
    return data;
  };

  const loadApplicationDetails = async (id: string) => {
    const { data, error } = await supabase.from('applications').select('*').eq('id', id).single();
    if (error) {
      alert("Не вдалося завантажити заяву: " + error.message);
      return null;
    }
    return data as Application;
  };

  const updateApplicationStatus = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', id);
    if (error) {
      alert("Помилка оновлення статусу заяви: " + error.message);
    } else {
      setState(prev => ({
        ...prev,
        applications: prev.applications.map(app => app.id === id ? { ...app, status } : app)
      }));
    }
  };

  const deleteApplication = async (id: string) => {
    const { error } = await supabase.from('applications').delete().eq('id', id);
    if (error) {
      alert("Помилка видалення заяви: " + error.message);
      return false;
    } else {
      setState(prev => ({
        ...prev,
        applications: prev.applications.filter(app => app.id !== id)
      }));
      return true;
    }
  };

  const addQuestion = async (q: Omit<Question, 'id'>) => {
    const dbQ = {
      cat_id: q.catId,
      cat_name: q.catName,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation
    };
    const { data, error } = await supabase.from('questions').insert([dbQ]).select('id, cat_id, cat_name, question, options');
    if (!error && data) {
      const mapped = { ...toQuestion(data[0]), correct: q.correct, explanation: q.explanation };
      setState(prev => ({ ...prev, questions: [...prev.questions, mapped] }));
    } else {
      alert("Помилка додавання питання: " + (error?.message || ""));
    }
  };

  const updateQuestion = async (id: number, q: Omit<Question, 'id'>) => {
    const dbQ = {
      cat_id: q.catId,
      cat_name: q.catName,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation
    };
    const { data, error } = await supabase.from('questions').update(dbQ).eq('id', id).select('id, cat_id, cat_name, question, options');
    if (!error && data) {
      const mapped = { ...toQuestion(data[0]), correct: q.correct, explanation: q.explanation };
      setState(prev => ({
        ...prev,
        questions: prev.questions.map(old => old.id === id ? mapped : old)
      }));
    } else {
      alert("Помилка оновлення питання: " + (error?.message || ""));
    }
  };

  const deleteQuestion = async (id: number) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== id)
      }));
    } else {
      alert("Помилка видалення питання");
    }
  };

  const addCase = async (c: Omit<Case, 'id'>) => {
    const dbCase = {
      title: c.title,
      situation: c.situation,
      question: c.question,
      options: c.options,
      correct_answer: c.correctAnswer,
      explanation: c.explanation
    };
    const { data, error } = await supabase.from('cases').insert([dbCase]).select();
    if (!error && data) {
      const mapped = toCase(data[0]);
      setState(prev => ({ ...prev, cases: [...prev.cases, mapped] }));
    } else {
      alert("Помилка додавання кейсу: " + (error?.message || ""));
    }
  };

  const updateCase = async (id: number, c: Omit<Case, 'id'>) => {
    const dbCase = {
      title: c.title,
      situation: c.situation,
      question: c.question,
      options: c.options,
      correct_answer: c.correctAnswer,
      explanation: c.explanation
    };
    const { data, error } = await supabase.from('cases').update(dbCase).eq('id', id).select();
    if (!error && data) {
      const mapped = toCase(data[0]);
      setState(prev => ({
        ...prev,
        cases: prev.cases.map(old => old.id === id ? mapped : old)
      }));
    } else {
      alert("Помилка оновлення кейсу: " + (error?.message || ""));
    }
  };

  const deleteCase = async (id: number) => {
    const { error } = await supabase.from('cases').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        cases: prev.cases.filter(c => c.id !== id)
      }));
    } else {
      alert("Помилка видалення кейсу: " + (error?.message || ""));
    }
  };

  const impersonateUser = (userId: string) => {
    const targetUser = state.users.find(u => u.id === userId);
    if (!targetUser) {
      alert("Користувача не знайдено");
      return;
    }
    setState(prev => ({
      ...prev,
      originalAdminUser: prev.currentUser,
      currentUser: targetUser
    }));
  };

  const stopImpersonating = () => {
    if (!state.originalAdminUser) return;
    setState(prev => ({
      ...prev,
      currentUser: prev.originalAdminUser,
      originalAdminUser: null
    }));
  };

  const sendVerificationEmail = async (toEmail: string, recipientName: string = 'Заявник') => {
    try {
      await apiRequest('/otp/send', 'POST', { email: toEmail, name: recipientName });
      return { success: true, message: `Код підтвердження надіслано на пошту ${toEmail}` };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  const verifyEmailCode = async (toEmail: string, code: string) => {
    try {
      await apiRequest('/otp/verify', 'POST', { email: toEmail, code });
      return { success: true, message: 'Email підтверджено' };
    } catch (e) {
      return { success: false, message: errorMessage(e) };
    }
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      addRegistryItem, 
      updateRegistryItem,
      deleteRegistryItem,
      login, 
      logout, 
      adminCreateUser, 
      adminUpdateUser, 
      adminDeleteUser, 
      grantTestPermission, 
      impersonateUser, 
      stopImpersonating, 
      saveTestScore, 
      submitApplication, 
      updateApplicationStatus, 
      deleteApplication,
      addQuestion, 
      updateQuestion, 
      deleteQuestion, 
      addCase, 
      updateCase, 
      deleteCase, 
      sendVerificationEmail,
      verifyEmailCode,
      loadApplicationDetails,
      fetchData,
      fetchVisitsData
    }}>
      {children}
    </AppContext.Provider>
  );
};

// The hook lives next to its provider on purpose (one import for every page).
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
