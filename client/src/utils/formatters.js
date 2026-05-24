export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
};

export const formatPercent = (value) => {
  return `${parseFloat(value || 0).toFixed(2)}%`;
};