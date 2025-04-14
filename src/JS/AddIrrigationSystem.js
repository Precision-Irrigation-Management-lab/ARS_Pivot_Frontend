// AddIrrigationSystem.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal'; // Adjust the import path as needed
import { farmAPI } from './services/api'; // Import the API service

const AddIrrigationSystem = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Get user_id from sessionStorage
  const storedUser = sessionStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const user_id = user ? user.user_id : null;

  // Fetch farms using the new farms endpoint and new data response model.
  useEffect(() => {
    const fetchFarms = async () => {
      if (!user_id) {
        setError('User information is missing.');
        return;
      }
      try {
        const response = await farmAPI.getFarms(user_id);
        // Expecting the response to be an array of objects with at least { farmname, gateway }
        const fetchedFarms = response.data || [];
        setFarms(fetchedFarms);

        if (fetchedFarms.length === 0) {
          setError('No farms available. Please add a farm first.');
        }
      } catch (err) {
        console.error('Error fetching farms:', err);
        setError('Failed to load farms. Please try again later.');
      }
    };

    fetchFarms();
  }, [user_id]);

  const handleFarmChange = (e) => {
    setSelectedFarm(e.target.value);
  };

  const handleAddCenterPivot = () => {
    if (selectedFarm) {
      navigate('/addcenterpivot', { state: { farm: selectedFarm } });
    } else {
      setError('Please select a farm first.');
    }
  };

  const handleAddLinearMove = () => {
    if (selectedFarm) {
      navigate('/addlinearmove', { state: { farm: selectedFarm } });
    } else {
      setError('Please select a farm first.');
    }
  };

  const handleAddMicroIrrigation = () => {
    if (selectedFarm) {
      navigate('/addmicroirrigation', { state: { farm: selectedFarm } });
    } else {
      setError('Please select a farm first.');
    }
  };

  const handleAddFarm = () => {
    navigate('/addfarm');
  };

  const handleCloseModal = () => {
    setError('');
  };

  return (
    <div>
      <h2>Add Irrigation System</h2>
      {error && (
        <Modal
          message={error}
          onClose={handleCloseModal}
          buttonText="Add Farm"
          onButtonClick={handleAddFarm}
        />
      )}
      <div>
        <label htmlFor="farmSelect">Select Farm:</label>
        <select
          id="farmSelect"
          value={selectedFarm}
          onChange={handleFarmChange}
          disabled={farms.length === 0}
        >
          <option value="">Select a farm</option>
          {farms.map((farm, index) => (
            <option key={index} value={farm.farmname}>
              {farm.farmname}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button onClick={handleAddCenterPivot} disabled={farms.length === 0}>
          Add Center Pivot
        </button>
        <button onClick={handleAddLinearMove} disabled={farms.length === 0}>
          Add Linear Move
        </button>
        <button onClick={handleAddMicroIrrigation} disabled={farms.length === 0}>
          Add Micro Irrigation
        </button>
      </div>
    </div>
  );
};

export default AddIrrigationSystem;
