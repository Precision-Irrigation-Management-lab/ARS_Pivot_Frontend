import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../CSS/NodeStatus.css';

const NodeStatus = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse the user ID from the session storage
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userid = user?.user_id // Retrieve userid from session storage
  //console.log(userid)
  useEffect(() => {
    if (!userid) {
      setError('User ID not found. Please login first.');
      setLoading(false);
      return;
    }
    const fetchNodes = async () => {
      try {
        const result = await axios.get(`http://127.0.0.1:8002/data/userid/${userid}/nodes/last-reported-dates`);
        setNodes(result.data);
        setLoading(false);
      } catch (error) {
        setError('Error fetching node data.');
        setLoading(false);
      }
    };
    fetchNodes();
  }, [userid]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="node-status">
      <h2>Node Status</h2>
      <div className="card-container">
        {nodes.map((node) => (
          <div key={node.nodeid} className="card">
            <h3>Node {node.nodeid}</h3>
            <p>Last Reported Date: {new Date(node.last_reported_date).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodeStatus;
