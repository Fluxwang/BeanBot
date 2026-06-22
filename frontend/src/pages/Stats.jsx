import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api';

function hashColor(str) {
  const palette = ['#e9876a','#69a7e8','#7dd87d','#caa46a','#b07de8','#e87d9a','#7dc8e8','#e8c87d'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}

function fmt(v) {
  return '¥' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Segmented 时间范围选择器 ──────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: '#1a1a1a', borderRadius: 10, padding: 3 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, border: 0, borderRadius: 8, padding: '6px 0',
            background: active ? '#2a2a2a' : 'transparent',
            color: active ? '#f5f5f5' : 'rgba(255,255,255,0.45)',
            fontSize: 13, fontWeight: active ? 600 : 400,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 概览卡片 ─────────────────────────────────────────────────
function SummaryCard({ summary, rangeLabel }) {
  if (!summary) return null;
  const { expense, income, balance, avg, avg_label } = summary;
  const cell = (label, value, color, big) => (
    <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4, fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: big ? 22 : 17, fontWeight: big ? 700 : 600, color: color || '#f5f5f5', letterSpacing: -0.5 }}>
        {fmt(value)}
      </div>
    </div>
  );
  return (
    <div style={{ margin: '0 16px', background: '#1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>{rangeLabel}</span>
      </div>
      <div style={{ display: 'flex' }}>
        {cell('支出', expense, '#e9876a', true)}
        <div style={{ width: 0.5, background: 'rgba(255,255,255,0.07)', margin: '12px 0' }}/>
        {cell('收入', income, '#7dd87d', true)}
      </div>
      <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }}/>
      <div style={{ display: 'flex' }}>
        {cell('结余', balance, '#f5f5f5')}
        <div style={{ width: 0.5, background: 'rgba(255,255,255,0.07)', margin: '6px 0' }}/>
        {cell(avg_label, avg, '#f5f5f5')}
      </div>
    </div>
  );
}

// ── Donut SVG ─────────────────────────────────────────────────
function Donut({ cats, total, subtitle, activeId, onSliceClick }) {
  const size = 196, thickness = 22;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  const sum = cats.reduce((s, c) => s + c.amount, 0) || 1;

  let acc = 0;
  const segs = cats.map(cat => {
    const frac = cat.amount / sum;
    const len = frac * C;
    const off = -acc * C;
    acc += frac;
    return { ...cat, len, off };
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness}/>
        {segs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={hashColor(s.id)}
            strokeWidth={thickness}
            strokeDasharray={`${s.len} ${C - s.len}`}
            strokeDashoffset={s.off}
            style={{ cursor: 'pointer', opacity: !activeId || activeId === s.id ? 1 : 0.25, transition: 'opacity 0.2s' }}
            onClick={() => onSliceClick(s.id)}/>
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.6, fontWeight: 500 }}>{subtitle}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: '#f5f5f5', marginTop: 4, letterSpacing: -1 }}>
          {fmt(total)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
          {cats.reduce((s, c) => s + c.count, 0)} 笔
        </div>
      </div>
    </div>
  );
}

