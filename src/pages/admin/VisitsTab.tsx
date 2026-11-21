import React, { useState } from 'react';
import type { OnlineUser, User, VisitRecord } from '../../context/AppContext';

interface VisitsTabProps {
  onlineUsers: OnlineUser[];
  visits: VisitRecord[];
  users: User[];
  autoRefreshOnline: boolean;
  onToggleAutoRefresh: (value: boolean) => void;
  lastRefreshedAt: Date;
  onRefreshVisits: () => Promise<void>;
  timeAgo: (dateStr?: string | null) => string;
  onOpenUserAnalytics: (userId: string) => void;
  // Clock shared with the dashboard, refreshed by its polling (keeps render pure).
  nowMs: number;
}

const formatSessionDuration = (startStr?: string | null, lastSeenStr?: string | null) => {
  if (!startStr) return '-';
  const start = new Date(startStr).getTime();
  const end = lastSeenStr ? new Date(lastSeenStr).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  if (m === 0) return `${s} с`;
  return `${m} хв ${s} с`;
};

const exportVisitsToCsv = (items: VisitRecord[]) => {
  const headers = ['ID', 'Час події', 'ПІБ', 'Email', 'Роль', 'Подія', 'Сторінка', 'Браузер', 'ОС', 'Пристрій', 'Останній контакт'];
  const rows = items.map(v => [
    v.id || '',
    v.created_at ? new Date(v.created_at).toLocaleString('uk-UA') : '',
    `"${(v.user_name || 'Гість').replace(/"/g, '""')}"`,
    `"${(v.user_email || '').replace(/"/g, '""')}"`,
    v.user_role || 'guest',
    v.action || 'visit',
    `"${(v.path || '').replace(/"/g, '""')}"`,
    `"${(v.browser || '').replace(/"/g, '""')}"`,
    `"${(v.os || '').replace(/"/g, '""')}"`,
    v.device_type || 'Desktop',
    v.last_seen_at ? new Date(v.last_seen_at).toLocaleString('uk-UA') : ''
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `lms_visits_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const VisitsTab: React.FC<VisitsTabProps> = ({
  onlineUsers,
  visits,
  users,
  autoRefreshOnline,
  onToggleAutoRefresh,
  lastRefreshedAt,
  onRefreshVisits,
  timeAgo,
  onOpenUserAnalytics,
  nowMs
}) => {
  // Visits & Online Monitoring States
  const [visitsSearchTerm, setVisitsSearchTerm] = useState('');
  const [visitsRoleFilter, setVisitsRoleFilter] = useState('all');
  const [visitsPeriodFilter, setVisitsPeriodFilter] = useState('7days');
  const [visitsActionFilter, setVisitsActionFilter] = useState('all');
  const [visitsPage, setVisitsPage] = useState(1);
  const [visitsPerPage, setVisitsPerPage] = useState(20);
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'users' | 'guests'>('all');
  const [isRefreshingVisits, setIsRefreshingVisits] = useState(false);

  const handleRefreshVisits = async () => {
    setIsRefreshingVisits(true);
    await onRefreshVisits();
    setIsRefreshingVisits(false);
  };

  return (
    <div>
      {/* Top Header & Live Presence Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f2b5c 100%)',
        color: '#fff',
        padding: '22px 26px',
        borderRadius: '12px',
        marginBottom: '25px',
        boxShadow: '0 8px 24px rgba(30, 58, 138, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '18px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              background: '#2ecc71', 
              boxShadow: '0 0 12px #2ecc71',
              display: 'inline-block'
            }}></span>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '22px', fontFamily: 'Comfortaa, cursive' }}>
              Моніторинг відвідуваності та Онлайн
            </h3>
          </div>
          <p style={{ margin: 0, opacity: 0.85, fontSize: '13.5px' }}>
            Відстеження активності кандидатів, викладачів, адміністраторів та гостей у реальному часі.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.12)', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            fontSize: '12.5px',
            backdropFilter: 'blur(4px)'
          }}>
            Оновлено: <strong>{lastRefreshedAt.toLocaleTimeString('uk-UA')}</strong>
          </div>

          <button 
            className="btn btn-outline" 
            onClick={handleRefreshVisits}
            disabled={isRefreshingVisits}
            style={{ 
              color: '#fff', 
              borderColor: '#fff', 
              padding: '6px 14px', 
              fontSize: '12.5px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.08)',
              cursor: 'pointer'
            }}
          >
            <span>{isRefreshingVisits ? '⏳' : '🔄'}</span>
            <span>{isRefreshingVisits ? 'Оновлення...' : 'Оновити'}</span>
          </button>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '12.5px', 
            cursor: 'pointer',
            userSelect: 'none',
            background: 'rgba(255,255,255,0.1)',
            padding: '6px 12px',
            borderRadius: '20px'
          }}>
            <input 
              type="checkbox" 
              checked={autoRefreshOnline} 
              onChange={e => onToggleAutoRefresh(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            <span>Автооновлення (15с)</span>
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      {(() => {
        const onlineNow = (onlineUsers || []).filter(u => u.isOnline);
        const onlineAway = (onlineUsers || []).filter(u => u.isAway);
        const onlineRegistered = onlineNow.filter(u => u.role !== 'guest');
        const onlineGuests = onlineNow.filter(u => u.role === 'guest');

        // Unique today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayVisits = (visits || []).filter(v => v.created_at && new Date(v.created_at).getTime() >= todayStart.getTime());
        const uniqueTodaySet = new Set(todayVisits.map(v => v.user_id || v.session_id));
        const uniqueToday = uniqueTodaySet.size;

        // Total 7 days
        const now = nowMs;
        const visits7Days = (visits || []).filter(v => v.created_at && (now - new Date(v.created_at).getTime()) <= 7 * 86400000);
        const total7Days = visits7Days.length;

        // Total all time
        const totalAllTime = (visits || []).length;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '25px' }}>
            <div className="card" style={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: '#fff', 
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' 
            }}>
              <div style={{ fontSize: '30px', marginBottom: '6px' }}>🟢</div>
              <h3 style={{ fontSize: '30px', margin: '0 0 4px', color: '#fff', fontWeight: 'bold' }}>{onlineNow.length}</h3>
              <p style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '600' }}>Користувачів онлайн</p>
              <span style={{ fontSize: '11.5px', opacity: 0.95, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                {onlineRegistered.length} авт. + {onlineGuests.length} гостей {onlineAway.length > 0 ? `(${onlineAway.length} відійшли)` : ''}
              </span>
            </div>

            <div className="card" style={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              color: '#fff', 
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)' 
            }}>
              <div style={{ fontSize: '30px', marginBottom: '6px' }}>👥</div>
              <h3 style={{ fontSize: '30px', margin: '0 0 4px', color: '#fff', fontWeight: 'bold' }}>{uniqueToday}</h3>
              <p style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '600' }}>Унікальних за сьогодні</p>
              <span style={{ fontSize: '11.5px', opacity: 0.95, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                {todayVisits.length} сесій / переглядів
              </span>
            </div>

            <div className="card" style={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
              color: '#fff', 
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)' 
            }}>
              <div style={{ fontSize: '30px', marginBottom: '6px' }}>📈</div>
              <h3 style={{ fontSize: '30px', margin: '0 0 4px', color: '#fff', fontWeight: 'bold' }}>{total7Days}</h3>
              <p style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '600' }}>Візитів за 7 днів</p>
              <span style={{ fontSize: '11.5px', opacity: 0.95, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                Всього в журналі: {totalAllTime}
              </span>
            </div>

            <div className="card" style={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              color: '#fff', 
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)' 
            }}>
              <div style={{ fontSize: '30px', marginBottom: '6px' }}>🎯</div>
              <h3 style={{ fontSize: '30px', margin: '0 0 4px', color: '#fff', fontWeight: 'bold' }}>
                {(users || []).filter(u => u.role === 'user').length}
              </h3>
              <p style={{ margin: '0 0 6px', fontSize: '13.5px', fontWeight: '600' }}>Здобувачів у базі</p>
              <span style={{ fontSize: '11.5px', opacity: 0.95, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>
                {(users || []).filter(u => u.role === 'user' && u.testPermission).length} з допуском до тесту
              </span>
            </div>
          </div>
        );
      })()}

      {/* Online Users Live Monitor */}
      <div className="card mb-4" style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--dark-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🟢</span> Користувачі онлайн в теперішній час
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Особи, які активні на платформі прямо зараз (пінг за останні 5 хвилин).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`btn btn-sm ${onlineFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '16px' }}
              onClick={() => setOnlineFilter('all')}
            >
              Всі ({(onlineUsers || []).length})
            </button>
            <button 
              className={`btn btn-sm ${onlineFilter === 'users' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '16px' }}
              onClick={() => setOnlineFilter('users')}
            >
              Зареєстровані ({(onlineUsers || []).filter(u => u.role !== 'guest').length})
            </button>
            <button 
              className={`btn btn-sm ${onlineFilter === 'guests' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '16px' }}
              onClick={() => setOnlineFilter('guests')}
            >
              Гості ({(onlineUsers || []).filter(u => u.role === 'guest').length})
            </button>
          </div>
        </div>

        {(() => {
          const list = (onlineUsers || []).filter(u => {
            if (onlineFilter === 'users') return u.role !== 'guest';
            if (onlineFilter === 'guests') return u.role === 'guest';
            return true;
          });

          if (list.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '35px 20px', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>😴</span>
                <h5 style={{ margin: '0 0 4px', color: '#64748b' }}>Наразі немає активних користувачів</h5>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Користувачі з'являться тут автоматично при вході або переході по сайту</p>
              </div>
            );
          }

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {list.map(u => {
                const roleColor = u.role === 'admin' ? '#ef4444' : u.role === 'teacher' ? '#a855f7' : u.role === 'user' ? '#3b82f6' : '#64748b';
                const roleLabel = u.role === 'admin' ? 'Адміністратор' : u.role === 'teacher' ? 'Викладач' : u.role === 'user' ? 'Кандидат' : 'Гість';
                
                return (
                  <div 
                    key={u.id}
                    style={{
                      background: '#fff',
                      border: u.isOnline ? '1.5px solid #86efac' : '1.5px solid #fed7aa',
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: u.isOnline ? '0 4px 12px rgba(34, 197, 94, 0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: roleColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                        position: 'relative'
                      }}>
                        {u.name.slice(0, 1).toUpperCase()}
                        <span style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: u.isOnline ? '#22c55e' : '#f59e0b',
                          border: '2px solid #fff',
                          boxShadow: u.isOnline ? '0 0 6px #22c55e' : 'none'
                        }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h5 style={{ margin: 0, fontSize: '14.5px', fontWeight: 'bold', color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.name}
                          </h5>
                          <span style={{
                            background: `${roleColor}15`,
                            color: roleColor,
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            border: `1px solid ${roleColor}30`
                          }}>
                            {roleLabel}
                          </span>
                        </div>
                        {u.email && u.role !== 'guest' && (
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      background: '#f8fafc', 
                      borderRadius: '8px', 
                      padding: '10px 12px', 
                      fontSize: '12.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Поточний розділ:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: 'var(--dark-blue)', 
                          background: '#e2e8f0', 
                          padding: '2px 8px', 
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {u.currentPage}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>Пристрій:</span>
                        <span style={{ fontWeight: '500', color: '#334155' }}>
                          {u.currentDevice || 'Десктоп'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                        <span style={{ color: '#64748b' }}>Остання дія:</span>
                        <span style={{ color: u.isOnline ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>
                          {timeAgo(u.lastSeenAt)}
                        </span>
                      </div>
                    </div>

                    {u.role !== 'guest' && (
                      <div style={{ marginTop: '10px', textAlign: 'right' }}>
                        <button 
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--blue)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            padding: 0
                          }}
                          onClick={() => onOpenUserAnalytics(u.id)}
                        >
                          👤 Відкрити профіль та аналітику →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Attendance Analytics & Charts */}
      <div className="grid-2 mb-4" style={{ gap: '20px' }}>
        {/* Daily visit activity chart (last 7 days) */}
        <div className="card">
          <h4 className="mb-3" style={{ fontSize: '16px', color: 'var(--dark-blue)' }}>
            📊 Динаміка відвідувань за останні 7 днів
          </h4>
          {(() => {
            const days: { label: string; dateStr: string; count: number }[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dStr = d.toISOString().slice(0, 10);
              const label = d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
              
              const count = (visits || []).filter(v => v.created_at && v.created_at.slice(0, 10) === dStr).length;
              days.push({ label, dateStr: dStr, count });
            }

            const maxCount = Math.max(...days.map(d => d.count), 1);

            return (
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'space-between', 
                  height: '180px', 
                  padding: '10px 0 5px',
                  borderBottom: '2px solid #e2e8f0',
                  gap: '8px'
                }}>
                  {days.map((d, i) => {
                    const heightPct = Math.max(8, Math.round((d.count / maxCount) * 100));
                    const isToday = i === days.length - 1;
                    return (
                      <div key={d.dateStr} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: isToday ? '#2563eb' : '#64748b', marginBottom: '4px' }}>
                          {d.count}
                        </span>
                        <div style={{
                          width: '100%',
                          maxWidth: '38px',
                          height: `${heightPct}%`,
                          background: isToday 
                            ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' 
                            : 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease',
                          boxShadow: isToday ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                        }} title={`${d.label}: ${d.count} візитів`} />
                        <span style={{ fontSize: '11px', color: isToday ? '#1d4ed8' : '#64748b', fontWeight: isToday ? 'bold' : 'normal', marginTop: '6px', whiteSpace: 'nowrap' }}>
                          {d.label.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                  <span>Всього за 7 днів: <strong>{days.reduce((a, b) => a + b.count, 0)} візитів</strong></span>
                  <span>Середньодобово: <strong>{Math.round(days.reduce((a, b) => a + b.count, 0) / 7)} / день</strong></span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Popular Pages & Sections */}
        <div className="card">
          <h4 className="mb-3" style={{ fontSize: '16px', color: 'var(--dark-blue)' }}>
            🔥 Популярні розділи платформи
          </h4>
          {(() => {
            const pageCounts: { [key: string]: { count: number; name: string } } = {};
            (visits || []).forEach(v => {
              const p = v.path || '/';
              const name = v.page_title || p;
              if (!pageCounts[p]) {
                pageCounts[p] = { count: 0, name };
              }
              pageCounts[p].count += 1;
            });

            const sortedPages = Object.entries(pageCounts)
              .map(([path, data]) => ({ path, name: data.name, count: data.count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            const totalPageVisits = sortedPages.reduce((acc, p) => acc + p.count, 0) || 1;

            if (sortedPages.length === 0) {
              return <p className="text-muted">Дані щодо переглядів сторінок ще накопичуються.</p>;
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sortedPages.map((item, idx) => {
                  const pct = Math.round((item.count / totalPageVisits) * 100);
                  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={item.path}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-dark)' }}>
                          {item.name} <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>({item.path})</span>
                        </span>
                        <span style={{ fontWeight: 'bold', color }}>
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Devices and Roles Breakdown */}
      <div className="grid-2 mb-4" style={{ gap: '20px' }}>
        {/* Device & Browser summary */}
        <div className="card">
          <h4 className="mb-3" style={{ fontSize: '16px', color: 'var(--dark-blue)' }}>
            💻 Пристрої та браузери відвідувачів
          </h4>
          {(() => {
            let desktop = 0;
            let mobile = 0;
            let tablet = 0;
            const browserMap: { [key: string]: number } = {};

            (visits || []).forEach(v => {
              if (v.device_type === 'Mobile') mobile++;
              else if (v.device_type === 'Tablet') tablet++;
              else desktop++;

              const b = v.browser?.split(' ')[0] || 'Інше';
              browserMap[b] = (browserMap[b] || 0) + 1;
            });

            const total = (desktop + mobile + tablet) || 1;
            const dPct = Math.round((desktop / total) * 100);
            const mPct = Math.round((mobile / total) * 100);
            const tPct = Math.round((tablet / total) * 100);

            return (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px', textAlign: 'center' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '20px' }}>🖥️</span>
                    <h5 style={{ margin: '4px 0 2px', fontSize: '16px', color: '#1e293b' }}>{dPct}%</h5>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Десктоп ({desktop})</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '20px' }}>📱</span>
                    <h5 style={{ margin: '4px 0 2px', fontSize: '16px', color: '#1e293b' }}>{mPct}%</h5>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Мобільні ({mobile})</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '20px' }}>📟</span>
                    <h5 style={{ margin: '4px 0 2px', fontSize: '16px', color: '#1e293b' }}>{tPct}%</h5>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Планшети ({tablet})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Object.entries(browserMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([bName, bCount]) => (
                    <span key={bName} style={{ 
                      background: '#eff6ff', 
                      color: '#1d4ed8', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      border: '1px solid #bfdbfe'
                    }}>
                      🌐 {bName}: <strong>{bCount}</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Roles Breakdown */}
        <div className="card">
          <h4 className="mb-3" style={{ fontSize: '16px', color: 'var(--dark-blue)' }}>
            👥 Розподіл відвідувань за ролями
          </h4>
          {(() => {
            let adminCount = 0;
            let teacherCount = 0;
            let userCount = 0;
            let guestCount = 0;

            (visits || []).forEach(v => {
              if (v.user_role === 'admin') adminCount++;
              else if (v.user_role === 'teacher') teacherCount++;
              else if (v.user_role === 'user') userCount++;
              else guestCount++;
            });

            const total = (adminCount + teacherCount + userCount + guestCount) || 1;

            const roles = [
              { name: 'Кандидати (user)', count: userCount, color: '#3b82f6' },
              { name: 'Адміністратори (admin)', count: adminCount, color: '#ef4444' },
              { name: 'Викладачі (teacher)', count: teacherCount, color: '#a855f7' },
              { name: 'Гості (guest)', count: guestCount, color: '#64748b' }
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {roles.map(r => {
                  const pct = Math.round((r.count / total) * 100);
                  return (
                    <div key={r.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600' }}>{r.name}</span>
                        <span style={{ fontWeight: 'bold', color: r.color }}>{r.count} ({pct}%)</span>
                      </div>
                      <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ background: r.color, width: `${pct}%`, height: '100%', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Visits History Log */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--dark-blue)' }}>
              📜 Журнал історії відвідувань
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Детальний хронологічний запис входів, активних сесій та навігації по розділах.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => exportVisitsToCsv((visits || []))}
            >
              <span>📥</span>
              <span>Експорт в CSV</span>
            </button>
            <button 
              className="btn btn-outline" 
              style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => window.print()}
            >
              <span>🖨️</span>
              <span>Друк звіту</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Пошук</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="ПІБ, email, розділ, браузер..." 
              value={visitsSearchTerm} 
              onChange={e => { setVisitsSearchTerm(e.target.value); setVisitsPage(1); }} 
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Період</label>
            <select 
              className="form-control" 
              value={visitsPeriodFilter} 
              onChange={e => { setVisitsPeriodFilter(e.target.value); setVisitsPage(1); }}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="today">Сьогодні</option>
              <option value="yesterday">Вчора</option>
              <option value="7days">Останні 7 днів</option>
              <option value="30days">Останні 30 днів</option>
              <option value="all">Весь час</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Роль</label>
            <select 
              className="form-control" 
              value={visitsRoleFilter} 
              onChange={e => { setVisitsRoleFilter(e.target.value); setVisitsPage(1); }}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="all">Всі ролі</option>
              <option value="user">Кандидати (user)</option>
              <option value="teacher">Викладачі (teacher)</option>
              <option value="admin">Адміністратори (admin)</option>
              <option value="guest">Гості (guest)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Тип події</label>
            <select 
              className="form-control" 
              value={visitsActionFilter} 
              onChange={e => { setVisitsActionFilter(e.target.value); setVisitsPage(1); }}
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="all">Всі події</option>
              <option value="login">🔑 Вхід (login)</option>
              <option value="visit">👁️ Перегляд (visit)</option>
              <option value="logout">🚪 Вихід (logout)</option>
            </select>
          </div>
        </div>

        {/* Visits Table */}
        {(() => {
          const filtered = (visits || []).filter(v => {
            const matchesSearch = 
              (v.user_name || '').toLowerCase().includes(visitsSearchTerm.toLowerCase()) ||
              (v.user_email || '').toLowerCase().includes(visitsSearchTerm.toLowerCase()) ||
              (v.path || '').toLowerCase().includes(visitsSearchTerm.toLowerCase()) ||
              (v.browser || '').toLowerCase().includes(visitsSearchTerm.toLowerCase()) ||
              (v.os || '').toLowerCase().includes(visitsSearchTerm.toLowerCase());
            
            const matchesRole = visitsRoleFilter === 'all' || v.user_role === visitsRoleFilter;
            const matchesAction = visitsActionFilter === 'all' || v.action === visitsActionFilter;

            let matchesPeriod = true;
            if (v.created_at) {
              const vTime = new Date(v.created_at).getTime();
              const now = nowMs;
              if (visitsPeriodFilter === 'today') {
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                matchesPeriod = vTime >= todayStart.getTime();
              } else if (visitsPeriodFilter === 'yesterday') {
                const yStart = new Date();
                yStart.setDate(yStart.getDate() - 1);
                yStart.setHours(0, 0, 0, 0);
                const yEnd = new Date();
                yEnd.setDate(yEnd.getDate() - 1);
                yEnd.setHours(23, 59, 59, 999);
                matchesPeriod = vTime >= yStart.getTime() && vTime <= yEnd.getTime();
              } else if (visitsPeriodFilter === '7days') {
                matchesPeriod = (now - vTime) <= 7 * 86400000;
              } else if (visitsPeriodFilter === '30days') {
                matchesPeriod = (now - vTime) <= 30 * 86400000;
              }
            }

            return matchesSearch && matchesRole && matchesAction && matchesPeriod;
          });

          const totalItems = filtered.length;
          const totalPages = Math.ceil(totalItems / visitsPerPage) || 1;
          const startIndex = (visitsPage - 1) * visitsPerPage;
          const paginatedItems = filtered.slice(startIndex, startIndex + visitsPerPage);

          if (paginatedItems.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🔍</span>
                <h5 style={{ margin: '0 0 4px', color: '#64748b' }}>Записів не знайдено</h5>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Спробуйте змінити параметри пошуку або фільтри періоду</p>
              </div>
            );
          }

          return (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Час події</th>
                      <th>Користувач</th>
                      <th>Роль</th>
                      <th>Подія</th>
                      <th>Розділ / Сторінка</th>
                      <th>Пристрій & Браузер</th>
                      <th style={{ textAlign: 'center' }}>Останній контакт</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((v, index) => {
                      const isOnline = v.last_seen_at && (nowMs - new Date(v.last_seen_at).getTime() <= 120000);
                      const roleColor = v.user_role === 'admin' ? '#ef4444' : v.user_role === 'teacher' ? '#a855f7' : v.user_role === 'user' ? '#3b82f6' : '#64748b';
                      const roleLabel = v.user_role === 'admin' ? 'Адміністратор' : v.user_role === 'teacher' ? 'Викладач' : v.user_role === 'user' ? 'Кандидат' : 'Гість';
                      
                      const actionBadge = v.action === 'login' 
                        ? { text: '🔑 Вхід', bg: '#dbeafe', color: '#1d4ed8' }
                        : v.action === 'logout'
                        ? { text: '🚪 Вихід', bg: '#fee2e2', color: '#b91c1c' }
                        : { text: '👁️ Перегляд', bg: '#f1f5f9', color: '#475569' };

                      return (
                        <tr key={v.id || index}>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                              {v.created_at ? new Date(v.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {v.created_at ? new Date(v.created_at).toLocaleDateString('uk-UA') : ''}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: isOnline ? '#22c55e' : '#cbd5e1', 
                                display: 'inline-block',
                                flexShrink: 0,
                                boxShadow: isOnline ? '0 0 6px #22c55e' : 'none'
                              }} title={isOnline ? 'Онлайн зараз' : 'Офлайн'} />
                              <div>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-dark)', fontSize: '13.5px' }}>
                                  {v.user_name || 'Гість'}
                                </div>
                                {v.user_email && (
                                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {v.user_email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: `${roleColor}15`,
                              color: roleColor,
                              fontSize: '11.5px',
                              fontWeight: 'bold',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              border: `1px solid ${roleColor}30`
                            }}>
                              {roleLabel}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: actionBadge.bg,
                              color: actionBadge.color,
                              fontSize: '11.5px',
                              fontWeight: '600',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {actionBadge.text}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--dark-blue)', fontSize: '13px' }}>
                              {v.page_title || v.path}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {v.path}
                            </div>
                          </td>
                          <td style={{ fontSize: '12.5px' }}>
                            <div style={{ color: '#334155', fontWeight: '500' }}>
                              {v.device_type === 'Mobile' ? '📱' : v.device_type === 'Tablet' ? '📟' : '🖥️'} {v.browser || 'Браузер'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {v.os || 'ОС'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {isOnline ? (
                              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 Онлайн</span>
                            ) : (
                              <span style={{ color: '#64748b' }}>{timeAgo(v.last_seen_at || v.created_at)}</span>
                            )}
                            {v.created_at && v.last_seen_at && v.created_at !== v.last_seen_at && (
                              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                                тривалість {formatSessionDuration(v.created_at, v.last_seen_at)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Показано <strong>{startIndex + 1}–{Math.min(startIndex + visitsPerPage, totalItems)}</strong> із <strong>{totalItems}</strong> записів
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    disabled={visitsPage <= 1}
                    onClick={() => setVisitsPage(p => Math.max(1, p - 1))}
                  >
                    ← Попередня
                  </button>
                  
                  <span style={{ fontSize: '13px', padding: '0 8px', fontWeight: 'bold' }}>
                    {visitsPage} / {totalPages}
                  </span>

                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    disabled={visitsPage >= totalPages}
                    onClick={() => setVisitsPage(p => Math.min(totalPages, p + 1))}
                  >
                    Наступна →
                  </button>

                  <select 
                    value={visitsPerPage} 
                    onChange={e => { setVisitsPerPage(Number(e.target.value)); setVisitsPage(1); }}
                    className="form-control"
                    style={{ width: '80px', height: '32px', fontSize: '12px', marginLeft: '8px' }}
                  >
                    <option value="15">15</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
