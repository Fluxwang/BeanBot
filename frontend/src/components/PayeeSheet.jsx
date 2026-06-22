import { useState } from 'react';
import { ACCENT } from './utils';

// 底部弹层：输入或确认商家名称
export default function PayeeSheet({ value, onChange, onClose }) {
  const [input, setInput] = useState(value);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        marginTop: 'auto', position: 'relative', background: '#1a1a1a',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '16px 20px 40px',
      }}>
        <div style={{ color: '#f5f5f5', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
          商家名称（选填）
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="例：KFC、星巴克..."
            style={{
              flex: 1, height: 46, padding: '0 14px',
              background: '#2a2a2a', border: 0, borderRadius: 12,
              color: '#f5f5f5', fontSize: 15, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button onClick={() => { onChange(input); onClose(); }} style={{
            height: 46, padding: '0 18px', background: ACCENT, border: 0,
            borderRadius: 12, color: '#000', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
