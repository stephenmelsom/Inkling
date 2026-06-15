import { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminShell } from './AdminShell';
import { clearToken, getToken } from './adminApi';
import './admin.css';

/**
 * The admin surface ("the bindery"). Holds auth state: until a valid token is
 * stored, the stage-door login is shown; after that, the working shell. Any
 * request that comes back 401 clears the token and drops back to login.
 */
export function AdminApp() {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getToken()));

  function signOut() {
    clearToken();
    setAuthed(false);
  }

  return (
    <div className="bindery">
      {authed ? (
        <AdminShell onSignOut={signOut} onUnauthorized={signOut} />
      ) : (
        <AdminLogin onAuthed={() => setAuthed(true)} />
      )}
    </div>
  );
}
