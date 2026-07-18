import type { ReactNode } from 'react';

interface AuthCardProps {
  heading: string;
  subheading: string;
  children: ReactNode;
}

export const AuthCard = ({ heading, subheading, children }: AuthCardProps) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-beige">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-green-light opacity-50" />
      <div className="absolute -bottom-16 -right-10 h-60 w-60 rounded-full bg-brand-beige-dark opacity-60" />

      <div className="relative z-10 w-[480px] max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-lg">
        <div className="h-1 bg-brand-green" />
        <div className="px-10 pb-10 pt-8">
          <div className="text-center text-3xl font-bold text-brand-green">Lined</div>
          <p className="mt-1.5 text-center text-[13px] text-text-muted">
            Where life and quality time meet
          </p>
          <div className="my-6 h-px bg-border" />
          <h1 className="text-[22px] font-bold text-text-primary">{heading}</h1>
          <p className="mt-1 text-[13px] text-text-secondary">{subheading}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
