import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { post, get } from '../api';
import { useAccounts } from '../context/AccountsContext';
import {
  ACCENT, NumPad, evalExpr,
  AccountSheet, CategoryGrid,
  MetaRow, PayeeSheet, TextMode,
  LetterIcon,
} from '../components';

// 转账模式的账户选择区域
function TransferBody({ fromId, toId, assets, onPickFrom, onPickTo, note, onNoteChange }) {
  const from = assets.find(a => a.name === fromId);
  const to = assets.find(a => a.name === toId);

  const row = (label, obj, onClick) => (
    <button onClick={onClick} style={{
      width: '100%', border: 0, background: '#1e1e1e', cursor: 'pointer',
      borderRadius: 14, padding: '12px 60px 12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <LetterIcon account={obj?.name || 'unknown'} size={42} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 15, color: '#f5f5f5', fontWeight: 600 }}>{obj?.label || '选择账户'}</div>
      </div>
    </button>
  );

  return (
    <div style={{ padding: '4px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {row('转出', from, onPickFrom)}
      {row('转入', to, onPickTo)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e1e1e', borderRadius: 12, padding: '10px 12px', marginTop: 4 }}>
        <span style={{ fontSize: 14, opacity: 0.4 }}>✏️</span>
        <input
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="备注 · 转账事由..."
          style={{ flex: 1, background: 'transparent', border: 0, color: '#f5f5f5', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>
    </div>
  );
}

export default function Entry() {
  const navigate = useNavigate();
  const { accounts, setAccounts } = useAccounts();

  const [kind, setKind] = useState('exp');      // exp | inc | tr
  const [mode, setMode] = useState('graphic');  // graphic | text
  const [expr, setExpr] = useState('0');
  const [catId, setCatId] = useState(null);
  const [assetId, setAssetId] = useState(accounts.assets[0]?.name || '');
  const [fromId, setFromId] = useState(accounts.assets[0]?.name || '');
  const [toId, setToId] = useState(accounts.assets[1]?.name || '');
  const [note, setNote] = useState('');
  const [payee, setPayee] = useState('');
  const [sheet, setSheet] = useState(null); // null | 'asset' | 'from' | 'to' | 'payee'
  const [error, setError] = useState('');

  // 页面刷新后 Context 重置，重新拉取账户数据
  useEffect(() => {
    if (accounts.expenses.length === 0) {
      get('/api/accounts').then(data => { if (data) setAccounts(data); });
    }
  }, []);

  const catAccounts = kind === 'exp' ? accounts.expenses : accounts.income;
  const kindColor = kind === 'exp' ? '#e9876a' : kind === 'inc' ? '#7dd87d' : ACCENT;

  const onKey = k => {
    setExpr(prev => {
      if (k === 'del') { const v = prev.slice(0, -1); return v === '' ? '0' : v; }
      if (k === 'ok' || k === 'date') return prev;
      if (k === '+' || k === '−') {
        const last = prev.slice(-1);
        if ('+−'.includes(last)) return prev.slice(0, -1) + k;
        return prev + k;
      }
      if (prev === '0' && k !== '.') return k;
      if (k === '.' && prev.split(/[+−]/).pop().includes('.')) return prev;
      return prev + k;
    });
  };

  const handleSubmit = async () => {
    const amount = evalExpr(expr);
    if (!amount || amount <= 0) { setError('请输入金额'); return; }
    const from = kind === 'tr' ? fromId : assetId;
    const to = kind === 'tr' ? toId : catId;
    if (!to) { setError('请选择分类'); return; }

    setError('');
    const built = await post('/api/entry/build', { amount, from_account: from, to_account: to, payee, narration: note });
    if (built?.error) { setError(built.error); return; }
    const res = await post('/api/entry/submit', { data: built.raw });
    if (res?.error) setError(res.error);
    else navigate('/');
  };

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#f5f5f5',
      fontFamily: '-apple-system,"SF Pro",system-ui,sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 顶部栏 */}
      <div style={{ padding: '52px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ width: 36, height: 36, borderRadius: '50%', border: 0, background: '#1a1a1a', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>✕</button>

        {/* 支出 / 收入 / 转账 切换 */}
        <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }}>
          {[{ id: 'exp', label: '支出' }, { id: 'inc', label: '收入' }, { id: 'tr', label: '转账' }].map(o => {
            const ac = o.id === 'exp' ? '#e9876a' : o.id === 'inc' ? '#7dd87d' : ACCENT;
            return (
              <button key={o.id} onClick={() => { setKind(o.id); setCatId(null); }} style={{
                height: 30, padding: '0 14px', border: 0, cursor: 'pointer', borderRadius: 999,
                fontFamily: 'inherit', background: kind === o.id ? '#2a2a2a' : 'transparent',
                color: kind === o.id ? ac : 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: kind === o.id ? 600 : 500,
              }}>{o.label}</button>
            );
          })}
        </div>

        {/* 图形 / 文字模式切换 */}
        <button onClick={() => setMode(m => m === 'graphic' ? 'text' : 'graphic')} style={{
          width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
          background: mode === 'text' ? ACCENT + '22' : '#1a1a1a',
          color: mode === 'text' ? ACCENT : 'rgba(255,255,255,0.6)', fontSize: 16,
        }}>
          {mode === 'graphic' ? '⌨' : '⊞'}
        </button>
      </div>

      {mode === 'text' ? (
        <TextMode accent={ACCENT} onSubmitDone={() => navigate('/')} />
      ) : kind === 'tr' ? (
        <>
          <div style={{ padding: '8px 20px 10px', flexShrink: 0 }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: ACCENT, letterSpacing: -1.5 }}>
              <span style={{ fontSize: 28 }}>¥</span>{expr}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <TransferBody fromId={fromId} toId={toId} assets={accounts.assets} onPickFrom={() => setSheet('from')} onPickTo={() => setSheet('to')} note={note} onNoteChange={setNote} />
          </div>
          {error && <div style={{ color: '#ff6b6b', fontSize: 13, padding: '0 20px 4px' }}>{error}</div>}
          <NumPad onKey={k => k === 'ok' ? handleSubmit() : onKey(k)} accent={ACCENT} />
        </>
      ) : (
        <>
          <div style={{ padding: '4px 20px 10px', flexShrink: 0 }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: '#f5f5f5', letterSpacing: -1.5 }}>
              <span style={{ fontSize: 28, color: kindColor }}>{kind === 'exp' ? '−' : '+'}¥</span>{expr}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <div style={{ padding: '0 16px' }}>
              <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '10px 8px 4px' }}>
                <div style={{ padding: '0 10px 6px', color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 0.4 }}>
                  {kind === 'exp' ? '支出分类' : '收入分类'}
                </div>
                <CategoryGrid accounts={catAccounts} value={catId} onChange={setCatId} />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <MetaRow assetId={assetId} assets={accounts.assets} note={note} payee={payee} onNoteChange={setNote} onPickAsset={() => setSheet('asset')} onPickPayee={() => setSheet('payee')} />
            {error && <div style={{ color: '#ff6b6b', fontSize: 13, padding: '0 20px 4px' }}>{error}</div>}
          </div>

          <div style={{ flexShrink: 0 }}>
            <NumPad onKey={k => k === 'ok' ? handleSubmit() : onKey(k)} accent={ACCENT} />
          </div>
        </>
      )}

      {sheet === 'asset' && <AccountSheet title="选择账户" accounts={accounts.assets} currentId={assetId} onPick={id => { setAssetId(id); setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'from'  && <AccountSheet title="转出账户" accounts={accounts.assets} currentId={fromId} excludeId={toId}   onPick={id => { setFromId(id);  setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'to'    && <AccountSheet title="转入账户" accounts={accounts.assets} currentId={toId}   excludeId={fromId}  onPick={id => { setToId(id);    setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'payee' && <PayeeSheet value={payee} onChange={setPayee} onClose={() => setSheet(null)} />}
    </div>
  );
}
