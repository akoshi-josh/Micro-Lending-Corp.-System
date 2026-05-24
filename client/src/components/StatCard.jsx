export default function StatCard({ title, value, subtitle, color = 'blue' }) {
  const colors = {
    blue: 'border-blue-200 bg-white',
    green: 'border-green-200 bg-white',
    yellow: 'border-yellow-200 bg-white',
    red: 'border-red-200 bg-white',
  };

  const textColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
  };

  return (
    <div className={`rounded-xl border-2 ${colors[color]} p-5 shadow-sm`}>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}