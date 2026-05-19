import { useEffect } from 'react';
import { FORMULA_FUNCTIONS } from '@/utils';

interface Props {
  x: number;
  y: number;
  onPick: (name: string) => void;
  onClose: () => void;
}

export function FormulaMenu({ x, y, onPick, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('click', onClose);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClose);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="context-menu formula-function-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      {FORMULA_FUNCTIONS.map((name) => (
        <button
          key={name}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onPick(name);
            onClose();
          }}
        >
          {name}()
        </button>
      ))}
    </div>
  );
}
