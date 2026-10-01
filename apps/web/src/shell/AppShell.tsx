/**
 * The shell of every signed-in screen: the header with the menu (UD-16), the project's name, demo
 * line and notices when a project is open (see ../wizard/ProjectLayout.tsx), and the page.
 *
 * Signing out (US-ADMIN-01 AC4) goes to sign-in whether or not the API answered: the session's
 * screens unmount, so no project data from it remains on screen.
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { useSession, useSessionUser } from '../session/SessionProvider';
import { HeaderMenu } from './HeaderMenu';
import { Shell } from './Shell';

export interface AppShellProps {
  readonly projectName?: DisplayObject;
  readonly demoLine?: ReactNode;
  readonly notices?: ReactNode;
  readonly children: ReactNode;
}

export function AppShell({ projectName, demoLine, notices, children }: AppShellProps) {
  const user = useSessionUser();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const onSignOut = () => {
    // The session is dropped on the page at once and sign-in replaces the screen, so nothing of a
    // project stays mounted while the API answers.
    signOut().catch(() => undefined);
    void navigate('/sign-in', { replace: true });
  };
  return (
    <Shell
      {...(projectName === undefined ? {} : { projectName })}
      menu={<HeaderMenu user={user} onSignOut={onSignOut} />}
      demoLine={demoLine}
      notices={notices}
    >
      {children}
    </Shell>
  );
}
