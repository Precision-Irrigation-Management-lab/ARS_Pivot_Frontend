// AddIrrigationSystem.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal'; // Adjust the import path as needed

const AddIrrigationSystem = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
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
        const fetchedFarms = response.data.farms || [];
        setFarms(fetchedFarms);

        if (fetchedFarms.length === 0) {
          setError('No farms available. Please add a farm first.');
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        setError('Failed to load farms. Please try again later.');
      }
    };

    fetchFarms();
  }, []);

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
    // Add logic to handle adding linear move
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
        <select id="farmSelect" value={selectedFarm} onChange={handleFarmChange} disabled={farms.length === 0}>
          <option value="">Select a farm</option>
          {farms.map((farm, index) => (
            <option key={index} value={farm}>
              {farm}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button onClick={handleAddCenterPivot} disabled={farms.length === 0}>Add Center Pivot</button>
        <button onClick={handleAddLinearMove} disabled={farms.length === 0}>Add Linear Move</button>
      </div>
    </div>
  );
};

export default AddIrrigationSystem;
