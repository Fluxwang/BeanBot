import { hashColor, accountLabel } from './utils';

export default function LetterIcon({ account, size = 38 }) {
  const color = hashColor(account);
  const label = accountLabel(account);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color + '28',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color }}>
        {label[0]?.toUpperCase()}
      </span>
    </div>
  );
}
