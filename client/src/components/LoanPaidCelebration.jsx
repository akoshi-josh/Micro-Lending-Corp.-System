import { useEffect, useRef } from 'react';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function LoanPaidCelebration({ borrower, loan, stats, onNewLoan, onClose }) {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: 4 + Math.random() * 6,
      color: ['#16a34a','#22c55e','#86efac','#fbbf24','#34d399','#a3e635','#4ade80'][Math.floor(Math.random() * 7)],
      speed: 2 + Math.random() * 3,
      spin: (Math.random() - 0.5) * 0.2,
      angle: 0,
      isCircle: Math.random() > 0.5,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
        }
        ctx.restore();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalInterest = parseFloat(stats?.loan_amount || 0) * parseFloat(stats?.interest_rate || 0) / 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Modal */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 relative z-10"
        style={{ animation: 'celebPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        <style>{`
          @keyframes celebPopIn {
            0% { transform: scale(0) rotate(-8deg); opacity: 0; }
            70% { transform: scale(1.06) rotate(1deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes celebBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes celebFadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Trophy */}
        <div
          className="text-6xl mb-3 block"
          style={{ animation: 'celebBounce 2s ease-in-out infinite 0.6s' }}
        >
          🏆
        </div>

        {/* Badge */}
        <div className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3"
          style={{ animation: 'celebFadeUp 0.4s ease 0.2s both' }}>
          Loan Fully Paid
        </div>

        <h2
          className="text-2xl font-bold text-gray-800 mb-1"
          style={{ animation: 'celebFadeUp 0.4s ease 0.3s both' }}
        >
          Congratulations!
        </h2>
        <p
          className="text-sm text-gray-500 mb-5"
          style={{ animation: 'celebFadeUp 0.4s ease 0.4s both' }}
        >
          {borrower?.full_name} has completed all payments successfully.
          All obligations have been cleared.
        </p>

        {/* Stats grid */}
        <div
          className="grid grid-cols-2 gap-2 mb-5"
          style={{ animation: 'celebFadeUp 0.4s ease 0.5s both' }}
        >
          {[
            { label: 'Total Paid', value: formatCurrency(stats?.total_paid) },
            { label: 'Interest Earned', value: formatCurrency(totalInterest) },
            { label: 'Term', value: `${loan?.term_months} months` },
            { label: 'Frequency', value: loan?.payment_frequency?.replace('_', '-') },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 font-medium mb-1">{m.label}</div>
              <div className="text-sm font-bold text-gray-800 capitalize">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-2" style={{ animation: 'celebFadeUp 0.4s ease 0.6s both' }}>
          {onNewLoan && (
            <button
              onClick={onNewLoan}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
            >
              + Issue New Loan
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}