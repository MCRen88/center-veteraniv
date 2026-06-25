import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { Database } from '../lib/database.types';

export type Role = 'user' | 'teacher' | 'admin';

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
}

interface AppState {
  registry: RegistryItem[];
  questions: Question[];
  users: User[];
  applications: Application[];
  currentUser: User | null;
  originalAdminUser: User | null;
  isLoading: boolean;
}

interface AppContextType {
  state: AppState;
  addRegistryItem: (item: Omit<RegistryItem, 'id'>) => Promise<void>;
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
  // Admin Test Mgmt
  addQuestion: (q: Omit<Question, 'id'>) => Promise<void>;
  updateQuestion: (id: number, q: Omit<Question, 'id'>) => Promise<void>;
  deleteQuestion: (id: number) => Promise<void>;
  fetchData: () => Promise<void>;
}

const defaultState: AppState = {
  registry: [],
  questions: [],
  users: [],
  applications: [],
  currentUser: null,
  originalAdminUser: null,
  isLoading: true
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const fetchCurrentUserProfile = async (userId: string, email: string) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      const { data: scores } = await supabase.from('test_scores').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      return {
        id: profile.id,
        name: profile.name,
        email: email,
        role: profile.role as Role,
        testPermission: profile.test_permission,
        testScores: scores || []
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
    
    const questionsList = dbQuestions?.map((q: any) => ({
      id: q.id,
      catId: q.cat_id || q.catId,
      catName: q.cat_name || q.catName,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation
    })) || [];
    
    let usersList: User[] = [];
    let applicationsList: Application[] = [];
    
    // Retrieve current user profile dynamically to avoid stale state closures
    const { data: { session } } = await supabase.auth.getSession();
    let currentRole: string | null = null;
    if (session?.user) {
      const { data: profile, error: pSingleError } = await supabase
        .from('profiles')
        .select('role')
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
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
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
          testScores: allScores?.filter(s => s.user_id === p.id) || []
        }));
      }
      
      const { data: apps, error: appError } = await supabase.from('applications').select('*').order('created_at', { ascending: false });
      if (appError) {
        console.error('AppContext error fetching applications list:', appError.message);
      }
      if (apps) {
        applicationsList = apps;
      }
    }

    setState(prev => ({
      ...prev,
      questions: questionsList,
      registry: registry || [],
      users: usersList,
      applications: applicationsList,
      isLoading: false
    }));
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

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      alert("Невірний логін або пароль");
      return false;
    }
    return true;
  };

  const logout = async () => {
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
      await fetchData();
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

  return (
    <AppContext.Provider value={{ 
      state, 
      addRegistryItem, 
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
      addQuestion,
      updateQuestion,
      deleteQuestion,
      fetchData
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
