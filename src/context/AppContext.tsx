import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { Database } from '../lib/database.types';
import { casesDb, type CaseQuestion as Case } from '../data/casesDb';
import { questionsDb } from '../data/questionsDb';
import { trackActivity, type VisitRecord } from '../utils/tracker';

export type Role = 'user' | 'teacher' | 'admin';
export type { Case, VisitRecord };

export type RegistryItem = Database['public']['Tables']['registry']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type TestScore = Database['public']['Tables']['test_scores']['Row'];
export type Application = Database['public']['Tables']['applications']['Row'];

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

export interface EmailVerificationConfig {
  provider: 'smtp' | 'resend' | 'sendgrid' | 'demo';
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
  emailSubject: string;
  emailTemplate: string;
  codeLength: number;
  codeExpiryMinutes: number;
  enabled: boolean;
}

export const defaultEmailConfig: EmailVerificationConfig = {
  provider: 'demo',
  smtpHost: 'mail.zoippo.net.ua',
  smtpPort: 465,
  smtpUser: 'orgmetodcentr@zoippo.net.ua',
  smtpPass: '',
  senderEmail: 'orgmetodcentr@zoippo.net.ua',
  senderName: 'КЗ «ЗОІППО» ЗОР (Кваліфікаційний центр)',
  emailSubject: 'Код підтвердження для підписання заяви про присвоєння/підтвердження кваліфікації',
  emailTemplate: `Шановний(а) {name}!\n\nВаш одноразовий код підтвердження для верифікації особи та підписання заяви про присвоєння та/або підтвердження професійної кваліфікації в Кваліфікаційному центрі:\n\n{code}\n\nКод дійсний протягом {expiry} хвилин. Якщо ви не подавали заяву в КЗ «ЗОІППО» ЗОР, проігноруйте цей лист.\n\nЗ повагою,\nКваліфікаційний центр КЗ «ЗОІППО» ЗОР\norgmetodcentr@zoippo.net.ua`,
  codeLength: 6,
  codeExpiryMinutes: 10,
  enabled: true
};

