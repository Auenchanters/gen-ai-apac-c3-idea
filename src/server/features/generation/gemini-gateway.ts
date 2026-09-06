import { GoogleGenAI } from '@google/genai';
import { AppError } from '../../errors/app-error.js';
import { createGenerationGateway, type GenerationGateway } from './generation-gateway.js';
import { SYSTEM_INSTRUCTION } from './prompt-builder.js';

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'summary', 'themes', 'nextStep', 'proposals'],
  properties: {
    reply: { type: 'string', maxLength: 8000 },
    summary: { type: 'string', maxLength: 2000 },
    themes: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 60 } },
    nextStep: { type: 'string', maxLength: 500 },
    proposals: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'text', 'sourceMessageIds'],
        properties: {
          kind: { type: 'string', enum: ['fact', 'commitment', 'preference', 'question'] },
          text: { type: 'string', maxLength: 500 },
          sourceMessageIds: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } }
        }
      }
    }
  }
};

/** Creates the server-only official Gemini SDK integration.
 * @param authorizationKey - Service-account-bound Gemini authorization key supplied by Secret Manager.
 * @returns Validating, deadline-bound generation gateway.
 */
export function createGeminiGateway(authorizationKey: string): GenerationGateway {
  const client = new GoogleGenAI({ apiKey: authorizationKey });
  return createGenerationGateway(async (model, prompt, signal) => {
    const response = await client.models.generateContent({
      model,
      contents: prompt.contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema,
        temperature: 0.5,
        maxOutputTokens: 4096,
        abortSignal: signal,
        httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } }
      }
    });
    const text = response.text;
    if (text === undefined || text.trim() === '')
      throw new AppError(
        422,
        'MODEL_BLOCKED',
        'The model could not provide a reflection. Try revising your entry.'
      );
    return text;
  });
}
