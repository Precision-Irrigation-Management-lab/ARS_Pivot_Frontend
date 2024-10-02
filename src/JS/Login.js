import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post('http://localhost:8001/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const token = response.data.access_token;
      sessionStorage.setItem('token', token);

      const userResponse = await axios.get('http://localhost:8001/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const user = userResponse.data;
      sessionStorage.setItem('user', JSON.stringify(user));

      // Log the user object to the console
      console.log('Logged in user:', user);

      // Trigger the storage event to update Navbar
      window.dispatchEvent(new Event('storage'));

      // Navigate to DisplayFarmPage upon successful login
      navigate('/displayfarm');
    } catch (error) {
      console.error('Login failed', error);
      if (error.response) {
        if (error.response.status === 404) {
          // If the user doesn't exist, redirect to the registration page
          navigate('/register');
        } else if (error.response.status === 401) {
          setError('Invalid credentials');
        } else {
          setError('An error occurred during login');
        }
      } else {
        setError('Login failed');
      }
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Login;
