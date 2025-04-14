import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Select,
  MenuItem,
  TextField,
  Typography,
  Modal,
} from '@mui/material';
import { acclimaAPI } from './services/api'; // Import the API service
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
  const [specificData, setSpecificData] = useState([]);
  const [avgSwdData, setAvgSwdData] = useState([]); // New state for avg_swd data
  const [gatewayList, setGatewayList] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [addressError, setAddressError] = useState(false);
  const [fcValues, setFcValues] = useState([]);
  const [wpValues, setWpValues] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(sessionStorage.getItem('user'));
  const userid = user?.user_id;

  const vwcChartRef = useRef(null);
  const swdChartRef = useRef(null);
  const specificChartRef = useRef(null);
  const avgSwdChartRef = useRef(null); // New ref for avg_swd chart
  const fcRef = useRef(null);
  const wpRef = useRef(null);

  useEffect(() => {
    if (!userid) {
      setError('User ID not found. Please login first.');
      return;
    }

    const fetchGatewayData = async () => {
      try {
        const result = await acclimaAPI.getGateways(userid);
        const gateways = result.data.gateways || [];
        setGatewayList(gateways);
        if (gateways.length > 0) {
          setSelectedGateway(gateways[0]);
        }
        setNodeList(result.data.nodelist || {});
      } catch (err) {
        setError('Error fetching gateway data.');
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
          const result = await acclimaAPI.getNodeData(userid, selectedGateway, selectedNode);
          const addresses = Object.entries(result.data.sensoraddress || {})
            .filter(([key]) => key !== '@')
            .map(([key, value]) => ({ key, value })); // key = address identifier, value = name
          setSensorAddresses(addresses);
          setSelectedSensorAddress(addresses[0]?.key || '');
          setAddressError(addresses.length === 0);
          if (addresses.length === 0) {
            setShowModal(true);
          }
        } catch (err) {
          setError('Error fetching sensor addresses.');
        }
      };

      fetchSensorAddresses();
    }
  }, [selectedNode, selectedGateway, userid]);

  useEffect(() => {
    if (selectedNode && startDate && endDate) {
      const fetchData = async () => {
        try {
          const response = await acclimaAPI.getAllData(userid, selectedNode, startDate, endDate);
          const vwc = response.data.filter(d => d.vwc !== null).map(d => ({
            timestamp: d.timestamp_pst,
            value: d.vwc,
            address: d.address,
          }));
          const swd = response.data.filter(d => d.swd !== null).map(d => ({
            timestamp: d.timestamp_pst,
            value: d.swd,
            address: d.address,
          }));
          setVwcData(vwc);
          setSwdData(swd);
        } catch (err) {
          setError('Error fetching VWC/SWD data.');
        }
      };

      fetchData();
    }
  }, [selectedNode, startDate, endDate, userid]);

  useEffect(() => {
    if (selectedNode && startDate && endDate) {
      const fetchAvgSwdData = async () => {
        try {
          const response = await acclimaAPI.getAvgSwdData(userid, selectedNode, startDate, endDate);
          const avgSwd = response.data.map(d => ({
            timestamp: d.timestamp,
            avg_swd: d.avg_swd,
            nodeid: d.nodeid,
          }));
          setAvgSwdData(avgSwd);
        } catch (err) {
          setError('Error fetching avg SWD data.');
        }
      };

      fetchAvgSwdData();
    }
  }, [selectedNode, startDate, endDate, userid]);

  useEffect(() => {
    if (selectedNode && selectedSensorAddress && startDate && endDate) {
      const fetchSpecificData = async () => {
        try {
          const response = await acclimaAPI.getSensorData(
            userid, 
            selectedNode, 
            selectedSensorAddress, 
            startDate, 
            endDate
          );
          const data = response.data.map(d => ({
            timestamp: d.timestamp_pst,
            vwc: d.vwc,
            swd: d.swd,
          }));
          setSpecificData(data);
        } catch (err) {
          setError('Error fetching data for the selected address.');
        }
      };

      fetchSpecificData();
    }
  }, [selectedNode, selectedSensorAddress, startDate, endDate, userid]);

  useEffect(() => {
    if (selectedNode && selectedSensorAddress) {
      const fetchFCWP = async () => {
        try {
          const result = await acclimaAPI.getNodeData(userid, selectedGateway, selectedNode);
  
          console.log("Full API Response:", result.data);
  
          // Ensure sensoraddress is valid and contains mappings
          const validSensorAddresses = Object.fromEntries(
            Object.entries(result.data.sensoraddress).filter(([key]) => key !== "@")
          );
  
          console.log("Valid Sensor Addresses:", validSensorAddresses);
          console.log("Selected Sensor Address:", selectedSensorAddress);
  
          // Convert `selectedSensorAddress` to match the float format in `fc` and `wp`
          const mappedKey = parseFloat(selectedSensorAddress).toFixed(1); 
  
          // Extract FC and WP using the correctly formatted key
          const fc = result.data.fc?.[mappedKey] ?? null;
          const wp = result.data.wp?.[mappedKey] ?? null;
  
          console.log("Mapped Sensor Key:", mappedKey);
          console.log("Extracted FC:", fc);
          console.log("Extracted WP:", wp);
  
          // Store values in refs to prevent unnecessary re-renders
          fcRef.current = fc;
          wpRef.current = wp;
  
          setFcValues(fc);
          setWpValues(wp);
        } catch (err) {
          console.error("Error fetching FC/WP values:", err);
          setError('Error fetching FC/WP values.');
        }
      };
  
      fetchFCWP();
    }
    // Exclude `fcValues` and `wpValues` from dependencies to avoid infinite loops
  }, [selectedNode, selectedSensorAddress, selectedGateway, userid]);
  
    
  const renderChart = useCallback((ref, data, title, yAxisName, seriesConfig) => {
    if (ref.current) {
      const chartInstance = echarts.init(ref.current);
      const options = {
        title: { text: title, left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { bottom: 0 },
        xAxis: { type: 'category', data: data.map(d => d.timestamp), name: 'Time' },
        yAxis: { type: 'value', name: yAxisName },
        series: seriesConfig,
      };
      chartInstance.setOption(options);
    }
  }, []);

  useEffect(() => {
    const addressNames = sensorAddresses.reduce((acc, addr) => {
      acc[addr.key] = addr.value;
      return acc;
    }, {});

    const addresses = Array.from(new Set(vwcData.map(d => d.address)))
      .sort((a, b) => (addressNames[a] || a).localeCompare(addressNames[b] || b)); // Sort addresses by names

    const series = addresses.map(address => ({
      name: addressNames[address] || address, // Use name if available; fallback to address
      type: 'line',
      smooth: true,
      data: vwcData
        .filter(d => d.address === address)
        .map(d => [d.timestamp, d.value]),
    }));

    renderChart(vwcChartRef, vwcData, 'VWC Data for Selected Node', 'VWC (%)', series);

    renderChart(swdChartRef, swdData, 'SWD Data for Selected Node', 'SWD (mm)', [
      {
        name: 'SWD',
        type: 'line',
        smooth: true,
        data: swdData.map(d => [d.timestamp, d.value]),
      },
    ]);

    renderChart(specificChartRef, specificData, 'Specific Address Data', 'VWC/SWD', [
      {
        name: 'VWC',
        type: 'line',
        smooth: true,
        data: specificData.map(d => [d.timestamp, d.vwc]),
      },
      {
        name: 'SWD',
        type: 'line',
        smooth: true,
        data: specificData.map(d => [d.timestamp, d.swd]),
      },
      ...(fcValues !== null
        ? [{
            name: 'FC (Field Capacity)',
            type: 'line',
            smooth: false,
            lineStyle: { type: 'solid', width: 2 },
            data: specificData.length > 0 
              ? specificData.map(d => [d.timestamp, fcValues])  // Repeat FC value for all timestamps
              : [],
          }]
        : []),
      ...(wpValues !== null
        ? [{
            name: 'WP (Wilting Point)',
            type: 'line',
            smooth: false,
            lineStyle: { type: 'solid', width: 2 },
            data: specificData.length > 0 
              ? specificData.map(d => [d.timestamp, wpValues])  // Repeat WP value for all timestamps
              : [],
          }]
        : []),
    ]);

    renderChart(avgSwdChartRef, avgSwdData, 'Average SWD Data', 'Avg SWD (mm)', [
      {
        name: 'Avg SWD',
        type: 'line',
        smooth: true,
        data: avgSwdData.map(d => [d.timestamp, d.avg_swd]),
      },
    ]);
  }, [vwcData, swdData, specificData, avgSwdData, sensorAddresses, renderChart]);

  const handleAddNodeClick = () => {
    navigate(`/node/${selectedNode}`, {
      state: { gatewayId: selectedGateway, previousPage: location.pathname },
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <Box sx={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Volumetric Water Content and Soil Water Depletion Charts
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 3 }}>
        <Select
          value={selectedGateway}
          onChange={e => setSelectedGateway(e.target.value)}
          fullWidth
        >
          {gatewayList.map(gateway => (
            <MenuItem key={gateway} value={gateway}>
              Gateway {gateway}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={selectedNode}
          onChange={e => setSelectedNode(e.target.value)}
          fullWidth
        >
          {(nodeList[selectedGateway] || []).map(node => (
            <MenuItem key={node} value={node}>
              Node {node}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={selectedSensorAddress}
          onChange={e => setSelectedSensorAddress(e.target.value)}
          fullWidth
        >
          {sensorAddresses.map(({ key, value }) => (
            <MenuItem key={key} value={key}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, marginBottom: 3 }}>
        <TextField
          type="date"
          label="Start Date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="End Date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div ref={vwcChartRef} style={{ height: '400px', width: '100%' }} />
        <div ref={swdChartRef} style={{ height: '400px', width: '100%' }} />
        <div ref={specificChartRef} style={{ height: '400px', width: '100%' }} />
        <div ref={avgSwdChartRef} style={{ height: '400px', width: '100%' }} /> {/* New chart for avg_swd */}
      </Box>
      <Modal open={showModal} onClose={handleCloseModal}>
        <Box
          sx={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '5px',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6">
            No sensor addresses found. Please add node data to proceed.
          </Typography>
          <Button
            onClick={handleAddNodeClick}
            variant="contained"
            color="primary"
          >
            Add Node Data
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default VWCChart;