import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/redux/auth';
import { uiActions } from '@/redux/ui';

export function Layout() {
  const user = useAppSelector((s) => s.auth.user);
  const saveStatus = useAppSelector((s) => s.ui.saveStatus);
  const theme = useAppSelector((s) => s.ui.theme);
  const [showSaved, setShowSaved] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogout = async (): Promise<void> => {
    await dispatch(logout());
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    setShowSaved(true);
    const timer = window.setTimeout(() => setShowSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const statusText =
    saveStatus === 'saving'
      ? 'Сохранение...'
      : saveStatus === 'saved' && showSaved
        ? 'Сохранено'
        : saveStatus === 'error'
          ? 'Ошибка сохранения'
          : '';

  return (
    <div className="app-layout">
      <header className="header">
        <div className="app-title">Табличный процессор</div>
        <div className="spacer" />
        {statusText && <span className={`save-status ${saveStatus}`}>{statusText}</span>}
        {user && <span style={{ color: 'var(--color-muted)' }}>{user.name}</span>}
        <button className="theme-toggle" onClick={() => dispatch(uiActions.toggleTheme())}>
          {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        </button>
        <button onClick={onLogout}>Выйти</button>
      </header>
      <aside className="sidebar">
        <nav>
          <NavLink to="/dashboard">Мои документы</NavLink>
          <NavLink to="/profile">Профиль</NavLink>
        </nav>
      </aside>
      <main className="body">
        <Outlet />
      </main>
    </div>
  );
}
