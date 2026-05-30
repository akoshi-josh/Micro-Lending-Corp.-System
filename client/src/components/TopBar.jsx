import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function TopBar({ title }) {
  const { user } = useAuth();
  const [showCalc, setShowCalc] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [calculated, setCalculated] = useState(false);
  const calcRef = useRef();

  const [position, setPosition] = useState({ x: null, y: null });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    const rect = calcRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Reset position when opening
  const handleToggleCalc = () => {
    if (!showCalc) setPosition({ x: null, y: null });
    setShowCalc(v => !v);
  };

  const handleButton = (value) => {
    if (value === 'C') {
      setDisplay('0');
      setExpression('');
      setCalculated(false);
      return;
    }
    if (value === '⌫') {
      if (display.length > 1) setDisplay(display.slice(0, -1));
      else setDisplay('0');
      return;
    }
    if (value === '=') {
      try {
        let expr = expression + display;
        expr = expr.replace(/(\d+\.?\d*)%/g, (match, num) => `(${num}/100)`);
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        const rounded = parseFloat(result.toFixed(10)).toString();
        setDisplay(rounded);
        setExpression('');
        setCalculated(true);
      } catch {
        setDisplay('Error');
        setExpression('');
        setCalculated(false);
      }
      return;
    }
    if (['+', '-', '×', '÷'].includes(value)) {
      const op = value === '×' ? '*' : value === '÷' ? '/' : value;
      if (calculated) {
        setExpression(display + op);
        setDisplay('0');
        setCalculated(false);
      } else {
        setExpression(expression + display + op);
        setDisplay('0');
      }
      return;
    }
    if (value === '%') { setDisplay(display + '%'); return; }
    if (value === '.') { if (!display.includes('.')) setDisplay(display + '.'); return; }
    if (calculated) {
      setDisplay(value);
      setExpression('');
      setCalculated(false);
    } else {
      setDisplay(display === '0' ? value : display + value);
    }
  };

  const formatDisplay = (val) => {
    if (val === 'Error' || val.includes('%')) return val;
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (val.includes('.')) {
      const parts = val.split('.');
      return parseInt(parts[0]).toLocaleString() + '.' + parts[1];
    }
    return num.toLocaleString();
  };

  const buttons = [
    ['C', '⌫', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  const getButtonStyle = (btn) => {
    if (btn === '=') return 'col-span-2 bg-blue-700 text-white hover:bg-blue-800 text-lg font-bold';
    if (['÷', '×', '-', '+'].includes(btn)) return 'bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold text-lg';
    if (btn === 'C') return 'bg-red-100 text-red-600 hover:bg-red-200 font-bold';
    if (btn === '⌫') return 'bg-orange-100 text-orange-600 hover:bg-orange-200 font-bold';
    if (btn === '%') return 'bg-purple-100 text-purple-600 hover:bg-purple-200 font-bold';
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200 font-semibold';
  };

  useEffect(() => {
    if (!showCalc) return;
    const handleKey = (e) => {
      const key = e.key;
      if (key >= '0' && key <= '9') handleButton(key);
      else if (key === '+') handleButton('+');
      else if (key === '-') handleButton('-');
      else if (key === '*') handleButton('×');
      else if (key === '/') { e.preventDefault(); handleButton('÷'); }
      else if (key === '%') handleButton('%');
      else if (key === '.') handleButton('.');
      else if (key === 'Enter' || key === '=') handleButton('=');
      else if (key === 'Backspace') handleButton('⌫');
      else if (key === 'Escape') setShowCalc(false);
      else if (key === 'c' || key === 'C') handleButton('C');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCalc, display, expression, calculated]);

  const modalStyle =
    position.x !== null && position.y !== null
      ? { position: 'fixed', left: position.x, top: position.y, right: 'auto' }
      : { position: 'absolute', top: '4rem', right: '1.5rem' };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print relative">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>

      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleCalc}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            showCalc ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title="Calculator"
        >
          🧮 Calc
        </button>
        <span className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold">
          {user?.username || 'Admin'} · Owner
        </span>
      </div>

      {showCalc && (
        <div
          ref={calcRef}
          style={modalStyle}
          className="z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl w-72 overflow-hidden select-none"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <span className="text-sm font-bold text-gray-700">🧮 Calculator</span>
            <button
              onClick={() => setShowCalc(false)}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200"
              onMouseDown={e => e.stopPropagation()}
            >
              ×
            </button>
          </div>

          {/* Display */}
          <div className="px-4 py-3 bg-gray-900 text-right">
            <div className="text-xs text-gray-400 h-4 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {expression || ' '}
            </div>
            <div className="text-3xl font-bold text-white overflow-hidden text-ellipsis whitespace-nowrap">
              {formatDisplay(display)}
            </div>
          </div>

          {/* Buttons */}
          <div className="p-3 grid grid-cols-4 gap-2">
            {buttons.map((row, ri) =>
              row.map((btn, bi) => (
                <button
                  key={`${ri}-${bi}`}
                  onClick={() => handleButton(btn)}
                  className={`rounded-xl py-4 text-base transition-all active:scale-95 ${getButtonStyle(btn)} ${btn === '=' ? 'col-span-2' : ''}`}
                >
                  {btn}
                </button>
              ))
            )}
          </div>

          <div className="px-4 pb-3 text-center text-xs text-gray-400">
            Tip: Use keyboard · Press Esc to close
          </div>
        </div>
      )}
    </header>
  );
}