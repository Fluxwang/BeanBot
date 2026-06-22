import { useEffect, useState } from 'react';
import { get } from '../api';
import { TabBar, hashColor } from '../components';

function fmt(v) {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '−' : '') + '¥' + abs;
}

function AccountRow({ item, isLast }) {
  const color = hashColor(item.name);
  const isNeg = item.value < 0;
  return (
    <div style={{
      padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: isLast ? 0 : '0.5px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: color + '28', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color }}>{item.label[0]?.toUpperCase()}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#f5f5f5', fontSize: 14.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: isNeg ? '#e9876a' : '#f5f5f5', flexShrink: 0 }}>
        {fmt(item.value)}
      </span>
    </div>
  );
}

function Section({ title, items, total, totalColor }) {
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px 8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500, letterSpacing: 0.4 }}>{title}</span>
        <span style={{ color: totalColor, fontSize: 15, fontWeight: 700 }}>{fmt(total)}</span>
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
        {items.map((item, i) => (
          <AccountRow key={item.name} item={item} isLast={i === items.length - 1} />
        ))}
        {items.length === 0 && (
          <div style={{ padding: 20, color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>暂无数据</div>
        )}
      </div>
    </div>
  );
}

export default function Assets() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/api/assets').then(res => { if (res) setData(res); setLoading(false); });
  }, []);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', color: '#f5f5f5' }}>
      {/* 顶部净资产卡片 */}
      <div style={{
        padding: '54px 20px 24px', flexShrink: 0,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
      }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>净资产</div>
        {loading ? (
          <div style={{ fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>计算中...</div>
        ) : (
          <>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.5, color: '#f5f5f5' }}>
              <span style={{ fontSize: 24 }}>¥</span>
              {Math.abs(data.net).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
              <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>资产</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#7dd87d' }}>
                  {fmt(data.assets_total)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {data.assets.length} 个账户
                </div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>负债</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#e9876a' }}>
                  {fmt(data.liabilities_total)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {data.liabilities.length} 张信用卡
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 账户列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loading && data && (
          <>
            <Section title="资产账户" items={data.assets} total={data.assets_total} totalColor="#7dd87d" />
            <Section title="负债账户" items={data.liabilities} total={data.liabilities_total} totalColor="#e9876a" />
          </>
        )}
      </div>

      <TabBar active="assets" />
    </div>
  );
}
