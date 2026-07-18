import { CircleCheck, TriangleAlert } from 'lucide-react';

interface AuthAlertProps {
  message: string;
  variant?: 'error' | 'success';
}

const VARIANT_CLASSES: Record<NonNullable<AuthAlertProps['variant']>, string> = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400',
  success: 'border-brand-green/30 bg-brand-green-light text-brand-green-dark dark:text-brand-green',
};

export const AuthAlert = ({ message, variant = 'error' }: AuthAlertProps) => {
  const Icon = variant === 'success' ? CircleCheck : TriangleAlert;
  return (
    <div
      role="alert"
      className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
