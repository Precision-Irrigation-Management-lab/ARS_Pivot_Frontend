import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../CSS/NodeList.css'; // Assuming you have some CSS for styling

const NodeList = () => {
  const [nodes, setNodes] = useState([]);
  const [nodeIdsResponse, setNodeIdsResponse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gatewayId, setGatewayId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stateGatewayId = location.state?.gatewayId;

    if (!stateGatewayId) {
      setError('Gateway ID not provided.');
      setLoading(false);
      return;
    }

    setGatewayId(stateGatewayId);

    const storedGatewayData = sessionStorage.getItem('gatewayData');
    const storedUserData = sessionStorage.getItem('user');
    if (!storedGatewayData || !storedUserData) {
      setError('Gateway data or user data not found. Please submit credentials first.');
      setLoading(false);
      return;
    }

    const gatewayData = JSON.parse(storedGatewayData);
    const userData = JSON.parse(storedUserData);
    const userId = userData.user_id; // Extract user ID from user object
    setNodes(gatewayData.nodelist[stateGatewayId] || []);

    // Fetch node IDs from the endpoint
    const fetchNodeIds = async () => {
      try {
        const response = await axios.get(`http://localhost:8002/nodes/userid/${userId}/gatewayid/${stateGatewayId}`);
        setNodeIdsResponse(response.data.nodeids);
      } catch (error) {
        setError('Failed to fetch node IDs.');
      } finally {
        setLoading(false);
      }
    };

    fetchNodeIds();
  }, [location.state]);

  const handleNodeClick = (nodeId) => {
    navigate(`/node/${nodeId}`, { state: { gatewayId } });
  };

  const getNodeColor = (nodeId) => {
    return nodeIdsResponse.includes(nodeId) ? 'green' : 'red';
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="node-list">
      <h2>Nodes for Gateway ID: {gatewayId}</h2>
      {nodes.length > 0 ? (
        <div className="card-container">
          {nodes.map((nodeId) => (
            <div
              className="card"
              key={nodeId}
              onClick={() => handleNodeClick(nodeId)}
              style={{ backgroundColor: getNodeColor(nodeId) }}
            >
              <div className="card-content">
                <h3>Node ID: {nodeId}</h3>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No nodes available for this gateway.</p>
      )}
    </div>
  );
};

export default NodeList;
