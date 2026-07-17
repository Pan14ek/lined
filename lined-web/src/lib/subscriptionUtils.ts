/** "28 Mar 2026" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Free" for a $0 plan, else "$9.99". */
export function formatPlanPrice(priceUsd: number): string {
  return priceUsd === 0 ? 'Free' : `$${priceUsd.toFixed(2)}`;
}
