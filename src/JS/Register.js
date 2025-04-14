import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from './services/api'; // Import the API service

const Register = () => {
  const [password, setPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');
  const [email, setEmail] = useState('');
  const [units, setUnits] = useState('SI');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== reEnterPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setMessage('');
    
    try {
      await authAPI.register({
        email: email,
        password: password,
        units: units
      });

      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      console.error('Registration error:', err);
      setMessage(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <div>
          <label>Re-enter Password:</label>
          <input
            type="password"
            value={reEnterPassword}
            onChange={(e) => setReEnterPassword(e.target.value)}
          />
        </div>
        <div>
          <label>Units:</label>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value)}
          >
            <option value="SI">SI</option>
            <option value="Imperial">Imperial</option>
          </select>
        </div>
        <button type="submit">Register</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Register;
