/**
 * A route that does not exist, or a project id that is not one: no project data, a link to the
 * project list (which sends a visitor with no session to sign-in).
 */
import { Link } from 'react-router';
import { copy } from '../copy';
import { Shell } from '../shell/Shell';
import { useRenderReady } from '../shell/render-ready';

export function NotFoundPage() {
  useRenderReady(true);
  return (
    <Shell>
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="text-[22px] font-light">{copy.app.notFound}</h1>
        <Link
          to="/projects"
          className="text-[15px] text-(--sov-accent) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--sov-focus-ring)"
        >
          {copy.app.toProjects}
        </Link>
      </div>
    </Shell>
  );
}
