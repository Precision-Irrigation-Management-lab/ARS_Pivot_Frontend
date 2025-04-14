import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Tabs, Tab, TextField, Button, IconButton, Typography, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const NodeForm = () => {
  const { nodeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userid = user ? user.user_id : null;

  const [formData, setFormData] = useState({
    lat: '',
    long: '',
    depths: [],
    fc: [],
    wp: [],
    li: [],
    rootdepth: '',
    nodename: ''
  });

  const [gatewayId, setGatewayId] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [previousPage, setPreviousPage] = useState('');
  const [selectedTab, setSelectedTab] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const stateGatewayId = location.state?.gatewayId;
    const statePreviousPage = location.state?.previousPage;

    if (stateGatewayId) {
      setGatewayId(stateGatewayId);
    } else {
      setResponseMessage('Gateway ID not provided.');
    }

    if (statePreviousPage) {
      setPreviousPage(statePreviousPage);
    }
  }, [location.state]);

  const fetchSoilData = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8002/fetch-soil-data/', {
        latitude: parseFloat(formData.lat),
        longitude: parseFloat(formData.long)
      });

      if (response.data && response.data.soil_data) {
        const soil = response.data.soil_data;
        const fc = soil.map(({ FieldCapacity_Percentage }) => FieldCapacity_Percentage);
        const wp = soil.map(({ WiltingPoint_Percentage }) => WiltingPoint_Percentage);

        let updatedFormData = { ...formData, fc, wp };

        if (selectedTab === 0) {
          // Without TDR: Populate depths normally and calculate li
          const depths = soil.map(({ HorizonTopDepth_cm, HorizonBottomDepth_cm }) =>
            `${HorizonTopDepth_cm}-${HorizonBottomDepth_cm}`
          );
          const li = calculateLayerOfInfluence(soil);
          updatedFormData = { ...updatedFormData, depths, li: li.map(String) };
        } else {
          // With TDR: Match depths to fc/wp count, but set them to empty or "0"
          updatedFormData.depths = fc.map(() => "0");
          updatedFormData.li = []; // Do not calculate li
        }

        setFormData(updatedFormData);
        setResponseMessage('Soil data fetched and populated successfully.');
      } else {
        setResponseMessage('No soil data found for the given coordinates.');
      }
    } catch (error) {
      console.error('Error fetching soil data:', error);
      setResponseMessage('Failed to fetch soil data.');
    }
  };

  const calculateLayerOfInfluence = (soil) => {
    return soil.map(({ HorizonTopDepth_cm, HorizonBottomDepth_cm }, index) => {
      const top = index === 0 ? 0 : parseFloat(HorizonTopDepth_cm);
      const bottom = parseFloat(HorizonBottomDepth_cm);
      return bottom - top;
    });
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setFormVisible(true);

    setFormData({
      lat: '',
      long: '',
      depths: [],
      fc: [],
      wp: [],
      li: []
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'lat' || name === 'long' || name === 'rootdepth'|| name === 'nodename') {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    } else {
      const [field, index] = name.split('-');
      setFormData((prevData) => {
        const newArray = [...(prevData[field] ?? [])];
        newArray[index] = value;
        let updatedFormData = { ...prevData, [field]: newArray };
  
        if (field === 'depths' && selectedTab === 1) {
          const li = calculateLayerOfInfluenceFromDepths(newArray);
          updatedFormData = { ...updatedFormData, li: li.map(String) };
        }
  
        return updatedFormData;
      });
    }
  };

  const handleAddField = (field) => {
    setFormData((prevData) => {
      const updatedField = [...(prevData[field] ?? []), ''];
      let updatedFormData = { ...prevData, [field]: updatedField };
  
      if (field === 'depths' && selectedTab === 1) {
        const li = calculateLayerOfInfluenceFromDepths(updatedField);
        updatedFormData = { ...updatedFormData, li: li.map(String) };
      }
  
      return updatedFormData;
    });
  };
  
  const calculateLayerOfInfluenceFromDepths = (depths) => {
    return depths.map((depth, index) => {
      const [top, bottom] = depth.split('-').map(parseFloat);
      return bottom - top;
    });
  };

  const handleDeleteField = (field, index) => {
    setFormData((prevData) => {
      const newArray = (prevData[field] ?? []).filter((_, i) => i !== index);
      return { ...prevData, [field]: newArray };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userid || !nodeId || !gatewayId) {
      setResponseMessage('User ID, Node ID, and Gateway ID must be valid integers.');
      return;
    }

    const endpoint = 'http://127.0.0.1:8002/node/';
    const postData = {
      user_id: parseInt(userid, 10),
      nodeid: parseInt(nodeId, 10),
      gatewayid: parseInt(gatewayId, 10),
      lat: parseFloat(formData.lat),
      long: parseFloat(formData.long),
      sensoraddress: Object.fromEntries((formData.depths ?? []).map((value, index) => [index + 1, value])),
      fc: Object.fromEntries((formData.fc ?? []).map((value, index) => [(index + 1).toFixed(1), parseFloat(value)])),
      wp: Object.fromEntries((formData.wp ?? []).map((value, index) => [(index + 1).toFixed(1), parseFloat(value)])),
      li: Object.fromEntries((formData.li ?? []).map((value, index) => [(index + 1).toFixed(1), parseFloat(value)])),
      rootdepth: parseFloat(formData.rootdepth),
      nodename: formData.nodename
    };

    try {
      await axios.post(endpoint, postData);
      setResponseMessage('Data submitted successfully!');
      navigate(previousPage === '/vwcchart' ? '/vwcchart' : '/addtdrgateway');
    } catch (error) {
      setResponseMessage('Error submitting data.');
      console.error('Error submitting data:', error);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Add Data for Node ID: {nodeId}
      </Typography>

      <Tabs value={selectedTab} onChange={handleTabChange} centered>
        <Tab label="Without TDR" />
        <Tab label="With TDR" />
      </Tabs>

      {formVisible && (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField fullWidth label="Name the node" name="nodename" value={formData.nodename} onChange={handleChange} required sx={{ mt: 2 }} />
          <TextField fullWidth label="Latitude" name="lat" value={formData.lat} onChange={handleChange} required />
          <TextField fullWidth label="Longitude" name="long" value={formData.long} onChange={handleChange} required sx={{ mt: 2 }} />
          <TextField fullWidth label="Root Zone Depth" name="rootdepth" value={formData.rootdepth} onChange={handleChange} required sx={{ mt: 2 }} />

          <Button variant="contained" onClick={fetchSoilData} sx={{ mb: 2 }}>
            Fetch Soil Data
          </Button>

          {['depths', 'fc', 'wp', 'li'].map((field) => (
            <Box key={field} sx={{ mt: 2 }}>
              <Typography>{field.toUpperCase()}</Typography>
              {(formData[field] ?? []).map((value, index) => (
                <Box key={`${field}-${index}`} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TextField fullWidth name={`${field}-${index}`} value={value} onChange={handleChange} required />
                  <IconButton onClick={() => handleDeleteField(field, index)}><DeleteIcon /></IconButton>
                </Box>
              ))}
              <Button onClick={() => handleAddField(field)}>Add {field.toUpperCase()}</Button>
            </Box>
          ))}

          <Button type="submit" variant="contained" sx={{ mt: 3 }}>Submit</Button>
        </Box>
      )}

      {responseMessage && <Typography color="error" sx={{ mt: 2 }}>{responseMessage}</Typography>}
    </Box>
  );
};

export default NodeForm;
