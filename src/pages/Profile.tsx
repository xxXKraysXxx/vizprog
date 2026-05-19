import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { changePassword, updateProfile } from '@/redux/auth';
import { uiActions } from '@/redux/ui';

export function Profile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const docs = useAppSelector((s) => s.documents.list);

  const [name, setName] = useState(user?.name ?? '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const onSaveName = async (): Promise<void> => {
    if (!name.trim() || name === user.name) return;
    const r = await dispatch(updateProfile({ name: name.trim() }));
    if (updateProfile.fulfilled.match(r)) {
      dispatch(uiActions.addNotification({ type: 'success', message: 'Имя обновлено' }));
    }
  };

  const onChangePassword = async (): Promise<void> => {
    const errs: Record<string, string> = {};
    if (newPassword.length < 8) errs.new = 'Не короче 8 символов';
    if (newPassword !== confirm) errs.confirm = 'Пароли не совпадают';
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const r = await dispatch(changePassword({ oldPassword, newPassword }));
    if (changePassword.fulfilled.match(r)) {
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      dispatch(uiActions.addNotification({ type: 'success', message: 'Пароль изменён' }));
    } else {
      dispatch(uiActions.addNotification({ type: 'error', message: (r.payload as string) ?? 'Ошибка' }));
    }
  };

  return (
    <div className="profile">
      <h1>Профиль</h1>
      <section>
        <h2>Основная информация</h2>
        <div className="form-row">
          <label>Email</label>
          <input value={user.email} disabled />
        </div>
        <div className="form-row">
          <label>Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="primary" onClick={onSaveName} disabled={!name.trim() || name === user.name}>
          Сохранить
        </button>
      </section>

      <section>
        <h2>Смена пароля</h2>
        <div className="form-row">
          <label>Старый пароль</label>
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Новый пароль</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {pwErrors.new && <span className="error-text">{pwErrors.new}</span>}
        </div>
        <div className="form-row">
          <label>Подтверждение</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {pwErrors.confirm && <span className="error-text">{pwErrors.confirm}</span>}
        </div>
        <button className="primary" onClick={onChangePassword} disabled={!oldPassword || !newPassword}>
          Сменить пароль
        </button>
      </section>

      <section>
        <h2>Статистика</h2>
        <p>Документов: {docs.length}</p>
        <p>Дата регистрации: {new Date(user.createdAt).toLocaleDateString('ru-RU')}</p>
      </section>
    </div>
  );
}
