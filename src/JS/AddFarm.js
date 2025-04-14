// AddFarm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { farmAPI } from './services/api'; // Import the API service

const AddFarm = () => {
  const [farmName, setFarmName] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('');
  const [gateways, setGateways] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Get the user object from sessionStorage
  const storedUser = sessionStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const user_id = user ? user.user_id : null;

  // Fetch available gateways using /tdrcred/{user_id}
  useEffect(() => {
    if (user_id) {
      const fetchGateways = async () => {
        try {
          const res = await axios.get(`http://localhost:8002/tdrcred/${user_id}`);
          // Expected response:
          // {
          //   "id": user_id,
          //   "message": "Successfully retrieved",
          //   "gateways": gatewayids,
          //   "nodelist": nodelist_by_gateway
          // }
          const gatewayList = res.data.gateways || [];
          setGateways(gatewayList);
          if (gatewayList.length > 0) {
            setSelectedGateway(gatewayList[0]); // default to the first gateway
          }
        } catch (err) {
          console.error('Error fetching gateways:', err);
          setError('Error fetching gateways.');
        }
      };
      fetchGateways();
    } else {
      setError('User information is missing.');
    }
  }, [user_id]);

  const handleFarmNameChange = (e) => {
    setFarmName(e.target.value);
  };

  const handleGatewayChange = (e) => {
    setSelectedGateway(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Get user_id from sessionStorage
      const storedUser = sessionStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const user_id = user ? user.user_id : null;
      
      if (!user_id) {
        throw new Error('User information is missing.');
      }
      
      await farmAPI.createFarm({
        user_id: user_id,
        farmname: farmName,
        gateway: selectedGateway
      });
      
      navigate('/addirrigation');
    } catch (err) {
      console.error('Error adding farm:', err);
      setError(err.response?.data?.detail || 'Failed to add farm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add Farm</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
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
        <div>
          <label htmlFor="gateway">Gateway:</label>
          <select id="gateway" value={selectedGateway} onChange={handleGatewayChange} required>
            {gateways.map((gateway, index) => (
              <option key={index} value={gateway}>
                {gateway}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading}>Add Farm</button>
      </form>
    </div>
  );
};

export default AddFarm;
