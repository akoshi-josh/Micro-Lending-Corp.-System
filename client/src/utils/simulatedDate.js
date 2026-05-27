const KEY = 'microlend_simulated_date';

export const getToday = () => {
  const stored = localStorage.getItem(KEY);
  if (stored) return new Date(stored);
  return new Date();
};

export const setSimulatedDate = (dateStr) => {
  if (dateStr) {
    localStorage.setItem(KEY, dateStr);
  } else {
    localStorage.removeItem(KEY);
  }
};

export const getSimulatedDate = () => {
  return localStorage.getItem(KEY) || null;
};

export const clearSimulatedDate = () => {
  localStorage.removeItem(KEY);
};