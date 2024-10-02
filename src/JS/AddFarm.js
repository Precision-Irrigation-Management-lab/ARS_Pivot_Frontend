// AddFarm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AddFarm = () => {
  const [farmName, setFarmName] = useState('');
  const [farms, setFarms] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await axios.get('http://localhost:8001/users/me', {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        setFarms(response.data.farms || []);
      } catch (error) {
        console.error('Error fetching farms:', error);
      }
    };

    fetchFarms();
  }, []);

  const handleFarmNameChange = (e) => {
    setFarmName(e.target.value);
  };

  const handleAddFarm = async (e) => {
    e.preventDefault();
    // Check if the farm name already exists
    if (farms.includes(farmName)) {
      setError('Farm name already exists. Please choose a different name.');
    } else {
      const updatedFarms = [...farms, farmName];
      try {
        const requestBody = { farms: updatedFarms };
        console.log('Submitting farms:', requestBody);
        await axios.put('http://localhost:8001/users/me', requestBody, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        navigate('/add-irrigation-system'); // Navigate to Add Irrigation System page
      } catch (error) {
        console.error('Error submitting farms:', error);
      }
    }
  };

  return (
    <div>
      <h2>Add Farm</h2>
      <form onSubmit={handleAddFarm}>
        <div>
          <label htmlFor="farmName">Farm Name:</label>
          <input
            type="text"
            id="farmName"
            value={farmName}
            onChange={handleFarmNameChange}
            required
            autoComplete="off"
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Add Farm</button>
      </form>
    </div>
  );
};

export default AddFarm;
