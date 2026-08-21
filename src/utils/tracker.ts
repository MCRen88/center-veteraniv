import { supabase } from '../lib/supabase';
import type { User } from '../context/AppContext';

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  userAgent: string;
  summary: string;
}

export interface VisitRecord {
  id?: string;
  user_id?: string | null;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  session_id: string;
  path: string;
  page_title?: string;
  action: 'visit' | 'login' | 'heartbeat' | 'logout';
  ip_address?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device_type?: 'Desktop' | 'Mobile' | 'Tablet';
  created_at?: string;
  last_seen_at?: string;
}

/**
 * Returns clean client device, OS, and browser information
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: 'Невідомо',
      os: 'Невідомо',
      deviceType: 'Desktop',
      userAgent: '',
      summary: 'Невідомий пристрій'
    };
  }

  const ua = navigator.userAgent;

  // 1. Device Type
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet|PlayBook/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'Mobile';
  }

  // 2. Operating System
  let os = 'Невідома ОС';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
  else if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9.]+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Browser
  let browser = 'Невідомий браузер';
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/OPR\/([0-9.]+)/i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/([0-9.]+)/);
    browser = `Opera ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Chrome\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Version\/([0-9.]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/);
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  }

  const icon = deviceType === 'Mobile' ? '📱' : deviceType === 'Tablet' ? '📟' : '🖥️';
  const summary = `${icon} ${browser} (${os})`;

  return {
    browser,
    os,
    deviceType,
    userAgent: ua,
    summary
  };
}

/**
 * Returns or generates a stable session ID for current browser tab/session
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  
  let sessionId = sessionStorage.getItem('lms_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem('lms_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Human readable page titles for LMS routes
 */
export function getPageTitle(path: string): string {
  if (!path || path === '/') return 'Головна сторінка';
  if (path.startsWith('/docs')) return 'Нормативна база';
  if (path.startsWith('/test-analysis')) return 'Аналіз тестування';
  if (path.startsWith('/test')) return 'Тестування знань';
  if (path.startsWith('/application')) return 'Подання заяви';
  if (path.startsWith('/registry')) return 'Реєстр кваліфікацій';
  if (path.startsWith('/login')) return 'Вхід у систему';
  if (path.startsWith('/dashboard')) return 'Особистий кабінет';
  if (path.startsWith('/admin')) return 'Панель адміністратора';
  return path;
}

// Memory throttle cache to prevent duplicate inserts on quick re-renders
let lastTrackedPath = '';
let lastTrackedTime = 0;
let currentVisitDbId: string | null = null;

/**
 * Track user activity (visit, login, heartbeat, logout)
 */
export async function trackActivity(params: {
  path: string;
  action: 'visit' | 'login' | 'heartbeat' | 'logout';
  user?: User | null;
  pageTitle?: string;
}): Promise<void> {
  try {
    const now = Date.now();
    const { path, action, user } = params;
    const sessionId = getSessionId();
    const deviceInfo = getDeviceInfo();
    const pageTitle = params.pageTitle || getPageTitle(path);

    // Skip duplicate visit logs within 2 seconds for same path
    if (action === 'visit' && path === lastTrackedPath && now - lastTrackedTime < 2000) {
      return;
    }

    lastTrackedPath = path;
    lastTrackedTime = now;

    const userName = user ? user.name : 'Гість';
    const userEmail = user ? user.email : '';
    const userRole = user ? user.role : 'guest';
    const userId = user ? user.id : null;

    // 1. Insert into user_visits table
    if (action === 'visit' || action === 'login' || action === 'logout' || !currentVisitDbId) {
      const { data, error } = await supabase
        .from('user_visits')
        .insert([{
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          user_role: userRole,
          session_id: sessionId,
          path,
          page_title: pageTitle,
          action,
          user_agent: deviceInfo.userAgent,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.deviceType,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (!error && data) {
        currentVisitDbId = data.id;
      }
    } else if (action === 'heartbeat' && currentVisitDbId) {
      // Update existing visit record last_seen_at
      await supabase
        .from('user_visits')
        .update({
          path,
          page_title: pageTitle,
          last_seen_at: new Date().toISOString()
        })
        .eq('id', currentVisitDbId);
    }

    // 2. If user is authenticated, update public.profiles for fast real-time online status
    if (user && user.id) {
      const profileUpdates: any = {
        last_seen_at: action === 'logout' 
          ? new Date(Date.now() - 15 * 60 * 1000).toISOString() // mark offline immediately
          : new Date().toISOString(),
        current_page: path,
        current_device: deviceInfo.summary
      };

      if (action === 'login') {
        profileUpdates.last_sign_in_at = new Date().toISOString();
      }

      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
    }
  } catch (err) {
    console.warn('Track activity error (non-critical):', err);
  }
}
