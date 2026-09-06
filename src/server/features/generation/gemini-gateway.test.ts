import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const geminiMocks = vi.hoisted(() => {
  const generateContent = vi.fn();
  class GoogleGenAIMock {
    readonly models = { generateContent };
    constructor(readonly options: { readonly apiKey: string }) {}
  }
  return { generateContent, GoogleGenAIMock };
});

vi.mock('@google/genai', () => ({ GoogleGenAI: geminiMocks.GoogleGenAIMock }));

import { createGeminiGateway } from './gemini-gateway.js';

const input = {
  summary: 'A short summary',
  tone: 'gentle',
  messages: [],
  memories: [],
  userMessage: { id: randomUUID(), text: 'I want to reflect.' }
};

beforeEach(() => {
  geminiMocks.generateContent.mockReset();
});

describe('official Gemini gateway adapter', () => {
  it('passes server-owned controls to the SDK and validates its JSON response', async () => {
    geminiMocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        reply: 'A thoughtful reply',
        summary: 'A summary',
        themes: ['Reflection'],
        nextStep: 'Take a breath',
        proposals: []
      })
    });
    const result = await createGeminiGateway('authorization-key')(input);
    expect(result.reply).toBe('A thoughtful reply');
    expect(geminiMocks.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.6-flash',
        contents: expect.any(Array),
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          temperature: 0.5,
          maxOutputTokens: 4096,
          httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } }
        })
      })
    );
    expect(geminiMocks.GoogleGenAIMock).toBeDefined();
  });

  it.each([undefined, '   '])('maps an empty SDK response to a safe refusal (%s)', async (text) => {
    geminiMocks.generateContent.mockResolvedValue({ text });
    await expect(createGeminiGateway('authorization-key')(input)).rejects.toMatchObject({
      status: 422,
      code: 'MODEL_BLOCKED'
    });
  });
});
