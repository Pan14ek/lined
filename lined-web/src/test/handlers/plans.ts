import { http, HttpResponse } from 'msw';
import { MOCK_PLANS } from '../data';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const planHandlers = [
  http.get(`${BASE}/plans`, () => {
    return HttpResponse.json(MOCK_PLANS);
  }),
];
