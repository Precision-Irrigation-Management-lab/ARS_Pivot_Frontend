import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/HomePage.css';

// MUI imports
import { Box, Button, TextField, MenuItem } from '@mui/material';
import WeatherApp from './WeatherApp'; // Adjust the import path if necessary

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const HomePage = () => {
  const mapRef = useRef();
  const location = useLocation();
  const navigate = useNavigate();
  const [geojsonData, setGeojsonData] = useState(null);
  const [managementZones, setManagementZones] = useState([]);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [irrigationSystems, setIrrigationSystems] = useState([]);
  const [selectedIrrigationSystem, setSelectedIrrigationSystem] = useState('');
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]);
  const [mapZoom] = useState(17);
  const [error, setError] = useState(null);

  const user = JSON.parse(sessionStorage.getItem('user'));
  const user_id = user?.user_id || location.state?.user_id;

  const initialFarm = location.state?.farmname || '';
  const initialIrrigationSystem = location.state?.irrigation_system_name || '';

  useEffect(() => {
    if (!user_id) {
      setError('User ID is not available. Please log in again.');
      return;
    }
  
    const fetchFarms = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/farms/${user_id}`);
        console.log('Fetched farms:', response.data);
        const fetchedFarms = Array.isArray(response.data) ? response.data : [];
        setFarms(fetchedFarms);
  
        if (fetchedFarms.length === 0) {
          setError('No farms available. Please add a farm first.');
        } else {
          const selectedFarmToUse = initialFarm
            ? (typeof initialFarm === 'object' ? initialFarm.farmname : initialFarm)
            : fetchedFarms[0].farmname;
          setSelectedFarm(selectedFarmToUse);
        }
      } catch (error) {
        console.error('Error fetching farms:', error);
        setError('Failed to load farms. Please try again later.');
      }
    };
  
    fetchFarms();
  }, [user_id, initialFarm]);
    
  
  useEffect(() => {
    if (!selectedFarm || !user_id) return;

    const fetchIrrigationSystems = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/irrigation-systems/${user_id}/${selectedFarm}/`);
        const fetchedIrrigationSystems = response.data.irrigation_system_names || [];
        setIrrigationSystems(fetchedIrrigationSystems);

        if (fetchedIrrigationSystems.length === 0) {
          setError('No irrigation systems available for the selected farm.');
        } else {
          const selectedIrrigationSystemToUse = initialIrrigationSystem || fetchedIrrigationSystems[0];
          setSelectedIrrigationSystem(selectedIrrigationSystemToUse);
          loadIrrigationSystemData(selectedIrrigationSystemToUse);
        }
      } catch (error) {
        console.error('Error fetching irrigation systems:', error);
        setError('Failed to load irrigation systems. Please try again later.');
      }
    };

    fetchIrrigationSystems();
  }, [selectedFarm, user_id, initialIrrigationSystem]);

  const loadIrrigationSystemData = useCallback(
    async (irrigationSystem) => {
      if (!irrigationSystem || !user_id || !selectedFarm) return;

      try {
        const geoJsonResponse = await axios.get(`http://localhost:8000/geojson/${user_id}/${selectedFarm}/${irrigationSystem}`);
        const { geojson, center } = geoJsonResponse.data;

        if (!geojson.features) {
          throw new Error('Invalid GeoJSON data: features property is missing');
        }

        const features = geojson.features.map((feature, index) => ({
          ...feature,
          id: feature.id || (feature.properties && feature.properties.id) || index,
        }));

        setGeojsonData({ type: 'FeatureCollection', features });

        if (center && !isNaN(center.latitude) && !isNaN(center.longitude)) {
          const newCenter = [center.latitude, center.longitude];
          setMapCenter(newCenter);
          if (mapRef.current) {
            mapRef.current.setView(newCenter, mapZoom);
          }
        } else {
          console.error('Invalid center coordinates:', center);
        }

        const managementZonesResponse = await axios.get(`http://localhost:8000/all/management-zones/${user_id}/${selectedFarm}/${irrigationSystem}`);
        setManagementZones(managementZonesResponse.data.zones);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load management zone data. Please try again later.');
      }
    },
    [user_id, selectedFarm, mapZoom]
  );

  useEffect(() => {
    if (initialIrrigationSystem) {
      setSelectedIrrigationSystem(initialIrrigationSystem);
      loadIrrigationSystemData(initialIrrigationSystem);
    }
  }, [initialIrrigationSystem, loadIrrigationSystemData]);

  const handleIrrigationSystemChange = (event) => {
    const selectedSystem = event.target.value;
    setSelectedIrrigationSystem(selectedSystem);
    loadIrrigationSystemData(selectedSystem);
    setManagementZones([]);
    setError('');
  };

  const handleFarmChange = (event) => {
    const selectedFarmName = event.target.value;
    const selectedFarmObj = farms.find((farm) => farm.farmname === selectedFarmName) || null;
    setSelectedFarm(selectedFarmObj);
    setSelectedIrrigationSystem('');
    setIrrigationSystems([]);
    setGeojsonData(null);
    setManagementZones([]);
    setMapCenter([39.539106, -119.806483]);
  };

  const handleDeleteIrrigationSystem = () => {
    if (!selectedIrrigationSystem) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIrrigationSystem}?`);
    if (confirmDelete) {
      axios
        .delete(`http://localhost:8000/irrigation-system/${user_id}/${selectedFarm}/${selectedIrrigationSystem}`)
        .then(() => {
          setIrrigationSystems((prevSystems) => prevSystems.filter((system) => system !== selectedIrrigationSystem));
          setSelectedIrrigationSystem('');
          setGeojsonData(null);
          setManagementZones([]);
        })
        .catch((error) => {
          console.error('Error deleting irrigation system:', error);
          setError('Failed to delete irrigation system. Please try again.');
        });
    }
  };

  // Updated getFeatureStyle to use zone.features for matching feature IDs
  const getFeatureStyle = (feature) => {
    const featureId = feature.id || (feature.properties && feature.properties.id);
    // Find the management zone that includes this feature
    const zone = managementZones.find((z) =>
      z.features && z.features.some((f) => f.feature_id === featureId)
    );
    return {
      fillColor: zone ? zone.color : 'blue',
      fillOpacity: 0.7,
      color: zone ? zone.color : 'blue',
      weight: 1,
      opacity: 0.5,
    };
  };

  // Calculate centroid of a group of features
  const calculateGroupCentroid = (features) => {
    let totalX = 0,
      totalY = 0,
      totalPoints = 0;
    features.forEach((feature) => {
      let coordinates;
      if (feature.geometry.type === 'Polygon') {
        coordinates = feature.geometry.coordinates[0];
      } else if (feature.geometry.type === 'MultiPolygon') {
        coordinates = feature.geometry.coordinates[0][0];
      }
      if (coordinates) {
        let x = 0,
          y = 0,
          n = coordinates.length;
        coordinates.forEach((coord) => {
          x += coord[0];
          y += coord[1];
        });
        totalX += x / n;
        totalY += y / n;
        totalPoints++;
      }
    });
    return totalPoints > 0 ? [totalY / totalPoints, totalX / totalPoints] : [0, 0];
  };

  const handleEditClick = () => {
    const currentPage = location.pathname;
    navigate('/addmz', {
      state: {
        user_id,
        farmname: selectedFarm,
        irrigation_system_name: selectedIrrigationSystem,
        fromPage: currentPage,
      },
    });
  };

  return (
    <Box>
      {/* Inputs container for farm and irrigation system selection */}
      <Box
        display="flex"
        flexDirection="row"
        mb={2}
        gap={2}
        mt={2}
        justifyContent="center"
        alignContent="center"
      >
        <TextField
          label="Select a farm"
          select
          value={selectedFarm}
          onChange={handleFarmChange}
          variant="outlined"
          sx={{ width: '250px' }}
        >
          {farms.map((farm) => (
            <MenuItem key={farm.farmname} value={farm.farmname}>
              {farm.farmname}
            </MenuItem>
          ))}
        </TextField>

        {/* Irrigation System Selection */}
        <TextField
          label="Select an irrigation system"
          select
          value={selectedIrrigationSystem}
          onChange={handleIrrigationSystemChange}
          variant="outlined"
          sx={{ width: '250px' }}
        >
          {irrigationSystems.map((system) => (
            <MenuItem key={system} value={system}>
              {system}
            </MenuItem>
          ))}
        </TextField>

        <Button onClick={handleEditClick} disabled={!selectedIrrigationSystem}>
          Edit
        </Button>
        <Button onClick={handleDeleteIrrigationSystem} disabled={!selectedIrrigationSystem}>
          Delete
        </Button>
      </Box>

      {/* Map and Weather Data container */}
      <Box display="flex" flexDirection="row" justifyContent="space-between" alignItems="flex-start" p={2}>
        {/* Map Section */}
        <Box flex={2} height="100%" pr={2}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
            ref={mapRef}
            maxZoom={22}
          >
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
            />
            {geojsonData && (
              <GeoJSON data={geojsonData} style={getFeatureStyle} key={JSON.stringify(geojsonData)} />
            )}
            {managementZones.map((zone, index) => {
              if (!geojsonData || !geojsonData.features) return null;
              // Extract feature IDs from the zone's features array
              const featureIds = zone.features.map((feature) => feature.feature_id);
              // Filter geojson features that match these IDs
              const zoneFeatures = geojsonData.features.filter((f) =>
                featureIds.includes(f.id || (f.properties && f.properties.id))
              );

              if (zoneFeatures.length === 0) {
                console.warn('No matching features for zone:', zone);
                return null;
              }

              const zoneCentroid = calculateGroupCentroid(zoneFeatures);
              if (!isNaN(zoneCentroid[0]) && !isNaN(zoneCentroid[1])) {
                return (
                  <Marker
                    key={`zone-${index}`}
                    position={zoneCentroid}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      // Management zone name is now displayed in black color.
                      html: `<div class="map-text" style="color: black;">${zone.mz_name}</div>`,
                    })}
                  />
                );
              } else {
                console.error('Invalid centroid:', zoneCentroid);
                return null;
              }
            })}
          </MapContainer>
        </Box>

        {/* Weather Section */}
        <Box width="34vw" height="50vh" p={2} bgcolor="#f9fafb" borderRadius={2} boxShadow="0 4px 12px rgba(0, 0, 0, 0.1)">
          <WeatherApp center={mapCenter} />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
