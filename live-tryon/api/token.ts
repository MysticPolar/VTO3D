// Vercel Function: POST /api/token (server/handlers.ts)
import { handlersFor } from '../server/runtime.js';

export const POST = (req: Request) => handlersFor().token(req);
export const GET = POST;
