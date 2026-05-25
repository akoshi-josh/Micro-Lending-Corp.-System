export const computeSchedule = (amount, rate, frequency, termMonths) => {
  const principal = parseFloat(amount) || 0;
  const interestRate = parseFloat(rate) || 0;
  const months = parseInt(termMonths) || 0;

  if (!principal || !months) return null;

  // Flat interest for the whole term
  const totalInterest = principal * (interestRate / 100);
  const totalAmount = principal + totalInterest;
  const monthlyPayment = totalAmount / months;

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

  // Round per period to 2 decimal places
  const roundedPerPeriod = Math.floor(perPeriod * 100) / 100;

  // Calculate what the last payment should be to make total exact
  const regularTotal = roundedPerPeriod * (totalPeriods - 1);
  const lastPayment = (totalAmount - regularTotal).toFixed(2);

  const schedule = [];
  for (let i = 1; i <= totalPeriods; i++) {
    schedule.push({
      period: i,
      label: `${intervalLabel} ${i}`,
      // Last payment adjusted to make total exact
      amount_due: i === totalPeriods
        ? lastPayment
        : roundedPerPeriod.toFixed(2)
    });
  }

  return {
    monthlyPayment,
    perPeriod: roundedPerPeriod,
    totalInterest,
    totalAmount,
    totalPeriods,
    lastPayment,
    schedule
  };
};