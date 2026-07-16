import { useMutation } from '@tanstack/react-query';
import { login } from '@/api/auth';
import { createUser } from '@/api/users';

export function useSignIn() {
  return useMutation({ mutationFn: login });
}

export function useSignUp() {
  return useMutation({ mutationFn: createUser });
}
