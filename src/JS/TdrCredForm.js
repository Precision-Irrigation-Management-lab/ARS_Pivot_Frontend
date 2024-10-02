import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TdrCredForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    user_id: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(sessionStorage.getItem('user')); // Parse user object from session storage
    const userId = user?.user_id; // Safely access user_id from the user object
  
    if (!userId) {
      setResponseMessage('User ID not found. Please login first.');
      return;
    }
  
    const endpoint = 'http://127.0.0.1:8002/tdrcred/';
    const dataToSubmit = { ...formData, user_id: userId }; // Include user ID in the form data
  
    try {
      const response = await axios.post(endpoint, dataToSubmit);
      console.log('API Response:', response.data);
      sessionStorage.setItem('userid', response.data.id); // Store user ID in session storage
      sessionStorage.setItem('gatewayData', JSON.stringify(response.data)); // Store entire response data
      setResponseMessage('Credentials submitted successfully!');
      navigate('/addtdrgateway');
    } catch (error) {
      setResponseMessage('Error submitting credentials.');
      console.error('Error submitting credentials:', error);
    }
  };
  

  return (
    <div>
      <h2>TDR Credentials Form</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Username:
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Password:
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <button type="submit">Submit</button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
};

export default TdrCredForm;
