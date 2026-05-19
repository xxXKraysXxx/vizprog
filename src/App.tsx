import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Notifs } from '@components/Notifs';

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Notifs />
    </>
  );
}