// ── 分类行（可展开） ──────────────────────────────────────────
function CatRow({ cat, total, expanded, onToggle }) {
  const color = hashColor(cat.id);
  const pct = (cat.amount / total * 100).toFixed(1);
  return (
    <div>
      <button onClick={onToggle} style={{
        width: '100%', border: 0, background: 'transparent',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color }}>{cat.name[0]?.toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ color: '#f5f5f5', fontSize: 15, fontWeight: 500 }}>{cat.name}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{cat.count} 笔</span>
          </div>
          <div style={{ marginTop: 5, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }}/>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5', letterSpacing: -0.3 }}>{fmt(cat.amount)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{pct}%</div>
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && cat.subs.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          {cat.subs.map((sub, i) => {
            const subPct = (sub.amount / cat.amount * 100).toFixed(1);
            return (
              <div key={sub.id} style={{
                padding: '10px 16px 10px 64px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i === cat.subs.length - 1 ? 'none' : '0.5px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: 0.7, flexShrink: 0 }}/>
                  <span style={{ color: '#dcdcdc', fontSize: 14 }}>{sub.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{sub.count}笔 · {subPct}%</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: -0.3 }}>{fmt(sub.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────
function TabBar({ navigate }) {
  return (
    <div style={{
      paddingTop: 8, paddingBottom: 28, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)', borderTop: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', flexShrink: 0,
    }}>
      {[{ id: 'ledger', label: '账本', path: '/' }, { id: 'assets', label: '资产', path: '/assets' }].map(item => (
        <button key={item.id} onClick={() => navigate(item.path)} style={{
          border: 0, background: 'transparent', padding: '6px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>{item.id === 'ledger' ? '☰' : '◈'}</span>
          <span style={{ fontSize: 10.5, fontWeight: 500 }}>{item.label}</span>
        </button>
      ))}

      <button onClick={() => navigate('/entry')} style={{
        width: 56, height: 56, borderRadius: '50%', background: '#c8a96e', border: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: -22, marginBottom: 4, cursor: 'pointer',
        boxShadow: '0 4px 16px #c8a96e55, 0 2px 6px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontSize: 28, color: '#000', lineHeight: 1, marginTop: -2 }}>+</span>
      </button>

      {[{ id: 'savings', label: '存钱', path: null }].map(item => (
        <button key={item.id} style={{
          border: 0, background: 'transparent', padding: '6px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: 'rgba(255,255,255,0.4)',
        }}>
          <span style={{ fontSize: 20 }}>◎</span>
          <span style={{ fontSize: 10.5, fontWeight: 500 }}>{item.label}</span>
        </button>
      ))}

      <button style={{
        border: 0, background: 'transparent', padding: '6px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        color: '#f5f5f5', cursor: 'pointer',
      }}>
        <span style={{ fontSize: 20 }}>◉</span>
        <span style={{ fontSize: 10.5, fontWeight: 600 }}>统计</span>
      </button>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────
const RANGES = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
  { value: 'all', label: '全部' },
];

const RANGE_LABELS = { week: '本周', month: '本月', year: '本年', all: '全部' };

export default function Stats() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('expense');
  const [expanded, setExpanded] = useState(null);
  const [activeSlice, setActiveSlice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setData(null);
    get(`/api/stats?range=${range}`).then(res => { if (res) setData(res); });
  }, [range]);

  const cats = data ? (tab === 'expense' ? data.expense_cats : data.income_cats) : [];
  const total = cats.reduce((s, c) => s + c.amount, 0);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#f5f5f5' }}>
      {/* 顶部 */}
      <div style={{ padding: '54px 16px 12px', flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>统计</h1>
      </div>

      {/* 时间范围 */}
      <div style={{ padding: '0 16px 14px', flexShrink: 0 }}>
        <Segmented options={RANGES} value={range} onChange={r => { setRange(r); setExpanded(null); setActiveSlice(null); }}/>
      </div>

      {/* 滚动区域 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        {!data ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 48 }}>加载中...</div>
        ) : (
          <>
            {/* 概览卡片 */}
            <SummaryCard summary={data.summary} rangeLabel={RANGE_LABELS[range]}/>

            {/* Donut 卡片 */}
            <div style={{
              margin: '16px 16px 12px', padding: '20px 16px 16px',
              background: '#1a1a1a', borderRadius: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* 支出/收入 tab */}
              <div style={{ display: 'flex', gap: 4, background: '#0a0a0a', borderRadius: 8, padding: 3, marginBottom: 16 }}>
                {[{ value: 'expense', label: '支出' }, { value: 'income', label: '收入' }].map(t => (
                  <button key={t.value} onClick={() => { setTab(t.value); setExpanded(null); setActiveSlice(null); }} style={{
                    border: 0, borderRadius: 6, padding: '5px 20px',
                    background: tab === t.value ? '#2a2a2a' : 'transparent',
                    color: tab === t.value ? '#f5f5f5' : 'rgba(255,255,255,0.4)',
                    fontSize: 13, fontWeight: tab === t.value ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <Donut
                cats={cats}
                total={total}
                subtitle={tab === 'expense' ? '总支出' : '总收入'}
                activeId={activeSlice}
                onSliceClick={id => setActiveSlice(a => a === id ? null : id)}
              />

              {/* Mini 图例 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 14, justifyContent: 'center', maxWidth: 320 }}>
                {cats.slice(0, 6).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: hashColor(c.id), flexShrink: 0 }}/>
                    {c.name} <span style={{ fontWeight: 500 }}>{(c.amount / (total || 1) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 分类列表 */}
            <div style={{ margin: '0 16px 16px', background: '#1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.4, fontWeight: 500 }}>
                <span>分类明细</span>
                <span>{cats.length} 类 · {cats.reduce((s, c) => s + c.count, 0)} 笔</span>
              </div>
              <div style={{ height: 0.5, background: 'rgba(255,255,255,0.07)', margin: '0 16px' }}/>
              {cats.map((c, i) => (
                <div key={c.id} style={{ borderBottom: i === cats.length - 1 ? 0 : '0.5px solid rgba(255,255,255,0.05)' }}>
                  <CatRow
                    cat={c}
                    total={total}
                    expanded={expanded === c.id}
                    onToggle={() => setExpanded(e => e === c.id ? null : c.id)}
                  />
                </div>
              ))}
              {cats.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>暂无数据</div>
              )}
            </div>
          </>
        )}
      </div>

      <TabBar navigate={navigate}/>
    </div>
  );
}
