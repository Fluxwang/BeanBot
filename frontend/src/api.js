const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const handle = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }
  return res.json();
};

export const get = (path) =>
  fetch(path, { headers: authHeader() }).then(handle);

export const post = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  }).then(handle);

export const del = (path, body) =>
  fetch(path, {
    method: 'DELETE',
    headers: authHeader(),
    body: JSON.stringify(body),
  }).then(handle);

export const login = (username, password) =>
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then((r) => r.json());
