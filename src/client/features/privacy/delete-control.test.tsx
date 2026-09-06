// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  const form = confirm.closest('form');
  if (form === null) throw new Error('Delete form missing');
  fireEvent.submit(form);
  expect(attempts).toBe(0);
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await userEvent.click(confirm);
  expect(attempts).toBe(1);
  expect((await screen.findByRole('alert')).textContent).not.toContain('private-sentinel');
  expect(screen.getByLabelText('Type DELETE to confirm')).toBeDefined();
});

it('clears an incomplete confirmation when cancelled', async () => {
  render(
    <DeleteControl
      label="Delete this journal"
      description="This cannot be undone."
      onDelete={() => Promise.resolve()}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Delete this journal' }));
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DE');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Delete this journal' })).toBeDefined();
});
