import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api';

// 根据字符串哈希出固定颜色
function hashColor(str) {
  const palette = ['#e9876a','#69a7e8','#7dd87d','#caa46a','#b07de8','#e87d9a','#7dc8e8','#e8c87d'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xfffffff;
  return palette[h % palette.length];
}

// 从 account 取最后一段作为 label
function accountLabel(account) {
  const parts = account.split(':');
  return parts[parts.length - 1];
}

// 解析 "35.00 CNY" → 35.00
function parseAmount(position) {
  const m = position.match(/-?([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function isIncome(account) {
  return account.startsWith('Income:');
}

// 首字母圆圈 icon
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

function TxRow({ tx, isLast }) {
  const income = isIncome(tx.account);
  const amount = parseAmount(tx.position);
  const amountColor = income ? '#7dd87d' : '#f5f5f5';
  const sign = income ? '+' : '−';

  return (
    <div style={{
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: isLast ? 0 : '0.5px solid rgba(255,255,255,0.05)',
    }}>
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
  );
}

function DayGroup({ date, rows }) {
  const exp = rows.filter(r => !isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);
  const inc = rows.filter(r => isIncome(r.account)).reduce((s, r) => s + parseAmount(r.position), 0);

  // "2026-06-22" → "6月22日 周日"
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
          <TxRow key={i} tx={tx} isLast={i === rows.length - 1} />
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

      {/* 中间 + 按钮 */}
      <button onClick={() => navigate('/entry')} style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#c8a96e', border: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: -22, marginBottom: 4,
        boxShadow: '0 4px 16px #c8a96e55, 0 2px 6px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontSize: 28, color: '#000', lineHeight: 1, marginTop: -2 }}>+</span>
      </button>

      {[
        { id: 'savings', label: '存钱' },
        { id: 'stats', label: '统计' },
      ].map(item => (
        <button key={item.id} style={{
          border: 0, background: 'transparent', padding: '6px 14px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: 'rgba(255,255,255,0.4)',
        }}>
          <span style={{ fontSize: 20 }}>◎</span>
          <span style={{ fontSize: 10.5, fontWeight: 500 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Ledger() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    get('/api/ledger/transactions').then(data => {
      if (data) setRows(data.rows);
      setLoading(false);
    });
  }, []);

  // 按日期分组
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
      </div>

      {/* 滚动区域 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 48 }}>加载中...</div>
        ) : (
          <>
            <MonthSummary rows={rows} />
            {dates.map(date => (
              <DayGroup key={date} date={date} rows={grouped[date]} />
            ))}
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 11, padding: '8px 0 16px' }}>
              — 最近 {rows.length} 条记录 —
            </div>
          </>
        )}
      </div>

      <TabBar navigate={navigate} />
    </div>
  );
}
