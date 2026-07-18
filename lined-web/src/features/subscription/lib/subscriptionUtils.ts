export const formatShortDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const formatPlanPrice = (priceUsd: number): string => {
  return priceUsd === 0 ? 'Free' : `$${priceUsd.toFixed(2)}`;
}
