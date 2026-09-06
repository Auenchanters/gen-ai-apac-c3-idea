// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConversationState } from './use-conversation.js';
import { Composer } from './composer.js';

afterEach(cleanup);

function state(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    detail: {
      journal: {
        id: 'c26b9a1a-45e7-42c7-971e-ddd6410b9277',
        title: 'Today',
        tone: 'gentle',
        summary: '',
        themes: [],
        nextStep: '',
        messageCount: 0,
        version: 0,
        createdAt: 0,
        updatedAt: 0
      },
      messages: [],
      memories: []
    },
    draft: 'A thought',
    pending: false,
    error: 'Try again',
    retry: { requestId: 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe', text: 'A thought' },
    canRevise: true,
    setDraft: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    revise: vi.fn(),
    updateMemories: vi.fn(),
    ...overrides
  };
}

describe('reflection composer states', () => {
  it('renders retry feedback and the revise action', async () => {
    const current = state();
    render(<Composer state={current} />);
    expect(screen.getByRole('alert').textContent).toContain('Try again');
    expect(screen.getByRole('button', { name: 'Edit draft before a new attempt' })).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Edit draft before a new attempt' }));
    expect(current.revise).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Retry reflection' }));
    expect(current.send).toHaveBeenCalledTimes(1);
  });

  it('hides revision while a request is pending', () => {
    render(<Composer state={state({ pending: true, error: null, retry: null })} />);
    expect(screen.queryByRole('button', { name: 'Edit draft before a new attempt' })).toBeNull();
    const send = screen.getByRole('button', { name: 'Send reflection' });
    expect(send.textContent).toContain('Reflecting…');
    expect(send.hasAttribute('disabled')).toBe(true);
  });
});
