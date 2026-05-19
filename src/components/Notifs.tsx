import { useAppDispatch, useAppSelector } from '@/store';
import { uiActions } from '@/redux/ui';
import { useEffect } from 'react';

export function Notifs() {
  const items = useAppSelector((s) => s.ui.notifications);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timers = items.map((n) =>
      setTimeout(() => dispatch(uiActions.dismissNotification(n.id)), 4000),
    );
    return () => timers.forEach(clearTimeout);
  }, [items, dispatch]);

  if (items.length === 0) return null;

  return (
    <div className="notifications">
      {items.map((n) => (
        <div key={n.id} className={`notification ${n.type}`}>
          <span>{n.message}</span>
          <button
            onClick={() => dispatch(uiActions.dismissNotification(n.id))}
            style={{ padding: '0 4px', border: 'none', background: 'none' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
