import { parseRoute, type Route } from './lib/routes.ts';
import { isMock } from './net/mode.ts';

/** Path with ?mock=1 kept while the demo mode is on. */
export function href(path: string): string {
  if (!isMock()) return path;
  return path.includes('?') ? `${path}&mock=1` : `${path}?mock=1`;
}

class Router {
  route: Route = $state(parseRoute(location.pathname, location.search));

  constructor() {
    addEventListener('popstate', () => this.#sync());
  }

  navigate(path: string, options: { replace?: boolean } = {}): void {
    const target = href(path);
    if (options.replace) history.replaceState(null, '', target);
    else history.pushState(null, '', target);
    this.#sync();
    scrollTo(0, 0);
  }

  /** onclick for <a href>: in-app navigation without a page load. */
  link = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = event.currentTarget as HTMLAnchorElement | null;
    if (!anchor || anchor.target === '_blank' || anchor.origin !== location.origin) return;
    event.preventDefault();
    history.pushState(null, '', anchor.pathname + anchor.search);
    this.#sync();
    scrollTo(0, 0);
  };

  #sync(): void {
    this.route = parseRoute(location.pathname, location.search);
  }
}

export const router = new Router();
