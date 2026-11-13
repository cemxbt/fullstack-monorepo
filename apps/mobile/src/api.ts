import { createApiClient } from '@starter/contracts';

export const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000');
