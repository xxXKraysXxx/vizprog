import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { login } from '@/redux/auth';

interface LocationState {
  from?: string;
}

export function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  if (auth.tokens) return <Navigate to="/dashboard" replace />;

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Некорректный email';
    if (password.length < 8) e.password = 'Пароль не короче 8 символов';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      const target = (location.state as LocationState | null)?.from ?? '/dashboard';
      navigate(target, { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={onSubmit}>
        <h1>Вход</h1>
        <div className="form-row">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
        <div className="form-row">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        {auth.error && <div className="error-text" style={{ marginBottom: 12 }}>{auth.error}</div>}
        <button type="submit" className="primary" disabled={auth.status === 'loading'} style={{ width: '100%' }}>
          {auth.status === 'loading' ? 'Загрузка...' : 'Войти'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
}
