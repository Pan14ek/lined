import { USE_MOCKS } from '@/lib/apiClient';
import * as devApi from './dev';
import * as prodApi from './prod';

const impl = USE_MOCKS ? devApi : prodApi;

export const { login, refresh, logout, initializeCsrf, requestPasswordReset, resetPassword } = impl;
