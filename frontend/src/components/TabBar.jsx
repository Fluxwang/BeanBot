import { useNavigate } from 'react-router-dom';
import { ACCENT } from './utils';

const TABS = [
  { id: 'ledger', label: '账本', icon: '☰', path: '/' },
  { id: 'assets', label: '资产', icon: '◈', path: '/assets' },
];

export default function TabBar({ active }) {
  const navigate = useNavigate();
  return (
    <div style={{
      paddingTop: 8, paddingBottom: 28,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
      borderTop: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
      flexShrink: 0,
    }}>
      {TABS.map(tab => (
        <button key={tab.id} onClick={() => navigate(tab.path)} style={{
          border: 0, background: 'transparent', padding: '6px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: active === tab.id ? '#f5f5f5' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          <span style={{ fontSize: 10.5, fontWeight: active === tab.id ? 600 : 500 }}>{tab.label}</span>
        </button>
      ))}

      <button onClick={() => navigate('/entry')} style={{
        width: 56, height: 56, borderRadius: '50%',
        background: ACCENT, border: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: -22, marginBottom: 4,
        boxShadow: `0 4px 16px ${ACCENT}55, 0 2px 6px rgba(0,0,0,0.3)`,
      }}>
        <span style={{ fontSize: 28, color: '#000', lineHeight: 1, marginTop: -2 }}>+</span>
      </button>

      {/* 存钱功能待实现 */}
      <button disabled style={{
        border: 0, background: 'transparent', padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        color: 'rgba(255,255,255,0.4)', opacity: 0.3, cursor: 'not-allowed',
      }}>
        <span style={{ fontSize: 20 }}>◎</span>
        <span style={{ fontSize: 10.5, fontWeight: 500 }}>存钱</span>
      </button>

      <button onClick={() => navigate('/stats')} style={{
        border: 0, background: 'transparent', padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        color: active === 'stats' ? '#f5f5f5' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 20 }}>◉</span>
        <span style={{ fontSize: 10.5, fontWeight: active === 'stats' ? 600 : 500 }}>统计</span>
      </button>
    </div>
  );
}