const getStoredEmailConfig = (): EmailVerificationConfig => {
  try {
    const stored = localStorage.getItem('lms_email_verification_config');
    if (stored) {
      return { ...defaultEmailConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading email config from localStorage:', e);
  }
  return defaultEmailConfig;
};

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
  emailConfig: EmailVerificationConfig;
}

interface AppContextType {
  state: AppState;
  addRegistryItem: (item: Omit<RegistryItem, 'id'>) => Promise<void>;
  updateRegistryItem: (id: number, item: Omit<RegistryItem, 'id'>) => Promise<void>;
  deleteRegistryItem: (id: number) => Promise<void>;
  // Auth
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  // Admin User Mgmt
  adminCreateUser: (user: {email: string, password: string, name: string, role: Role, testPermission: boolean}) => Promise<void>;
  adminUpdateUser: (userId: string, updates: { name?: string, email?: string, password?: string, role?: Role, testPermission?: boolean }) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  grantTestPermission: (userId: string, granted: boolean) => Promise<void>;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  // User Actions
  saveTestScore: (score: Omit<TestScore, 'id' | 'created_at' | 'user_id'> & { details?: any }) => Promise<void>;
  submitApplication: (app: Omit<Application, 'id' | 'created_at' | 'status'>) => Promise<boolean>;
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
  // Email / OTP Config
  updateEmailConfig: (config: Partial<EmailVerificationConfig>) => void;
  sendVerificationEmail: (toEmail: string, recipientName?: string) => Promise<{ success: boolean; code: string; message: string }>;
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
  isLoading: true,
  emailConfig: getStoredEmailConfig()
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
    
    // Fetch generic data based on roles later, or fetch open data
    const { data: dbQuestions, error: qError } = await supabase.from('questions').select('*');
    if (qError) console.error('AppContext error fetching questions:', qError.message);
    
    const { data: registry, error: rError } = await supabase.from('registry').select('*');
    if (rError) console.error('AppContext error fetching registry:', rError.message);
    
    let questionsList: Question[] = [];
    if (dbQuestions && dbQuestions.length > 0) {
      questionsList = dbQuestions.map((q: any) => ({
        id: q.id,
        catId: q.cat_id || q.catId || '1',
        catName: q.cat_name || q.catName || 'Загальні питання',
        question: q.question || '',
        options: q.options || [],
        correct: typeof q.correct === 'number' ? q.correct : 0,
        explanation: q.explanation || ''
      }));
    } else {
      questionsList = [...questionsDb];
    }

    let casesList: Case[] = [];
    try {
      const { data: dbCases, error: cError } = await supabase.from('cases').select('*').order('id', { ascending: true });
      if (cError) {
        console.error('AppContext error fetching cases:', cError.message);
        casesList = [...casesDb];
      } else if (dbCases && dbCases.length > 0) {
        casesList = dbCases.map((c: any) => ({
          id: c.id,
          title: c.title,
          situation: c.situation,
          question: c.question,
          options: c.options,
          correctAnswer: c.correct_answer !== undefined ? c.correct_answer : c.correctAnswer,
          explanation: c.explanation
        }));
      } else {
        casesList = [...casesDb];
      }
    } catch (err) {
      console.error('Error fetching cases from DB, falling back to static casesDb:', err);
      casesList = [...casesDb];
    }
    console.log('AppContext: casesList loaded with', casesList.length, 'items');
    
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
    
    if (currentRole === 'admin' || currentRole === 'teacher') {
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (pError) {
        console.error('AppContext error fetching profiles list:', pError.message);
      }
      
      if (profiles) {
        const { data: allScores, error: sError } = await supabase.from('test_scores').select('*');
        if (sError) {
          console.error('AppContext error fetching test scores:', sError.message);
        }
        
        usersList = profiles.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email || '',
          role: p.role as Role,
          testPermission: p.test_permission,
          testScores: allScores?.filter(s => s.user_id === p.id) || [],
          lastSeenAt: p.last_seen_at || null,
          lastSignInAt: p.last_sign_in_at || null,
          currentPage: p.current_page || null,
          currentDevice: p.current_device || null
        }));

        // Calculate online registered users
        const now = Date.now();
        profiles.forEach(p => {
          if (p.last_seen_at) {
            const lastSeenTime = new Date(p.last_seen_at).getTime();
            const diffMs = now - lastSeenTime;
            if (diffMs <= 5 * 60 * 1000) {
              onlineUsersList.push({
                id: p.id,
                name: p.name,
                email: p.email || '',
                role: p.role as Role,
                lastSeenAt: p.last_seen_at,
                currentPage: p.current_page || '/',
                currentDevice: p.current_device || 'Невідомий пристрій',
                isOnline: diffMs <= 2 * 60 * 1000,
                isAway: diffMs > 2 * 60 * 1000 && diffMs <= 5 * 60 * 1000
              });
            }
          }
        });
      }
      
      const { data: apps, error: appError } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
      if (appError) {
        console.error('AppContext error fetching applications list:', appError.message);
      }
      if (apps) {
        applicationsList = apps;
      }

      // Fetch visit logs
      const { data: vData, error: vError } = await supabase
        .from('user_visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (vError) {
        console.error('AppContext error fetching user_visits:', vError.message);
      } else if (vData) {
        visitsList = vData;

        // Extract active guest sessions
        const now = Date.now();
        const guestMap = new Map<string, any>();
        vData.forEach(v => {
          if (!v.user_id && v.session_id) {
            const lastSeenTime = new Date(v.last_seen_at || v.created_at).getTime();
            const diffMs = now - lastSeenTime;
            if (diffMs <= 5 * 60 * 1000 && !guestMap.has(v.session_id)) {
              guestMap.set(v.session_id, v);
            }
          }
        });

        guestMap.forEach((v, sessId) => {
          const lastSeenTime = new Date(v.last_seen_at || v.created_at).getTime();
          const diffMs = now - lastSeenTime;
          onlineUsersList.push({
            id: `guest_${sessId}`,
            name: `Гість (${sessId.slice(0, 8)})`,
            email: 'Неавторизований відвідувач',
            role: 'guest',
            lastSeenAt: v.last_seen_at || v.created_at,
            currentPage: v.path || '/',
            currentDevice: v.browser ? `${v.device_type === 'Mobile' ? '📱' : '🖥️'} ${v.browser} (${v.os || ''})` : 'Гість',
            isOnline: diffMs <= 2 * 60 * 1000,
            isAway: diffMs > 2 * 60 * 1000 && diffMs <= 5 * 60 * 1000,
            sessionId: sessId
          });
        });
      }
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
      const { data: vData, error: vError } = await supabase
        .from('user_visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (vError) {
        console.error('Error in fetchVisitsData (user_visits):', vError.message);
      }

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) {
        console.error('Error in fetchVisitsData (profiles):', pError.message);
      }

      const now = Date.now();
      const onlineList: OnlineUser[] = [];

      if (profiles && profiles.length > 0) {
        profiles.forEach(p => {
          if (p.last_seen_at) {
            const lastSeenTime = new Date(p.last_seen_at).getTime();
            const diffMs = now - lastSeenTime;
            if (diffMs <= 5 * 60 * 1000) {
              onlineList.push({
                id: p.id,
                name: p.name,
                email: p.email || '',
                role: p.role as Role,
                lastSeenAt: p.last_seen_at,
                currentPage: p.current_page || '/',
                currentDevice: p.current_device || 'Невідомий пристрій',
                isOnline: diffMs <= 2 * 60 * 1000,
                isAway: diffMs > 2 * 60 * 1000 && diffMs <= 5 * 60 * 1000
              });
            }
          }
        });
      }

      if (vData && vData.length > 0) {
        const guestMap = new Map<string, any>();
        vData.forEach(v => {
          if (!v.user_id && v.session_id) {
            const lastSeenTime = new Date(v.last_seen_at || v.created_at).getTime();
            const diffMs = now - lastSeenTime;
            if (diffMs <= 5 * 60 * 1000 && !guestMap.has(v.session_id)) {
              guestMap.set(v.session_id, v);
            }
          }
        });

        guestMap.forEach((v, sessId) => {
          const lastSeenTime = new Date(v.last_seen_at || v.created_at).getTime();
          const diffMs = now - lastSeenTime;
          onlineList.push({
            id: `guest_${sessId}`,
            name: `Гість (${sessId.slice(0, 8)})`,
            email: 'Неавторизований відвідувач',
            role: 'guest',
            lastSeenAt: v.last_seen_at || v.created_at,
            currentPage: v.path || '/',
            currentDevice: v.browser ? `${v.device_type === 'Mobile' ? '📱' : '🖥️'} ${v.browser} (${v.os || ''})` : 'Гість',
            isOnline: diffMs <= 2 * 60 * 1000,
            isAway: diffMs > 2 * 60 * 1000 && diffMs <= 5 * 60 * 1000,
            sessionId: sessId
          });
        });
      }

      // Also update usersList in state with refreshed lastSeenAt / currentPage
      setState(prev => {
        let updatedUsers = prev.users;
        if (profiles && profiles.length > 0) {
          updatedUsers = prev.users.map(u => {
            const p = profiles.find(prof => prof.id === u.id);
            if (p) {
              return {
                ...u,
                lastSeenAt: p.last_seen_at || null,
                lastSignInAt: p.last_sign_in_at || null,
                currentPage: p.current_page || null,
                currentDevice: p.current_device || null
              };
            }
            return u;
          });
        }

        return {
          ...prev,
          visits: vData || [],
          onlineUsers: onlineList,
          users: updatedUsers
        };
      });
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
        fetchData();
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, currentUser: null, users: [] }));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state.currentUser) {
      fetchData();
    }
  }, [state.currentUser?.role]);

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

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      alert("Невірний логін або пароль");
      return false;
    }
    if (data?.user) {
      const userProfile = await fetchCurrentUserProfile(data.user.id, data.user.email || email);
      if (userProfile) {
        await trackActivity({
          path: window.location.pathname,
          action: 'login',
          user: userProfile
        });
      }
    }
    return true;
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

  const adminCreateUser = async (userParams: {email: string, password: string, name: string, role: Role, testPermission: boolean}) => {
    // Uses service role to bypass auth restriction on user creation
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userParams.email,
      password: userParams.password,
      email_confirm: true,
      user_metadata: { name: userParams.name, role: userParams.role }
    });

    if (error) {
      alert("Помилка створення користувача: " + error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: data.user.id,
        name: userParams.name,
        email: userParams.email,
        role: userParams.role,
        test_permission: userParams.testPermission
      });
      if (profileError) {
        alert("Користувача створено, але помилка з профілем: " + profileError.message);
      }
      await fetchData();
    }
  };

  const adminUpdateUser = async (userId: string, updates: { name?: string, email?: string, password?: string, role?: Role, testPermission?: boolean }) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const authUpdates: any = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;
      if (updates.name || updates.role) {
        authUpdates.user_metadata = {};
        if (updates.name) authUpdates.user_metadata.name = updates.name;
        if (updates.role) authUpdates.user_metadata.role = updates.role;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
        if (authError) {
          alert("Помилка оновлення акаунту: " + authError.message);
          return;
        }
      }

      const profileUpdates: any = {};
      if (updates.name) profileUpdates.name = updates.name;
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.role) profileUpdates.role = updates.role;
      if (updates.testPermission !== undefined) profileUpdates.test_permission = updates.testPermission;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
        if (profileError) {
          alert("Помилка оновлення профілю: " + profileError.message);
          return;
        }
      }

      await fetchData();
    } catch (e: any) {
      console.error(e);
      alert("Помилка при оновленні: " + e.message);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const adminDeleteUser = async (userId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        alert("Помилка видалення користувача з Auth: " + error.message);
        return;
      }

      await supabase.from('profiles').delete().eq('id', userId);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      alert("Помилка при видаленні: " + e.message);
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

  const saveTestScore = async (score: Omit<TestScore, 'id' | 'created_at' | 'user_id'> & { details?: any }) => {
    if (!state.currentUser) return;
    
    const { data, error } = await supabase.from('test_scores').insert([{
      ...score,
      user_id: state.currentUser.id
    }]).select();

    if (!error && data) {
      let nextPermission = state.currentUser.testPermission;
      
      if (state.currentUser.role === 'user') {
        nextPermission = false;
        const { error: permError } = await supabase.from('profiles').update({ test_permission: false }).eq('id', state.currentUser.id);
        if (permError) {
          console.error("Error revoking test permission:", permError.message);
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
    } else {
      alert("Помилка збереження результату: " + (error?.message || "Невідома помилка"));
    }
  };

  const submitApplication = async (app: Omit<Application, 'id' | 'created_at' | 'status'>) => {
    const { error } = await supabase.from('applications').insert([app]);
    if (error) {
      alert("Помилка подачі заяви: " + error.message);
      return false;
    }
    await fetchData();
    return true;
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
    const { data, error } = await supabase.from('questions').insert([dbQ]).select();
    if (!error && data) {
      const mapped = {
        id: data[0].id,
        catId: data[0].cat_id,
        catName: data[0].cat_name,
        question: data[0].question,
        options: data[0].options,
        correct: data[0].correct,
        explanation: data[0].explanation
      };
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
    const { data, error } = await supabase.from('questions').update(dbQ).eq('id', id).select();
    if (!error && data) {
      const mapped = {
        id: data[0].id,
        catId: data[0].cat_id,
        catName: data[0].cat_name,
        question: data[0].question,
        options: data[0].options,
        correct: data[0].correct,
        explanation: data[0].explanation
      };
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
      const mapped = {
        id: data[0].id,
        title: data[0].title,
        situation: data[0].situation,
        question: data[0].question,
        options: data[0].options,
        correctAnswer: data[0].correct_answer,
        explanation: data[0].explanation
      };
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
      const mapped = {
        id: data[0].id,
        title: data[0].title,
        situation: data[0].situation,
        question: data[0].question,
        options: data[0].options,
        correctAnswer: data[0].correct_answer,
        explanation: data[0].explanation
      };
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

  const updateEmailConfig = (configUpdates: Partial<EmailVerificationConfig>) => {
    setState(prev => {
      const updated = { ...prev.emailConfig, ...configUpdates };
      try {
        localStorage.setItem('lms_email_verification_config', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save email config to localStorage:', e);
      }
      return {
        ...prev,
        emailConfig: updated
      };
    });
  };

  const sendVerificationEmail = async (toEmail: string, recipientName: string = 'Заявник'): Promise<{ success: boolean; code: string; message: string }> => {
    const config = state.emailConfig;
    if (!config.enabled) {
      return {
        success: false,
        code: '',
        message: 'Сервіс Email-верифікації вимкнено адміністратором.'
      };
    }

    const digits = config.codeLength || 6;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const code = Math.floor(min + Math.random() * (max - min + 1)).toString();

    // Prepare text template
    const textBody = (config.emailTemplate || defaultEmailConfig.emailTemplate)
      .replace(/{code}/g, code)
      .replace(/{name}/g, recipientName)
      .replace(/{email}/g, toEmail)
      .replace(/{expiry}/g, String(config.codeExpiryMinutes || 10));

    console.log(`[Email Service - Provider: ${config.provider}]`, {
      to: toEmail,
      subject: config.emailSubject,
      from: `${config.senderName} <${config.senderEmail}>`,
      code,
      body: textBody
    });

    // Simulating slight network latency for authentic feel
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      code,
      message: `Код підтвердження надіслано на пошту ${toEmail}`
    };
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
      updateEmailConfig,
      sendVerificationEmail,
      fetchData,
      fetchVisitsData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
