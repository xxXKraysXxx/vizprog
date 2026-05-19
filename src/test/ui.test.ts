import { describe, expect, it } from 'vitest';
import reducer, { uiActions } from '../redux/ui';

describe('ui', () => {
  it('opens and closes modal', () => {
    let s = reducer(undefined, uiActions.openModal({ kind: 'createDocument' }));
    expect(s.modal?.kind).toBe('createDocument');
    s = reducer(s, uiActions.closeModal());
    expect(s.modal).toBeNull();
  });

  it('changes save status', () => {
    let s = reducer(undefined, uiActions.setSaveStatus('saving'));
    expect(s.saveStatus).toBe('saving');
    s = reducer(s, uiActions.setSaveError('Boom'));
    expect(s.saveStatus).toBe('error');
    expect(s.saveError).toBe('Boom');
  });

  it('adds notification with generated id', () => {
    const s = reducer(undefined, uiActions.addNotification({ type: 'success', message: 'ok' }));
    expect(s.notifications.length).toBe(1);
    expect(s.notifications[0].id).toBeTruthy();
  });
});
