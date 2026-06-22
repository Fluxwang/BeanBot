import { useState } from 'react';
import { post } from '../api';

const EXAMPLES = ['35 CMB KFC 午饭', '咖啡 22 manner 支付宝', '打车 48.5 滴滴', '工资 18500 招行'];

// 自然语言记账模式：输入文本 → 调用 /api/entry/parse → 展示解析结果 → 提交
export default function TextMode({ accent, onSubmitDone }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    setParsed(null);
    const res = await post('/api/entry/parse', { text });
    if (res?.error) setError(res.error);
    else setParsed(res);
    setParsing(false);
  };

  const handleConfirm = async () => {
    if (!parsed?.raw) return;
    setSubmitting(true);
    const res = await post('/api/entry/submit', { data: parsed.raw });
    if (res?.error) setError(res.error);
    else onSubmitDone();
    setSubmitting(false);
  };

  return (
    <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500, padding: '0 4px 8px' }}>
        <span style={{ color: accent }}>✦</span>
        <span>自然语言记账 · AI 自动解析金额、账户、分类</span>
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setParsed(null); }}
          placeholder={'例如:  35 CMB KFC 午饭\n     咖啡 22 manner 支付宝\n     打车 48.5 滴滴'}
          style={{
            width: '100%', minHeight: 90, resize: 'none',
            background: 'transparent', border: 0, outline: 'none',
            color: '#f5f5f5', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.5, padding: 0,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => { setText(ex); setParsed(null); }} style={{
              border: 0, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
              padding: '5px 10px', borderRadius: 999, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}>{ex}</button>
          ))}
        </div>
      </div>

      <button onClick={handleParse} disabled={!text.trim() || parsing} style={{
        marginTop: 10, height: 46, border: 0, borderRadius: 14,
        background: text.trim() ? accent : 'rgba(255,255,255,0.06)',
        color: text.trim() ? '#0a0a0a' : 'rgba(255,255,255,0.35)',
        cursor: text.trim() ? 'pointer' : 'default',
        fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
      }}>
        {parsing ? '解析中...' : '✦ 解析'}
      </button>

      {error && <div style={{ color: '#ff6b6b', fontSize: 13, padding: '8px 4px' }}>{error}</div>}

      {parsed && (
        <div style={{ marginTop: 12, background: '#1a1a1a', borderRadius: 16, border: `1px solid ${accent}55`, padding: '14px 14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: accent, fontSize: 11, fontWeight: 600, letterSpacing: 0.4, marginBottom: 8 }}>
            <span>✓ 解析结果</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#f5f5f5', letterSpacing: -1, marginBottom: 8 }}>
            <span style={{ fontSize: 18, color: '#e9876a' }}>−¥</span>
            {parsed.amount?.toFixed(2)}
          </div>
          {[
            { label: '账户', value: parsed.from_account },
            { label: '分类', value: parsed.to_account },
            { label: '商家', value: parsed.payee },
            { label: '备注', value: parsed.narration },
          ].map(row => row.value ? (
            <div key={row.label} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 13, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', width: 36 }}>{row.label}</span>
              <span style={{ color: '#f5f5f5', fontWeight: 500 }}>{row.value}</span>
            </div>
          ) : null)}
          <button onClick={handleConfirm} disabled={submitting} style={{
            marginTop: 10, width: '100%', height: 40, border: 0,
            background: accent, color: '#0a0a0a', borderRadius: 10,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
          }}>
            {'确认入账 →'}
          </button>
        </div>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}
