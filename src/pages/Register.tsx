import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { register } from '@/redux/auth';

export function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (auth.tokens) return <Navigate to="/dashboard" replace />;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Имя слишком короткое';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Некорректный email';
    if (password.length < 8) e.password = 'Пароль не короче 8 символов';
    if (password !== confirm) e.confirm = 'Пароли не совпадают';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    if (!validate()) return;
    const r = await dispatch(register({ name, email, password }));
    if (register.fulfilled.match(r)) navigate('/dashboard', { replace: true });
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={onSubmit}>
        <h1>Регистрация</h1>
        <div className="form-row">
          <label>Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>
        <div className="form-row">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>
        <div className="form-row">
          <label>Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>
        <div className="form-row">
          <label>Подтверждение пароля</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {errors.confirm && <span className="error-text">{errors.confirm}</span>}
        </div>
        {auth.error && <div className="error-text" style={{ marginBottom: 12 }}>{auth.error}</div>}
        <button type="submit" className="primary" disabled={auth.status === 'loading'} style={{ width: '100%' }}>
          {auth.status === 'loading' ? 'Загрузка...' : 'Создать аккаунт'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
