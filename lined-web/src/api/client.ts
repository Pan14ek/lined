import ky from 'ky';
import { useAuthStore } from '@/store/auth';

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        const userId = useAuthStore.getState().userId;
        if (userId !== null) {
          request.headers.set('X-User-Id', String(userId));
        }
      },
    ],
  },
});
