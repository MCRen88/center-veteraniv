import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Login: React.FC = () => {
  const { login, state } = useAppContext();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = (data.get('email') as string || '').trim();
    const password = data.get('password') as string || '';

    const success = await login(email, password);
    if (success) {
      const matchedUser = state.users.find(u => u.email === email);
      if (matchedUser?.role === 'admin' || matchedUser?.role === 'teacher') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Невірний логін або пароль');
    }
  };

  return (
    <div className="container mt-5 mb-5" style={{ maxWidth: '400px' }}>
      <div className="card">
        <h2 className="text-center mb-4">Вхід в систему</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email (Логін)</label>
            <input 
              type="email" 
              name="email"
              className="form-control" 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input 
              type="password" 
              name="password"
              className="form-control" 
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 mt-3">Увійти</button>
        </form>
      </div>
    </div>
  );
};
