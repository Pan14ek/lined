import { useMutation } from '@tanstack/react-query';
import { login, requestPasswordReset, resetPassword } from '@/features/auth/api';
import { createUser } from '@/features/users/api';

export const useSignIn = () => {
  return useMutation({ mutationFn: login });
}

export const useSignUp = () => {
  return useMutation({ mutationFn: createUser });
}

export const useRequestPasswordReset = () => {
  return useMutation({ mutationFn: requestPasswordReset });
}

export const useResetPassword = () => {
  return useMutation({ mutationFn: resetPassword });
}
