import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/AddTDRGateway.css'; // Assuming you have some CSS for styling
import Modal from './Modal'; // Ensure the correct import path

const AddTDRGateway = () => {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  
  // Retrieve user object from session storage
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userId = user?.user_id;

  useEffect(() => {
    const fetchGatewayData = async () => {
      try {
        const response = await fetch(`http://localhost:8002/tdrcred/${userId}`);
        const data = await response.json();
        if (response.ok && data.gateways && data.gateways.length > 0) {
          sessionStorage.setItem('gatewayData', JSON.stringify(data));
          setGateways(data.gateways);
        } else {
          setError('No Tdr credentials are added. Please add them.');
          setShowModal(true);
        }
      } catch (error) {
        setError('Failed to fetch gateway data.');
        setShowModal(true);
      } finally {
        setLoading(false);
      }
    };

    const storedGatewayData = sessionStorage.getItem('gatewayData');
    if (storedGatewayData) {
      const gatewayData = JSON.parse(storedGatewayData);
      setGateways(gatewayData.gateways || []);
      setLoading(false);
    } else {
      fetchGatewayData();
    }
  }, [userId]);

  const handleGatewayClick = (gatewayId) => {
    navigate('/nodelist', { state: { gatewayId } });
  };

  const handleAddTDRCred = () => {
    navigate('/tdrcred');
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="gateway-list">
      <h2>Gateway List</h2>
      {gateways.length > 0 ? (
        <div className="card-container">
          {gateways.map((gateway) => (
            <div className="card" key={gateway} onClick={() => handleGatewayClick(gateway)}>
              <div className="card-content">
                <h3>Gateway ID: {gateway}</h3>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No gateways available.</p>
      )}
      <Modal
        message={error}
        onClose={() => setShowModal(false)}
        onConfirm={() => {}}
        buttonText="Add TDR Credentials"
        onButtonClick={handleAddTDRCred}
        isYesNo={false}
        show={showModal}
      />
    </div>
  );
};

export default AddTDRGateway;
