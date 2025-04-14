import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../CSS/NodeList.css'; // Assuming you have some CSS for styling

const NodeList = () => {
  const [nodes, setNodes] = useState([]);
  // Updated state to store the new API response structure
  const [apiNodes, setApiNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [criticalError, setCriticalError] = useState(null);
  const [nodeIdsError, setNodeIdsError] = useState(null);
  const [gatewayId, setGatewayId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stateGatewayId = location.state?.gatewayId;
    if (!stateGatewayId) {
      setCriticalError('Gateway ID not provided.');
      setLoading(false);
      return;
    }
    setGatewayId(stateGatewayId);

    const storedGatewayData = sessionStorage.getItem('gatewayData');
    const storedUserData = sessionStorage.getItem('user');
    if (!storedGatewayData || !storedUserData) {
      setCriticalError('Gateway data or user data not found. Please submit credentials first.');
      setLoading(false);
      return;
    }

    const gatewayData = JSON.parse(storedGatewayData);
    const userData = JSON.parse(storedUserData);
    const userId = userData.user_id; // Extract user ID from user object

    // The nodelist is assumed to be an array (either of strings or objects)
    setNodes(gatewayData.nodelist?.[stateGatewayId] || []);

    // Fetch node IDs and nodenames from the endpoint
    const fetchNodeData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8002/nodes/userid/${userId}/gatewayid/${stateGatewayId}`
        );
        // Set apiNodes to the nodes dictionary from the response
        setApiNodes(response.data.nodes || {});
      } catch (error) {
        setNodeIdsError('Failed to fetch node IDs.');
      } finally {
        setLoading(false);
      }
    };

    fetchNodeData();
  }, [location.state]);

  const handleNodeClick = (nodeId) => {
    navigate(`/node/${nodeId}`, { state: { gatewayId } });
  };

  // Determine the background color based on whether the nodeId is present in the API response.
  const getNodeColor = (nodeId) => {
    // Flatten the arrays of node IDs from the apiNodes dictionary.
    const allApiNodeIds = Object.values(apiNodes).flat();
    return allApiNodeIds.includes(nodeId) ? 'green' : 'red';
  };

  // Function to determine the display name for a node.
  // It first checks if the node from session storage already has a valid nodename.
  // Otherwise, it iterates over the apiNodes dictionary to see if a nodename exists for the nodeId.
  const getDisplayName = (node, nodeId) => {
    if (typeof node === 'object' && node.nodename && node.nodename.trim() !== '') {
      return node.nodename;
    }
    // Search for a nodename in the API response mapping.
    for (const [name, ids] of Object.entries(apiNodes)) {
      if (ids.includes(nodeId) && name.trim() !== '') {
        return name;
      }
    }
    // Fallback to using the nodeId as the display name.
    return nodeId;
  };

  if (loading) return <p>Loading...</p>;
  if (criticalError) return <p>{criticalError}</p>;

  return (
    <div className="node-list">
      <h2>Nodes for Gateway ID: {gatewayId}</h2>
      {nodeIdsError && <p className="error">{nodeIdsError}</p>}
      {nodes.length > 0 ? (
        <div className="card-container">
          {nodes.map((node) => {
            // Determine nodeId whether node is a string or an object.
            const nodeId = typeof node === 'object' ? node.node_id : node;
            const displayName = getDisplayName(node, nodeId);

            return (
              <div
                className="card"
                key={nodeId}
                onClick={() => handleNodeClick(nodeId)}
                style={{ backgroundColor: getNodeColor(nodeId) }}
              >
                <div className="card-content">
                  <h3>{displayName}</h3>
                  {/* If the display name differs from the node id, show the node id below */}
                  {displayName !== nodeId && <p>ID: {nodeId}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No nodes available for this gateway.</p>
      )}
    </div>
  );
};

export default NodeList;
