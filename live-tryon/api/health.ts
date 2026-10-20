// Vercel Function: GET /api/health (server/handlers.ts)
import { handlersFor } from '../server/runtime.js';

export const GET = (req: Request) => handlersFor().health(req);
export const POST = GET;
