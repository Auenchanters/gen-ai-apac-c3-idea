// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/auth.js';
import type { AuthAdapter } from '../auth/types.js';
import type { JournalDetail, Memory } from '../../lib/contracts.js';
import { useConversation } from './use-conversation.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const auth: AuthAdapter = {
  subscribe(listener) {
    listener({ status: 'signed-in', uid: 'alice', name: 'Amrita' });
    return () => undefined;
  },
  getToken: () => Promise.resolve('test-token'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve()
};

const journalId = 'c26b9a1a-45e7-42c7-971e-ddd6410b9277';
const requestId = 'cc35e7f6-185a-4aa9-bb65-6ee6cba1e4fe';
const detail: JournalDetail = {
  journal: {
    id: journalId,
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
};
const savedDetail: JournalDetail & { requestId: string; journalId: string } = {
  ...detail,
  journal: { ...detail.journal, summary: 'Saved thought', messageCount: 2, version: 1 },
  messages: [
    {
      id: 'af354fcd-5c20-4b79-93e4-901f42b91550',
      role: 'user',
      text: 'A thought',
      sequence: 0,
      requestId,
      createdAt: 1
    },
    {
      id: 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b',
      role: 'model',
      text: 'A reflection',
      sequence: 1,
      requestId,
      createdAt: 1
    }
  ],
  memories: [],
  requestId,
  journalId
};
const memory: Memory = {
  id: '32abca91-998f-4673-926d-47c3b67d21a0',
  kind: 'fact',
  text: 'Enjoys walking',
  status: 'proposed',
  sourceMessageIds: ['af354fcd-5c20-4b79-93e4-901f42b91550'],
  revision: 0,
  createdAt: 1,
  updatedAt: 1
};

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <AuthProvider adapter={auth}>{children}</AuthProvider>;
}

describe('conversation state machine', () => {
  it('does not send blank drafts, saves successful turns, and updates memories', async () => {
    const network = vi.fn().mockResolvedValue(new Response(JSON.stringify(savedDetail)));
    vi.stubGlobal('fetch', network);
    const view = renderHook(() => useConversation(detail), { wrapper });
    act(() => {
      view.result.current.revise();
    });
    act(() => {
      view.result.current.setDraft('  ');
    });
    await act(async () => {
      await view.result.current.send();
    });
    expect(network).not.toHaveBeenCalled();
    act(() => {
      view.result.current.setDraft(' A thought ');
    });
    await act(async () => {
      await view.result.current.send();
    });
    expect(view.result.current.draft).toBe('');
    expect(view.result.current.retry).toBeNull();
    expect(view.result.current.detail.messages).toHaveLength(2);
    act(() => {
      view.result.current.updateMemories([memory]);
    });
    expect(view.result.current.detail.memories).toEqual([memory]);
  });

  it('retains a failed draft and safely retries with the same request', async () => {
    const network = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"error":{"code":"GENERATION_UNAVAILABLE"}}', { status: 503 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(savedDetail)));
    vi.stubGlobal('fetch', network);
    const view = renderHook(() => useConversation(detail), { wrapper });
    act(() => {
      view.result.current.setDraft('Try again later');
    });
    await act(async () => {
      await view.result.current.send();
    });
    expect(view.result.current.error).toBe(
      'Gemini is unavailable right now. Your draft is still here.'
    );
    expect(view.result.current.retry).toEqual({
      requestId: expect.any(String),
      text: 'Try again later'
    });
    const firstBody = JSON.parse(String(network.mock.calls[0]?.[1]?.body));
    await act(async () => {
      await view.result.current.send();
    });
    const secondBody = JSON.parse(String(network.mock.calls[1]?.[1]?.body));
    expect(secondBody.requestId).toBe(firstBody.requestId);
    expect(view.result.current.error).toBeNull();
    expect(view.result.current.retry).toBeNull();
  });

  it('allows revision after a model refusal and ignores sends while pending', async () => {
    let resolve: (response: Response) => void = () => undefined;
    const network = vi.fn(
      () =>
        new Promise<Response>((finish) => {
          resolve = finish;
        })
    );
    vi.stubGlobal('fetch', network);
    const view = renderHook(() => useConversation(detail), { wrapper });
    act(() => {
      view.result.current.setDraft('Pending thought');
    });
    let first: Promise<void> | undefined;
    await act(async () => {
      first = view.result.current.send();
      await Promise.resolve();
    });
    expect(view.result.current.pending).toBe(true);
    await act(async () => {
      await view.result.current.send();
    });
    expect(network).toHaveBeenCalledTimes(1);
    resolve(new Response('{"error":{"code":"INVALID_INPUT"}}', { status: 400 }));
    await act(async () => {
      await first;
    });
    await waitFor(() => {
      expect(view.result.current.canRevise).toBe(true);
    });
    act(() => {
      view.result.current.revise();
    });
    expect(view.result.current.canRevise).toBe(false);
    expect(view.result.current.error).toBeNull();
    expect(view.result.current.retry).toBeNull();
  });
});

describe('conversation merge edge cases', () => {
  it('replaces an uncertain request while retaining unrelated messages', async () => {
    const previous: JournalDetail = {
      ...detail,
      messages: [
        {
          id: 'af354fcd-5c20-4b79-93e4-901f42b91550',
          role: 'user',
          text: 'Old attempt',
          sequence: 0,
          requestId,
          createdAt: 1
        },
        {
          id: 'b7a49c6d-7fc0-4d3c-9a4f-2d58b4d6656b',
          role: 'model',
          text: 'Keep me',
          sequence: 1,
          requestId: '704d9e67-3bf9-42f9-bf24-e5381c602fef',
          createdAt: 1
        }
      ]
    };
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(requestId);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(savedDetail))));
    const view = renderHook(() => useConversation(previous), { wrapper });
    act(() => {
      view.result.current.setDraft('A thought');
    });
    await act(async () => {
      await view.result.current.send();
    });
    expect(view.result.current.detail.messages).toHaveLength(3);
    expect(view.result.current.detail.messages.some((message) => message.text === 'Keep me')).toBe(
      true
    );
  });
});
