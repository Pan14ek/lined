import { useMutation } from '@tanstack/react-query';
import { login, requestPasswordReset, resetPassword } from '@/api/auth';
import { createUser } from '@/api/users';

export function useSignIn() {
  return useMutation({ mutationFn: login });
}

export function useSignUp() {
  return useMutation({ mutationFn: createUser });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword });
}
