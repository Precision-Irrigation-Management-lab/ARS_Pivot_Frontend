import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [password, setPassword] = useState('');
  const [reEnterPassword, setReEnterPassword] = useState('');
  const [email, setEmail] = useState('');
  const [units, setUnits] = useState('SI');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== reEnterPassword) {
      setMessage('Passwords do not match');
      return;
    }

    const requestBody = {
      password,
      email,
      units,
      farms: [] // Adding farms field as an empty list
    };

    console.log('Request Body:', requestBody); // Console log the request body

    try {
      const response = await axios.post('http://localhost:8001/register', requestBody);
      setMessage(response.data.message);
      // Navigate to login page upon successful registration
      if (response.status === 201) {
        navigate('/login');
      }
    } catch (error) {
      setMessage('Registration failed');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
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
