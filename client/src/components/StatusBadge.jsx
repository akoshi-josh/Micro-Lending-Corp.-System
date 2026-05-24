export default function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-50 text-green-700',
    paid: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-red-50 text-red-700',
    pending: 'bg-yellow-50 text-yellow-700',
    partial: 'bg-orange-50 text-orange-700',
  };

  const labels = {
    active: 'Active',
    paid: 'Paid',
    overdue: 'Overdue',
    pending: 'Pending',
    partial: 'Partial',
  };

  return (
    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  );
}