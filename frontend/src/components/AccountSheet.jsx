import { useState } from 'react';
import { hashColor } from './utils';
import LetterIcon from './LetterIcon';

// 按第二段路径分组：Expenses:Food:Lunch → group "Food"
function groupAccounts(accounts) {
  const groups = {};
  for (const a of accounts) {
    const parts = a.name.split(':');
    const groupKey = parts[1] ?? parts[0];
    if (!groups[groupKey])
      groups[groupKey] = { key: groupKey, label: groupKey, children: [] };
    groups[groupKey].children.push(a);
  }
  return Object.values(groups);
}

// 账户分类网格（点击分组后弹出子选择器）
function CategoryGrid({ accounts, value, onChange }) {
  const [subSheet, setSubSheet] = useState(null);
  const groups = groupAccounts(accounts);
  const selectedGroup = value
    ? groups.find(g => g.children.some(c => c.name === value))
    : null;

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px 8px', padding: '4px 4px 12px',
      }}>
        {groups.slice(0, 8).map(g => {
          const active = selectedGroup?.key === g.key;
          const color = hashColor('Expenses:' + g.key);
          return (
            <button key={g.key} onClick={() => {
              if (g.children.length === 1) onChange(g.children[0].name);
              else setSubSheet(g.key);
            }} style={{
              border: 0, background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: '4px 0', fontFamily: 'inherit',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: active ? color : color + '24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                boxShadow: active ? `0 4px 16px ${color}55` : 'none',
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: active ? '#0a0a0a' : color }}>
                  {g.label[0]?.toUpperCase()}
                </span>
              </div>
              <span style={{
                fontSize: 11, textAlign: 'center', lineHeight: 1.2,
                color: active ? '#f5f5f5' : 'rgba(255,255,255,0.65)',
                fontWeight: active ? 600 : 500,
              }}>{g.label}</span>
            </button>
          );
        })}
      </div>

      {subSheet && (() => {
        const group = groups.find(g => g.key === subSheet);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
            <div onClick={() => setSubSheet(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
            <div style={{
              marginTop: 'auto', position: 'relative', background: '#1a1a1a',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              maxHeight: '60%', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
              </div>
              <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={() => setSubSheet(null)} style={{ width: 32, height: 32, border: 0, background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>✕</button>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>{group.label}</span>
                <div style={{ width: 32 }} />
              </div>
              <div style={{ overflowY: 'auto', padding: '0 16px 32px' }}>
                {group.children.map((a, i) => {
                  const color = hashColor(a.name);
                  return (
                    <button key={a.name} onClick={() => { onChange(a.name); setSubSheet(null); }} style={{
                      width: '100%', border: 0, background: 'transparent', padding: '12px 4px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                      borderBottom: i < group.children.length - 1 ? '0.5px solid rgba(255,255,255,0.07)' : 'none',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color }}>{a.label[0]?.toUpperCase()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#f5f5f5', fontSize: 15, fontWeight: 500 }}>{a.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{a.name}</div>
                      </div>
                      {value === a.name && <span style={{ color, fontSize: 18 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// 底部弹层：从账户列表中选择一个账户
export default function AccountSheet({ title, accounts, currentId, excludeId, onPick, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        marginTop: 'auto', position: 'relative', background: '#1a1a1a',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: '70%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.25s cubic-bezier(0.2,0.8,0.2,1)',
      }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>
        <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 0, background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 20 }}>✕</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>{title}</span>
          <div style={{ width: 32 }} />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 16px 32px' }}>
          {accounts.map((a, i) => {
            const disabled = a.name === excludeId;
            const active = a.name === currentId;
            const color = hashColor(a.name);
            return (
              <button key={a.name} onClick={() => !disabled && onPick(a.name)} style={{
                width: '100%', border: 0, background: 'transparent', padding: '12px 4px',
                cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                opacity: disabled ? 0.35 : 1,
                borderBottom: i < accounts.length - 1 ? '0.5px solid rgba(255,255,255,0.07)' : 'none',
                fontFamily: 'inherit', textAlign: 'left',
              }}>
                <LetterIcon account={a.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f5f5f5', fontSize: 15, fontWeight: 500 }}>{a.label}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{a.name}</div>
                </div>
                {active && <span style={{ color, fontSize: 18 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { CategoryGrid };
