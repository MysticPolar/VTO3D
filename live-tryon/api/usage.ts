// Vercel Function: POST /api/usage (server/handlers.ts)
import { handlersFor } from '../server/runtime.js';

export const POST = (req: Request) => handlersFor().usage(req);
export const GET = POST;
