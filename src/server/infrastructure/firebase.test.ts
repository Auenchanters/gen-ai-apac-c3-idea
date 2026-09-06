import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApps, deleteApp } from 'firebase-admin/app';

import { createFirebaseServices } from './firebase.js';

afterEach(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)));
});

describe('Firebase runtime adapter', () => {
  it('uses a project-bound ADC app and reuses initialization', () => {
    const services = createFirebaseServices('daymark-test');
    expect(services.app.options.projectId).toBe('daymark-test');
    expect(createFirebaseServices('daymark-test').app).toBe(services.app);
  });
  it('checks revocation and never trusts client token decoding', async () => {
    const services = createFirebaseServices('daymark-test');
    const verify = vi.spyOn(services.auth, 'verifyIdToken').mockRejectedValue(new Error('denied'));
    await expect(services.verifyToken('test-token')).rejects.toThrow('denied');
    expect(verify).toHaveBeenCalledWith('test-token', true);
  });
  it('rejects a mismatched initialized project', () => {
    createFirebaseServices('daymark-test');
    expect(() => createFirebaseServices('another-project')).toThrow('Firebase project mismatch');
  });
});
