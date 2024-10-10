import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/HomePage.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LegendControl = ({ managementZones }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'topright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.background = 'white';
      div.style.padding = '10px';
      div.style.margin = '10px';
      div.style.borderRadius = '5px';
      div.innerHTML += '<h4>Management Zones</h4>';
      managementZones
        .sort((a, b) => a.mz_name.localeCompare(b.mz_name))
        .forEach(zone => {
          div.innerHTML += `
            <div class="legend-item">
              <i style="background:${zone.color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i>
              <span>${zone.mz_name}</span>
            </div>`;
        });
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [managementZones, map]);

  return null;
};

const HomePage = () => {
  const mapRef = useRef();
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate
  const [geojsonData, setGeojsonData] = useState(null);
  const [managementZones, setManagementZones] = useState([]);
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [irrigationSystems, setIrrigationSystems] = useState([]);
  const [selectedIrrigationSystem, setSelectedIrrigationSystem] = useState('');
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]);
  const [mapZoom] = useState(17);
  const [error, setError] = useState(null);

  // Parse the user ID from the session storage
  const user = JSON.parse(sessionStorage.getItem('user'));
  const user_id = user?.user_id || location.state?.user_id;

  // Check if the component was accessed with state variables from navigation
  const initialFarm = location.state?.farmname || '';
  const initialIrrigationSystem = location.state?.irrigation_system_name || '';

  useEffect(() => {
    if (!user_id) {
      setError('User ID is not available. Please log in again.');
      return;
    }
  
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
        } else {
          // If initialFarm is provided, use it; otherwise, auto-select the first farm
          const selectedFarmToUse = initialFarm || fetchedFarms[0];
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
  
    // Fetch irrigation systems for the selected farm
    const fetchIrrigationSystems = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/irrigation-systems/${user_id}/${selectedFarm}/`);
        const fetchedIrrigationSystems = response.data.irrigation_system_names || [];
        setIrrigationSystems(fetchedIrrigationSystems);
  
        if (fetchedIrrigationSystems.length === 0) {
          setError('No irrigation systems available for the selected farm.');
        } else {
          // If initialIrrigationSystem is provided, use it; otherwise, auto-select the first irrigation system
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
  
  

  const loadIrrigationSystemData = useCallback(async (irrigationSystem) => {
    if (!irrigationSystem || !user_id || !selectedFarm) return;

    try {
      // Fetch the GeoJSON data
      const geoJsonResponse = await axios.get(`http://localhost:8000/geojson/${user_id}/${selectedFarm}/${irrigationSystem}`);
      const { geojson, center } = geoJsonResponse.data;

      if (!geojson.features) {
        throw new Error('Invalid GeoJSON data: features property is missing');
      }

      const features = geojson.features.map((feature, index) => ({
        ...feature,
        id: feature.id || feature.properties.id || index,
      }));

      setGeojsonData({ type: 'FeatureCollection', features });

      // Set the map center based on the response
      if (center && center.latitude !== undefined && center.longitude !== undefined) {
        const newCenter = [center.latitude, center.longitude];
        setMapCenter(newCenter);
        mapRef.current && mapRef.current.setView(newCenter, mapZoom); // Update the map view
      }

      // Fetch management zones after GeoJSON is loaded
      const managementZonesResponse = await axios.get(`http://localhost:8000/all/management-zones/${user_id}/${selectedFarm}/${irrigationSystem}`);
      setManagementZones(managementZonesResponse.data.zones);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load management zone  data. Please try again later.');
    }
  }, [user_id, selectedFarm, mapZoom]);

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
    setSelectedFarm(event.target.value);
    setSelectedIrrigationSystem(''); // Reset irrigation system when changing farm
    setIrrigationSystems([]); // Clear irrigation systems
    setGeojsonData(null); // Clear GeoJSON data
    setManagementZones([]); // Clear management zones
    setMapCenter([39.539106, -119.806483]); // Reset map center to default
  };

  const getFeatureStyle = (feature) => {
    const featureId = feature.id || feature.properties.id;
    const zone = managementZones.find((z) => z.feature_ids && z.feature_ids.includes(featureId));
    return {
      fillColor: zone ? zone.color : 'blue',
      fillOpacity: 0.7,
      color: zone ? zone.color : 'blue',
      weight: 1,
      opacity: 0.5,
    };
  };

  // Calculate the centroid of multiple polygons by averaging their centroids
  const calculateGroupCentroid = (features) => {
    let totalX = 0, totalY = 0, totalPoints = 0;
    features.forEach(feature => {
      const coordinates = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0][0];
      let x = 0, y = 0, n = coordinates.length;
      coordinates.forEach(coord => {
        x += coord[0];
        y += coord[1];
      });
      totalX += x / n;
      totalY += y / n;
      totalPoints++;
    });
    return [totalY / totalPoints, totalX / totalPoints];
  };

  const handleEditClick = () => {
    const currentPage = location.pathname;
    navigate('/addmz', {
      state: {
        user_id,
        farmname: selectedFarm,
        irrigation_system_name: selectedIrrigationSystem,
        fromPage: currentPage,
      }
    });
  };

  return (
    <div className="map-container">
      <div className="farm-selection">
        <select onChange={handleFarmChange} value={selectedFarm}>
          <option value="" disabled>Select a farm</option>
          {farms.map((farm) => (
            <option key={farm} value={farm}>
              {farm}
            </option>
          ))}
        </select>
        {error && <p className="error-message">{error}</p>}
      </div>

      {irrigationSystems.length > 0 && (
        <div className="irrigation-system-selection">
          <select onChange={handleIrrigationSystemChange} value={selectedIrrigationSystem}>
            <option value="" disabled>Select an irrigation system</option>
            {irrigationSystems.map((system) => (
              <option key={system} value={system}>
                {system}
              </option>
            ))}
          </select>
        </div>
      )}

      <button onClick={handleEditClick} disabled={!selectedIrrigationSystem}>
        Edit
      </button>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="leaflet-container"
        ref={mapRef}
        maxZoom={22}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
        />
        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={getFeatureStyle}
            key={JSON.stringify(geojsonData)} // Use key to force rerender when data changes
          />
        )}
        {managementZones.map((zone, index) => {
          const zoneFeatures = geojsonData.features.filter(f => zone.feature_ids.includes(f.id));
          const zoneCentroid = calculateGroupCentroid(zoneFeatures);
          return (
            <Marker
              key={`zone-${index}`}
              position={zoneCentroid}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="map-text">${zone.mz_name}</div>`,
              })}
            />
          );
        })}
        <LegendControl managementZones={managementZones} />
      </MapContainer>
    </div>
  );
};

export default HomePage;
