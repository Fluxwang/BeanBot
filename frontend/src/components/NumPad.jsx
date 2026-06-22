// 将中文全角减号转为标准减号后，用 Function 安全求值
function evalExpr(expr) {
  try {
    const n = Function('"use strict"; return (' + expr.replace(/−/g, '-') + ')')();
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  } catch {
    return 0;
  }
}

function today() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function NumPad({ onKey, accent }) {
  const keys = [
    ['7', '8', '9', { id: 'date', label: today(), sub: true }],
    ['4', '5', '6', { id: '+', label: '+' }],
    ['1', '2', '3', { id: '−', label: '−' }],
    [{ id: '.', label: '·' }, '0', { id: 'del', label: '⌫' }, { id: 'ok', label: '完成', confirm: true }],
  ];
  return (
    <div style={{
      padding: 12, display: 'grid', gap: 8,
      gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 56,
      background: '#0a0a0a',
    }}>
      {keys.flat().map((k, i) => {
        if (typeof k === 'string') return (
          <button key={i} onClick={() => onKey(k)} style={{
            height: 56, border: 0, background: '#1e1e1e', color: '#f5f5f5',
            fontSize: 24, fontWeight: 500, borderRadius: 12, cursor: 'pointer',
          }}>{k}</button>
        );
        const bg = k.confirm ? accent : (k.id === '+' || k.id === '−') ? '#2a2a2a' : '#1e1e1e';
        const fg = k.confirm ? '#000' : '#f5f5f5';
        return (
          <button key={i} onClick={() => onKey(k.id)} style={{
            height: 56, border: 0, background: bg, color: fg,
            borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontSize: k.confirm ? 15 : 22, fontWeight: k.confirm ? 600 : 500, lineHeight: 1,
          }}>
            {k.label}
            {k.sub && <span style={{ fontSize: 10, opacity: 0.55, marginTop: 2 }}>{today()}</span>}
          </button>
        );
      })}
    </div>
  );
}

export { evalExpr };
