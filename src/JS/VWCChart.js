import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { useNavigate, useLocation } from 'react-router-dom';
import Modal from './Modal'; // Import the Modal component
import '../CSS/VWCChart.css';

const VWCChart = () => {
  const [nodeList, setNodeList] = useState([]);
  const [sensorAddresses, setSensorAddresses] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedSensorAddress, setSelectedSensorAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vwcData, setVwcData] = useState([]);
  const [swdData, setSwdData] = useState([]);
  const [specificAddressData, setSpecificAddressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addressError, setAddressError] = useState(false);
  const [gatewayList, setGatewayList] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Parse the user ID from the session storage
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userid = user?.user_id;

  useEffect(() => {
    if (!userid) {
      setError('User ID not found. Please login first.');
      setLoading(false);
      return;
    }

    const fetchGatewayData = async () => {
      try {
        const result = await axios.get(`http://localhost:8002/tdrcred/${userid}`);
        const gateways = result.data.gateways || [];
        setGatewayList(gateways);
        if (gateways.length > 0) {
          setSelectedGateway(gateways[0]);
        }
        setNodeList(result.data.nodelist || {});
        setLoading(false);
      } catch (error) {
        setError('Error fetching gateway data.');
        setLoading(false);
      }
    };

    fetchGatewayData();
  }, [userid]);

  useEffect(() => {
    if (selectedGateway) {
      const nodes = nodeList[selectedGateway] || [];
      setSelectedNode(nodes.length > 0 ? nodes[0] : '');
      if (nodes.length === 0) {
        setShowModal(true);
      }
    }
  }, [selectedGateway, nodeList]);

  useEffect(() => {
    if (selectedNode) {
      const fetchSensorAddresses = async () => {
        try {
          const result = await axios.get(`http://localhost:8002/node/userid/${userid}/gatewayid/${selectedGateway}/nodeid/${selectedNode}`);
          const addresses = Object.entries(result.data.sensoraddress || {})
            .filter(([key]) => key !== '@')
            .map(([key, value]) => ({ key, value }));
          setSensorAddresses(addresses);
          setSelectedSensorAddress(addresses[0]?.key || '');
          setAddressError(addresses.length === 0);
          if (addresses.length === 0) {
            setShowModal(true); // Show modal if no sensor addresses are found
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            setShowModal(true); // Show modal only if the API returns a 404 error for this endpoint
          } else {
            setError('Error fetching sensor addresses.');
          }
        }
      };

      fetchSensorAddresses();
    }
  }, [selectedNode, selectedGateway, userid]);

  useEffect(() => {
    if (selectedNode && startDate && endDate) {
      const fetchData = async () => {
        try {
          const response = await axios.get(
            `http://localhost:8002/data/userid/${userid}/nodeid/${selectedNode}/all?start_date=${startDate}&end_date=${endDate}`
          );

          // Ensure the response has data
          if (!response.data || response.data.length === 0) {
            setVwcData([]);
            setSwdData([]);
            return;
          }

          const vwc = response.data.filter(d => d.vwc !== null).map(d => ({ timestamp: d.timestamp_pst, value: d.vwc, address: d.address }));
          const swd = response.data.filter(d => d.swd !== null).map(d => ({ timestamp: d.timestamp_pst, value: d.swd, address: d.address }));
          setVwcData(vwc);
          setSwdData(swd);
        } catch (error) {
          setError('Error fetching data.');
        }
      };

      fetchData();
    }
  }, [selectedNode, startDate, endDate, userid]);

  useEffect(() => {
    if (selectedNode && selectedSensorAddress && startDate && endDate) {
      const fetchSpecificAddressData = async () => {
        try {
          const response = await axios.get(
            `http://localhost:8002/data/userid/${userid}/nodeid/${selectedNode}/sensoraddress/${selectedSensorAddress}/startdate/${startDate}/enddate/${endDate}`
          );

          // Ensure the response has data
          if (!response.data || response.data.length === 0) {
            setSpecificAddressData([]);
            return;
          }

          const specificData = response.data.filter(d => d.vwc !== null && d.swd !== null).map(d => ({
            timestamp_pst: d.timestamp_pst,
            vwc: d.vwc,
            swd: d.swd,
          }));
          setSpecificAddressData(specificData);
        } catch (error) {
          setError('Error fetching specific address data.');
        }
      };

      fetchSpecificAddressData();
    }
  }, [selectedNode, selectedSensorAddress, startDate, endDate, userid]);

  const handleNodeChange = (e) => {
    setSelectedNode(e.target.value);
    setError(null);
  };

  const handleSensorAddressChange = (e) => {
    setSelectedSensorAddress(e.target.value);
  };

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handleGatewayChange = (e) => {
    setSelectedGateway(e.target.value);
    setError(null);
  };

  const handleAddNodeClick = () => {
    navigate(`/node/${selectedNode}`, { state: { gatewayId: selectedGateway, previousPage: location.pathname } });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (loading) return <p>Loading...</p>;

  const vwcTraces = sensorAddresses.map(({ key, value }) => {
    const data = vwcData.filter(d => d.address === key);
    return {
      x: data.map(d => d.timestamp),
      y: data.map(d => d.value),
      type: 'scatter',
      mode: 'lines',
      name: `Depth ${value} VWC`,
    };
  });

  const swdTraces = sensorAddresses.map(({ key, value }) => {
    const data = swdData.filter(d => d.address === key);
    return {
      x: data.map(d => d.timestamp),
      y: data.map(d => d.value),
      type: 'scatter',
      mode: 'lines',
      name: `Depth ${value} SWD`,
    };
  });

  const specificAddressTraces = [
    {
      x: specificAddressData.map(d => d.timestamp_pst),
      y: specificAddressData.map(d => d.vwc),
      type: 'scatter',
      mode: 'lines',
      name: 'VWC (%)',
    },
    {
      x: specificAddressData.map(d => d.timestamp_pst),
      y: specificAddressData.map(d => d.swd),
      type: 'scatter',
      mode: 'lines',
      name: 'SWD (mm)',
    },
  ];

  return (
    <div className="vwc-chart">
      <h2>Volumetric Water Content and Soil Water Depletion Charts</h2>
      <div className="controls">
        <select onChange={handleGatewayChange} value={selectedGateway}>
          {gatewayList.map((gateway) => (
            <option key={gateway} value={gateway}>
              Gateway {gateway}
            </option>
          ))}
        </select>
        <select onChange={handleNodeChange} value={selectedNode}>
          {(nodeList[selectedGateway] || []).map((node) => (
            <option key={node} value={node}>
              Node {node}
            </option>
          ))}
        </select>
        <select onChange={handleSensorAddressChange} value={selectedSensorAddress}>
          {sensorAddresses.map(({ key, value }) => (
            <option key={key} value={key}>
              Address {value}
            </option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={handleStartDateChange} />
        <input type="date" value={endDate} onChange={handleEndDateChange} />
      </div>
      {addressError && <p>No sensor addresses found for the selected node. Please add sensor addresses to view the charts.</p>}
      <div className="chart-container">
        <Plot
          data={vwcTraces}
          layout={{ title: `Volumetric Water Content Over Time for Node ${selectedNode}`, template: 'plotly_dark' }}
        />
        <Plot
          data={swdTraces}
          layout={{ title: `Soil Water Depletion Over Time for Node ${selectedNode}`, template: 'plotly_dark' }}
        />
        <Plot
          data={specificAddressTraces}
          layout={{ title: `Soil Moisture and Soil Water Depletion Over Time for Address ${sensorAddresses.find(addr => addr.key === selectedSensorAddress)?.value}`, template: 'plotly_dark' }}
        />
      </div>
      {error && !addressError && <p>{error}</p>}
      <Modal
        message="No sensor addresses found for the selected node. Please add node data to proceed."
        onClose={handleCloseModal}
        onButtonClick={handleAddNodeClick}
        buttonText="Add Node Data"
        show={showModal}
      />
    </div>
  );
};

export default VWCChart;
