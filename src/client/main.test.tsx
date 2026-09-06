// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const mainMocks = vi.hoisted(() => ({
  render: vi.fn(),
  createRoot: vi.fn(),
  App: vi.fn(() => null),
  createFirebaseAuth: vi.fn(() => ({
    subscribe: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn()
  }))
}));

vi.mock('react-dom/client', () => ({
  createRoot: mainMocks.createRoot
}));
vi.mock('./app/app.js', () => ({ App: mainMocks.App }));
vi.mock('./features/auth/firebase-auth.js', () => ({
  createFirebaseAuth: mainMocks.createFirebaseAuth
}));

afterEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
  vi.clearAllMocks();
});

describe('browser entrypoint', () => {
  it('mounts the application into the required root element', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);
    mainMocks.createRoot.mockReturnValue({ render: mainMocks.render });
    await import('./main.js');
    expect(mainMocks.createRoot).toHaveBeenCalledWith(root);
    expect(mainMocks.render).toHaveBeenCalledTimes(1);
    expect(mainMocks.App).not.toHaveBeenCalled();
    expect(mainMocks.createFirebaseAuth).toHaveBeenCalledTimes(1);
  });

  it('fails fast when the HTML shell has no root element', async () => {
    await expect(import('./main.js')).rejects.toThrow('The application root is missing.');
    expect(mainMocks.createRoot).not.toHaveBeenCalled();
  });
});
