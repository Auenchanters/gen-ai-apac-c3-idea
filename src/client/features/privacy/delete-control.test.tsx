// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { DeleteControl } from './delete-control.js';

afterEach(cleanup);
it('requires an explicit confirmation and retains retry after a failed deletion', async () => {
  let attempts = 0;
  render(
    <DeleteControl
      label="Delete all journal data"
      description="This cannot be undone."
      onDelete={() => {
        attempts++;
        return Promise.reject(new Error('private-sentinel'));
      }}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Delete all journal data' }));
  const confirm = screen.getByRole('button', { name: 'Permanently delete' });
  expect(confirm.hasAttribute('disabled')).toBe(true);
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await userEvent.click(confirm);
  expect(attempts).toBe(1);
  expect((await screen.findByRole('alert')).textContent).not.toContain('private-sentinel');
  expect(screen.getByLabelText('Type DELETE to confirm')).toBeDefined();
});
