import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export default function PrintWrapper({ title, children }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `MicroLend — ${title}`,
  });

  return (
    <div>
      <div className="flex justify-end mb-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 text-sm font-medium"
        >
          🖨️ Print
        </button>
      </div>
      <div ref={printRef}>
        <div className="hidden print:block mb-6 border-b pb-4">
          <h1 className="text-xl font-bold text-blue-700">MicroLend — {title}</h1>
          <p className="text-sm text-gray-500">
            Printed: {new Date().toLocaleDateString('en-PH', {
              year: 'numeric', month: 'long', day: '2-digit'
            })}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}