import { describe, expect, it, vi } from 'vitest';
import { loadedFiles, registerServiceWorker, workerUrl } from './registerServiceWorker';

const ORIGIN = 'https://stargazer.example';
const BUNDLE = ORIGIN + '/assets/main-D0X0CfP4.js';
const WORKER = '/sw.js?v=main-D0X0CfP4.js';

const fakeWindow = (readyState: DocumentReadyState, resources: string[] = []) => {
  const listeners: Array<() => void> = [];
  const win = {
    document: { readyState },
    location: { origin: ORIGIN, href: ORIGIN + '/' },
    performance: { getEntriesByType: () => resources.map((name) => ({ name })) },
    addEventListener: vi.fn((_type: string, fn: () => void) => listeners.push(fn)),
  } as unknown as Window;
  return { win, fireLoad: () => listeners.forEach((fn) => fn()) };
};

const fakeNavigator = () => {
  const postMessage = vi.fn();
  const register = vi.fn(() => Promise.resolve());
  const nav = { serviceWorker: { register, ready: Promise.resolve({ active: { postMessage } }) } } as unknown as Navigator;
  return { nav, register, postMessage };
};

describe('registerServiceWorker', () => {
  it('does nothing where service workers are not supported', () => {
    const { win } = fakeWindow('complete');
    expect(() => registerServiceWorker(BUNDLE, [], {} as Navigator, win)).not.toThrow();
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('registers the worker after the page has loaded', () => {
    const { nav, register } = fakeNavigator();
    const { win, fireLoad } = fakeWindow('loading');
    registerServiceWorker(BUNDLE, [], nav, win);
    expect(register).not.toHaveBeenCalled();
    fireLoad();
    expect(register).toHaveBeenCalledWith(WORKER);
  });

  it('registers at once when the page is already loaded, then hands over the files already loaded', async () => {
    const { nav, register, postMessage } = fakeNavigator();
    registerServiceWorker(BUNDLE, ['/assets/schedule.worker-X.js'], nav, fakeWindow('complete', [BUNDLE]).win);
    expect(register).toHaveBeenCalledWith(WORKER);
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: 'keep', urls: [ORIGIN + '/', BUNDLE, ORIGIN + '/assets/schedule.worker-X.js'] }));
  });

  it('names the worker after the build, so each deploy gets a fresh one', () => {
    expect(workerUrl(BUNDLE)).toBe(WORKER);
    expect(workerUrl(ORIGIN + '/assets/main-Zz9.js')).toBe('/sw.js?v=main-Zz9.js');
  });

  it('hands over only this site’s files, each once', () => {
    const { win } = fakeWindow('complete', [BUNDLE, BUNDLE, 'https://fonts.gstatic.com/x.woff2', 'https://stargazer.example.evil.com/a.js']);
    expect(loadedFiles(win)).toEqual([ORIGIN + '/', BUNDLE]);
  });
});
