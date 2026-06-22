import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, get } from '../api';
import { useAccounts } from '../context/AccountsContext';
import { ACCENT } from '../components';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAccounts } = useAccounts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(username, password);
    if (res.token) {
      localStorage.setItem('token', res.token);
      const accountsData = await get('/api/accounts');
      if (accountsData) setAccounts(accountsData);
      navigate('/');
    } else {
      setError(res.error || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', padding: '0 32px',
      background: '#0a0a0a', color: '#f5f5f5',
      fontFamily: '-apple-system, "SF Pro", system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>BeanBot</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)' }}>登录以继续记账</div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="用户名"
          autoComplete="username"
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="密码"
          autoComplete="current-password"
          style={inputStyle}
        />

        {error && (
          <div style={{ fontSize: 13, color: '#ff6b6b', padding: '4px 0' }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          marginTop: 8, height: 50, border: 0, borderRadius: 14,
          background: loading ? 'rgba(255,255,255,0.1)' : ACCENT,
          color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
          fontSize: 16, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit', transition: 'background 0.15s',
        }}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  height: 50, padding: '0 16px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, color: '#f5f5f5',
  fontSize: 16, fontFamily: 'inherit', outline: 'none',
};
