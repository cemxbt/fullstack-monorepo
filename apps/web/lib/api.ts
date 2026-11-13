import { createApiClient } from '@starter/contracts';

export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');
