export default function ProgressBar({ paid, total }) {
  const percent = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{percent.toFixed(0)}% paid</span>
        <span>{(100 - percent).toFixed(0)}% remaining</span>
      </div>
      <div className="w-full bg-blue-100 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}