function today() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 记账表单底部的日期 / 账户 / 商家 / 备注输入行
export default function MetaRow({ assetId, assets, note, payee, onNoteChange, onPickAsset, onPickPayee }) {
  const chip = (icon, text, onClick) => (
    <button onClick={onClick} style={{
      border: 0, background: '#1e1e1e', color: '#dcdcdc', borderRadius: 999,
      padding: '7px 12px 7px 10px', display: 'flex', alignItems: 'center', gap: 5,
      fontFamily: 'inherit', fontSize: 13, cursor: onClick ? 'pointer' : 'default', flexShrink: 0,
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span>{text}</span>
    </button>
  );
  const assetObj = assets.find(a => a.name === assetId);
  return (
    <div style={{ padding: '0 16px 10px' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {chip('📅', today())}
        {chip('💳', assetObj?.label || '账户', onPickAsset)}
        <button onClick={onPickPayee} style={{
          border: 0, background: '#1e1e1e',
          color: payee ? '#f5f5f5' : 'rgba(255,255,255,0.4)',
          borderRadius: 999, padding: '7px 12px',
          fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}>
          {payee || '商家（选填）'}
        </button>
      </div>
      <div style={{
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
        background: '#1e1e1e', borderRadius: 12, padding: '10px 12px',
      }}>
        <span style={{ fontSize: 14, opacity: 0.4 }}>✏️</span>
        <input
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="备注 · 商家、用途..."
          style={{
            flex: 1, background: 'transparent', border: 0, color: '#f5f5f5',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
