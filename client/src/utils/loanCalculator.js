export const computeSchedule = (amount, rate, frequency, termMonths) => {
  const principal = parseFloat(amount) || 0;
  const interestRate = parseFloat(rate) || 0;
  const months = parseInt(termMonths) || 0;

  if (!principal || !months) return null;

  const monthlyPayment = (principal / months) + (principal * interestRate / 100);
  const totalInterest = principal * interestRate / 100 * months;
  const totalAmount = principal + totalInterest;

  let perPeriod = monthlyPayment;
  let totalPeriods = months;
  let intervalLabel = 'Month';

  if (frequency === 'semi_monthly') {
    perPeriod = monthlyPayment / 2;
    totalPeriods = months * 2;
    intervalLabel = 'Period';
  } else if (frequency === 'weekly') {
    perPeriod = monthlyPayment / 4;
    totalPeriods = months * 4;
    intervalLabel = 'Week';
  }

  const schedule = [];
  for (let i = 1; i <= totalPeriods; i++) {
    schedule.push({
      period: i,
      label: `${intervalLabel} ${i}`,
      amount_due: perPeriod.toFixed(2)
    });
  }

  return {
    monthlyPayment,
    perPeriod,
    totalInterest,
    totalAmount,
    totalPeriods,
    schedule
  };
};