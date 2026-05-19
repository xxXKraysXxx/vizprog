import { Link } from 'react-router-dom';

export function Notfound() {
  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h1>404</h1>
      <p>Страница не найдена</p>
      <Link to="/dashboard">На главную</Link>
    </div>
  );
}
