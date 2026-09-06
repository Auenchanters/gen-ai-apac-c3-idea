import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../errors/app-error.js';
import { parseModelOutput } from './output-schema.js';
import { buildPrompt } from './prompt-builder.js';
import { createGenerationGateway } from './generation-gateway.js';

const source = randomUUID();
const response = {
  reply: '<b>Thoughtful</b>\u0000 response',
  summary: 'Summary',
  themes: ['Work'],
  nextStep: 'Rest',
  proposals: [{ kind: 'preference', text: 'Enjoys quiet', sourceMessageIds: [source] }]
};

describe('untrusted Gemini output', () => {
  it('sanitizes all text and validates source provenance', () => {
    expect(parseModelOutput(JSON.stringify(response), [source]).reply).toBe('Thoughtful response');
    expect(
      parseModelOutput(JSON.stringify({ ...response, reply: 'line1\nline2\t' }), [source]).reply
    ).toBe('line1\nline2');
    expect(() => parseModelOutput(JSON.stringify(response), [])).toThrow();
    expect(() => parseModelOutput('not JSON', [source])).toThrow();
    expect(() => parseModelOutput('x'.repeat(20001), [source])).toThrow();
    expect(() =>
      parseModelOutput(JSON.stringify({ ...response, reply: 'x'.repeat(8001) }), [source])
    ).toThrow();
    expect(() =>
      parseModelOutput(JSON.stringify({ ...response, tools: ['fetch'] }), [source])
    ).toThrow();
  });

  it('includes only approved memories and newest bounded ordered history', () => {
    const prompt = buildPrompt({
      summary: 'Summary',
      tone: 'gentle',
      messages: [],
      memories: [
        {
          id: randomUUID(),
          kind: 'fact',
          text: 'Approved item',
          status: 'approved',
          sourceMessageIds: [source],
          revision: 1,
          createdAt: 1,
          updatedAt: 1
        },
        {
          id: randomUUID(),
          kind: 'fact',
          text: 'Unapproved secret',
          status: 'proposed',
          sourceMessageIds: [source],
          revision: 0,
          createdAt: 1,
          updatedAt: 1
        }
      ],
      userMessage: { id: source, text: 'Current entry' }
    });
    expect(JSON.stringify(prompt)).toContain('Approved item');
    expect(JSON.stringify(prompt)).not.toContain('Unapproved secret');
    expect(JSON.stringify(prompt)).toContain('Current entry');
  });

  it('follows the allowlisted ladder for recoverable errors only', async () => {
    const models: string[] = [];
    const gateway = createGenerationGateway((model) => {
      models.push(model);
      return models.length < 4
        ? Promise.reject(Object.assign(new Error('Unavailable'), { status: 503 }))
        : Promise.resolve(JSON.stringify(response));
    });
    expect(
      (
        await gateway({
          summary: '',
          tone: 'gentle',
          messages: [],
          memories: [],
          userMessage: { id: source, text: 'Hello' }
        })
      ).reply
    ).toBe('Thoughtful response');
    expect(models).toEqual([
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.7-flash'
    ]);
    const denied: string[] = [];
    await expect(
      createGenerationGateway((model) => {
        denied.push(model);
        return Promise.reject(Object.assign(new Error('Denied'), { status: 403 }));
      })({
        summary: '',
        tone: 'gentle',
        messages: [],
        memories: [],
        userMessage: { id: source, text: 'Hello' }
      })
    ).rejects.toMatchObject({ code: 'GENERATION_UNAVAILABLE' });
    expect(denied).toHaveLength(1);
    await expect(
      createGenerationGateway(() => Promise.reject(new Error('private transport failure')))({
        summary: '',
        tone: 'gentle',
        messages: [],
        memories: [],
        userMessage: { id: source, text: 'Hello' }
      })
    ).rejects.toMatchObject({ code: 'GENERATION_UNAVAILABLE' });
  });
});

describe('prompt and timeout boundaries', () => {
  it('bounds prompt history at the character ceiling and preserves user provenance', () => {
    const messages = Array.from({ length: 4 }, (_, sequence) => ({
      id: randomUUID(),
      role: sequence % 2 === 0 ? ('user' as const) : ('model' as const),
      text: 'x'.repeat(8000),
      sequence,
      requestId: randomUUID(),
      createdAt: 1
    }));
    const current = { id: randomUUID(), text: 'Current' };
    const prompt = buildPrompt({
      summary: 'x'.repeat(3000),
      tone: 'gentle',
      messages,
      memories: [],
      userMessage: current
    });
    expect(prompt.contents).toHaveLength(5);
    expect(prompt.sourceMessageIds).toContain(messages[2]?.id ?? '');
    expect(prompt.sourceMessageIds).not.toContain(messages[0]?.id ?? '');
    const context = JSON.parse(String(prompt.contents[0]?.parts?.[0]?.text)) as {
      context: { summary: string };
    };
    expect(context.context.summary).toHaveLength(2000);
  });

  it('propagates server-owned model errors and aborts a stalled transport', async () => {
    const input = {
      summary: '',
      tone: 'gentle',
      messages: [],
      memories: [],
      userMessage: { id: source, text: 'Hello' }
    };
    await expect(
      createGenerationGateway(() => Promise.reject(new AppError(422, 'MODEL_BLOCKED', 'Blocked')))(
        input
      )
    ).rejects.toMatchObject({ code: 'MODEL_BLOCKED' });

    vi.useFakeTimers();
    const stalled = createGenerationGateway(() => new Promise<string>(() => undefined))(input);
    const timedOut = expect(stalled).rejects.toMatchObject({ code: 'GENERATION_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(45000);
    await timedOut;
  });
});

afterEach(() => {
  vi.useRealTimers();
});
