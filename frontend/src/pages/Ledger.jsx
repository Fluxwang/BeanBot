import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { del, get } from '../api';

function hashColor(str) {
  const palette = ['#e9876a','#69a7e8','#7dd87d','#caa46a','#b07de8','#e87d9a','#7dc8e8','#e8c87d'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}

function accountLabel(account) {
  const parts = account.split(':');
  return parts[parts.length - 1];
}

function parseAmount(position) {
  const m = position.match(/-?([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function isIncome(account) {
  return account.startsWith('Income:');
}

function LetterIcon({ account }) {
  const label = accountLabel(account);
  const color = hashColor(account);
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: color + '28',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color }}>{label[0]?.toUpperCase()}</span>
    </div>
  );
}

function UndoToast({ count, onUndo, onExpire }) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const DURATION = 5000;

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [onExpire]);

  return (
    <div style={{
      position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 100,
      background: '#2a2a2a', borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
        <span style={{ color: '#f5f5f5', fontSize: 13.5, flex: 1 }}>
          已删除 {count > 1 ? `${count} 条` : ''}账目
        </span>
        <button onClick={onUndo} style={{
          border: 0, background: 'transparent', color: '#c8a96e',
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '2px 4px',
        }}>
          撤销
        </button>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          height: '100%', background: '#c8a96e',
          width: `${progress}%`, transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  );
}

function TxRow({ tx, isLast, editing, selected, onToggle, onDelete }) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const rowRef = useRef(null);
  const touchState = useRef(null); // { startX, startY, direction: null|'h'|'v' }

  const THRESHOLD = 75;
  const MAX_OFFSET = 90;

  useEffect(() => {
    const el = rowRef.current;
    if (!el || editing) return;

    const onStart = (e) => {
      touchState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        direction: null,
      };
    };

    const onMove = (e) => {
      const t = touchState.current;
      if (!t) return;
      const dx = e.touches[0].clientX - t.startX;
      const dy = e.touches[0].clientY - t.startY;

      // 首次超过 8px 时锁定方向
      if (t.direction === null) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
          t.direction = 'h';
        } else if (Math.abs(dy) > 8) {
          t.direction = 'v';
        }
      }

      if (t.direction === 'h') {
        e.preventDefault(); // 确认水平后才阻止滚动
        const clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx));
        setSwiping(true);
        setOffsetX(clamped);
      }
    };

    const onEnd = (e) => {
      const t = touchState.current;
      if (!t || t.direction !== 'h') {
        touchState.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - t.startX;
      touchState.current = null;
      setSwiping(false);
      setOffsetX(0);
      if (dx < -THRESHOLD) onDelete(tx.id);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [editing, tx.id, onDelete]);

  const income = isIncome(tx.account);
  const amount = parseAmount(tx.position);
  const amountColor = income ? '#7dd87d' : '#f5f5f5';
  const sign = income ? '+' : '−';

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 删除背景（左滑时从右侧露出） */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}>
        <div style={{
          width: MAX_OFFSET, background: '#c0392b', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18 }}>🗑</span>
        </div>
      </div>

      {/* 克隆背景（右滑时从左侧露出） */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
      }}>
        <div style={{
          width: MAX_OFFSET, background: '#2980b9', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18 }}>⧉</span>
        </div>
      </div>

      {/* 行内容 */}
      <div
        ref={rowRef}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: isLast ? 0 : '0.5px solid rgba(255,255,255,0.05)',
          background: '#1a1a1a',
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease',
          userSelect: 'none',
        }}
      >
        {editing && (
          <div
            onClick={() => onToggle(tx.id)}
            style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${selected ? '#c0392b' : 'rgba(255,255,255,0.3)'}`,
              background: selected ? '#c0392b' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {selected && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
          </div>
        )}
        <LetterIcon account={tx.account} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#f5f5f5', fontSize: 14.5, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tx.payee || tx.narration}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 11.5, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tx.payee && tx.narration ? tx.narration : accountLabel(tx.account)}
          </div>
        </div>
        <span style={{ fontSize: 15.5, fontWeight: 600, color: amountColor, flexShrink: 0 }}>
          {sign}¥{amount.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function DayGroup({ date, rows, editing, selectedIds, onToggle, onDelete }) {
  const exp = rows.filter(r => !isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);
  const inc = rows.filter(r => isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);

  const d = new Date(date + 'T00:00:00');
  const dows = ['周日','周一','周二','周三','周四','周五','周六'];
  const label = `${d.getMonth() + 1}月${d.getDate()}日`;
  const dow = dows[d.getDay()];

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        padding: '8px 22px 6px', display: 'flex',
        alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 600 }}>{label}</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5 }}>{dow}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 10 }}>
          {exp > 0 && <span>支 <span style={{ color: 'rgba(255,255,255,0.7)' }}>¥{exp.toFixed(2)}</span></span>}
          {inc > 0 && <span>收 <span style={{ color: 'rgba(255,255,255,0.7)' }}>¥{inc.toFixed(2)}</span></span>}
        </div>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 16, margin: '0 16px', overflow: 'hidden' }}>
        {rows.map((tx, i) => (
          <TxRow
            key={tx.id}
            tx={tx}
            isLast={i === rows.length - 1}
            editing={editing}
            selected={selectedIds.has(tx.id)}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function MonthSummary({ rows }) {
  const exp = rows.filter(r => !isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);
  const inc = rows.filter(r => isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);
  const now = new Date();
  const month = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div style={{ padding: '0 16px 14px' }}>
      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: '#f5f5f5', fontSize: 17, fontWeight: 600 }}>{month}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>本月</span>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>支出</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#e9876a', marginTop: 2 }}>
              ¥{exp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ width: 0.5, background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>收入</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#7dd87d', marginTop: 2 }}>
              ¥{inc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>结余</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f5f5f5', marginTop: 2 }}>
              ¥{(inc - exp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBar({ navigate }) {
  return (
    <div style={{
      paddingTop: 8, paddingBottom: 28,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
      borderTop: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
      flexShrink: 0,
    }}>
      {[
        { id: 'ledger', label: '账本', active: true, path: '/' },
        { id: 'assets', label: '资产', active: false, path: '/assets' },
      ].map(item => (
        <button key={item.id} onClick={() => navigate(item.path)} style={{
          border: 0, background: 'transparent', padding: '6px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: item.active ? '#f5f5f5' : 'rgba(255,255,255,0.4)',
        }}>
          <span style={{ fontSize: 20 }}>{item.id === 'ledger' ? '☰' : '◈'}</span>
          <span style={{ fontSize: 10.5, fontWeight: item.active ? 600 : 500 }}>{item.label}</span>
        </button>
      ))}
      <button onClick={() => navigate('/entry')} style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#c8a96e', border: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: -22, marginBottom: 4,
        boxShadow: '0 4px 16px #c8a96e55, 0 2px 6px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontSize: 28, color: '#000', lineHeight: 1, marginTop: -2 }}>+</span>
      </button>
      <button style={{
        border: 0, background: 'transparent', padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        color: 'rgba(255,255,255,0.4)',
      }}>
        <span style={{ fontSize: 20 }}>◎</span>
        <span style={{ fontSize: 10.5, fontWeight: 500 }}>存钱</span>
      </button>
      <button onClick={() => navigate('/stats')} style={{
        border: 0, background: 'transparent', padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 20 }}>◉</span>
        <span style={{ fontSize: 10.5, fontWeight: 500 }}>统计</span>
      </button>
    </div>
  );
}

export default function Ledger() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [undoItems, setUndoItems] = useState(null);
  const undoTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    get('/api/ledger/transactions').then(data => {
      if (data) setRows(data.rows);
      setLoading(false);
    });
  }, []);

  const commitDelete = (items) => {
    del('/api/ledger/transactions', { ids: items.map(r => r.id) });
  };

  const handleDelete = (id) => {
    const item = rows.find(r => r.id === id);
    if (!item) return;
    triggerUndo([item]);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleBulkDelete = () => {
    const items = rows.filter(r => selectedIds.has(r.id));
    if (!items.length) return;
    triggerUndo(items);
    setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setEditing(false);
  };

  const triggerUndo = (items) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      if (undoItems) commitDelete(undoItems);
    }
    setUndoItems(items);
    undoTimerRef.current = setTimeout(() => {
      commitDelete(items);
      setUndoItems(null);
    }, 5000);
  };

  const handleUndo = () => {
    clearTimeout(undoTimerRef.current);
    if (undoItems) setRows(prev => [...undoItems, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setUndoItems(null);
  };

  const handleUndoExpire = () => {
    setUndoItems(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.date]) acc[row.date] = [];
    acc[row.date].push(row);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#f5f5f5',
    }}>
      {/* 顶部标题栏 */}
      <div style={{ padding: '54px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>账本</h1>
        <button
          onClick={() => { setEditing(e => !e); setSelectedIds(new Set()); }}
          style={{
            border: 0, background: 'transparent', color: editing ? '#c8a96e' : 'rgba(255,255,255,0.5)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '6px 2px',
          }}
        >
          {editing ? '完成' : '编辑'}
        </button>
      </div>

      {/* 滚动区域 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 48 }}>加载中...</div>
        ) : (
          <>
            <MonthSummary rows={rows} />
            {dates.map(date => (
              <DayGroup
                key={date}
                date={date}
                rows={grouped[date]}
                editing={editing}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                onDelete={handleDelete}
              />
            ))}
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11, padding: '8px 0 16px' }}>
              — 最近 {rows.length} 条记录 —
            </div>
          </>
        )}
      </div>

      {/* 编辑模式底部操作栏，浮在 TabBar 上方 */}
      {editing && selectedIds.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 90, left: 16, right: 16, zIndex: 99,
          background: '#c0392b', borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <button onClick={handleBulkDelete} style={{
            border: 0, background: 'transparent', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '14px 0', width: '100%',
          }}>
            删除所选（{selectedIds.size}）
          </button>
        </div>
      )}

      {undoItems && (
        <UndoToast
          count={undoItems.length}
          onUndo={handleUndo}
          onExpire={handleUndoExpire}
        />
      )}

      <TabBar navigate={navigate} />
    </div>
  );
}
