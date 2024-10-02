import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, FeatureGroup, Marker, Popup, Circle, useMapEvents, Polyline, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/AddCenterPivot.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const AddCenterPivot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { farm } = location.state || {};

  const user = JSON.parse(sessionStorage.getItem('user'));
  const user_id = user ? user.user_id : null;
  const farmName = farm;

  const mapRef = useRef();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [drawnLayers, setDrawnLayers] = useState([]);
  const [radius, setRadius] = useState('');
  const [numberOfSprinklerZones, setNumberOfSprinklerZones] = useState(1);
  const [sprinklerZones, setSprinklerZones] = useState([{ initialRadius: '', finalRadius: '' }]);
  const [spaceBetweenNozzles, setSpaceBetweenNozzles] = useState('');
  const [maximumSpeed, setMaximumSpeed] = useState('');
  const [waterApplicationAtMaxSpeed, setWaterApplicationAtMaxSpeed] = useState('');
  const [centerPoint, setCenterPoint] = useState({ lat: '', lng: '' });
  const [pivotName, setPivotName] = useState('');
  const [startAngle, setStartAngle] = useState('');
  const [endAngle, setEndAngle] = useState('');
  const [startMarkerPosition, setStartMarkerPosition] = useState(null);
  const [endMarkerPosition, setEndMarkerPosition] = useState(null);
  const [angleSelectionMode, setAngleSelectionMode] = useState(null);
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [showEndPopup, setShowEndPopup] = useState(false);
  const [inputError, setInputError] = useState('');
  const debouncedSearchText = useDebounce(searchText, 500);
  const [shapeDrawn, setShapeDrawn] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchText.length > 2) {
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${debouncedSearchText}`;
        try {
          const response = await axios.get(endpoint);
          setSearchResults(response.data);
        } catch (error) {
          console.error('Error fetching search results:', error);
        }
      } else {
        setSearchResults([]);
      }
    };

    fetchSuggestions();
  }, [debouncedSearchText]);

  const handleCreated = useCallback((e) => {
    const { layerType, layer } = e;
    const geojson = layer.toGeoJSON();

    if (layerType === 'circle') {
      const circleRadius = layer.getRadius();
      geojson.properties.radius = circleRadius;
      setRadius(circleRadius);
    }

    let center;
    if (layerType === 'circle') {
      center = layer.getLatLng();
    } else {
      center = layer.getBounds().getCenter();
    }
    setCenterPoint({ lat: center.lat, lng: center.lng });

    setDrawnLayers((prevLayers) => [...prevLayers, geojson]);
    setAngleSelectionMode('start');
    setShowStartPopup(true);
    console.log('Layer created:', geojson);

    setShapeDrawn(true);
  }, []);

  const handleDeleted = useCallback(() => {
    setDrawnLayers([]);
    setRadius('');
    setCenterPoint({ lat: '', lng: '' });
    setStartMarkerPosition(null);
    setEndMarkerPosition(null);
    setStartAngle('');
    setEndAngle('');
    setAngleSelectionMode(null);
    setShowStartPopup(false);
    setShowEndPopup(false);
    setShapeDrawn(false);
    setKey((prevKey) => prevKey + 1);
    console.log('All layers deleted');
  }, []);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleResultClick = (result) => {
    const position = [result.lat, result.lon];
    setSelectedPosition(position);
    mapRef.current.setView(position, 13);
    setSearchResults([]);
  };

  const handleRadiusChange = (e) => {
    const newRadius = parseFloat(e.target.value);
    if (isNaN(newRadius) || newRadius <= 0) {
      setInputError('Please enter a valid radius');
      return;
    }
    setRadius(newRadius);
    setInputError('');

    setStartMarkerPosition(null);
    setEndMarkerPosition(null);
    setStartAngle('');
    setEndAngle('');
    setAngleSelectionMode('start');
    setShowStartPopup(true);
    setShowEndPopup(false);

    // Update the final radius of the last sprinkler zone
    setSprinklerZones((zones) => {
      const updatedZones = zones.map((zone, index) => {
        if (index === zones.length - 1) {
          return { ...zone, finalRadius: newRadius.toString() };
        }
        return zone;
      });
      return updatedZones;
    });

    console.log('Radius changed:', newRadius);
  };

  const handleSprinklerZoneChange = (index, field, value) => {
    const newSprinklerZones = [...sprinklerZones];
    newSprinklerZones[index][field] = value;

    if (field === 'finalRadius' && index < newSprinklerZones.length - 1) {
      // Update the initial radius of the next zone when the final radius is changed
      newSprinklerZones[index + 1].initialRadius = value;
    } else if (field === 'finalRadius' && index === newSprinklerZones.length - 1) {
      // Ensure the final radius of the last zone cannot exceed the circle's radius
      const finalRadiusValue = parseFloat(value);
      if (finalRadiusValue > radius) {
        setInputError('Final radius cannot exceed the radius of the circle');
        return;
      }
    }

    setSprinklerZones(newSprinklerZones);
    setInputError('');
    console.log('Updated Sprinkler Zones:', newSprinklerZones);
  };

  const handleNumberOfSprinklerZonesChange = (e) => {
    const newNumber = parseInt(e.target.value, 10);
    if (isNaN(newNumber) || newNumber <= 0) {
      setInputError('Please enter a valid number of sprinkler zones');
      return;
    }

    const newSprinklerZones = Array.from({ length: newNumber }, (_, index) => ({
      initialRadius: '',
      finalRadius: '',
    }));

    // Copy over existing values and update initial and final radii accordingly
    for (let i = 0; i < newNumber; i++) {
      if (i < sprinklerZones.length) {
        newSprinklerZones[i].initialRadius = sprinklerZones[i].initialRadius;
        newSprinklerZones[i].finalRadius = sprinklerZones[i].finalRadius;
      } else if (i > 0) {
        newSprinklerZones[i].initialRadius = newSprinklerZones[i - 1].finalRadius;
      }
    }

    // Ensure the final radius of the last zone matches the circle's radius
    if (newNumber > 0) {
      newSprinklerZones[newNumber - 1].finalRadius = radius.toString();
    }

    setNumberOfSprinklerZones(newNumber);
    setSprinklerZones(newSprinklerZones);
    setInputError('');

    console.log('Updated Number of Sprinkler Zones:', newSprinklerZones);
  };

  const handleSpaceBetweenNozzlesChange = (e) => {
    if (isNaN(parseFloat(e.target.value)) || parseFloat(e.target.value) <= 0) {
      setInputError('Please enter a valid space between nozzles');
      return;
    }
    setSpaceBetweenNozzles(e.target.value);
    setInputError('');
  };

  const handleMaximumSpeedChange = (e) => {
    if (isNaN(parseFloat(e.target.value)) || parseFloat(e.target.value) <= 0) {
      setInputError('Please enter a valid maximum speed');
      return;
    }
    setMaximumSpeed(e.target.value);
    setInputError('');
  };

  const handleWaterApplicationAtMaxSpeedChange = (e) => {
    if (isNaN(parseFloat(e.target.value)) || parseFloat(e.target.value) <= 0) {
      setInputError('Please enter a valid water application at maximum speed');
      return;
    }
    setWaterApplicationAtMaxSpeed(e.target.value);
    setInputError('');
  };

  const handleCenterPointChange = (e) => {
    const { name, value } = e.target;
    if (isNaN(parseFloat(value))) {
      setInputError('Please enter a valid latitude and longitude');
      return;
    }
    setCenterPoint((prev) => ({ ...prev, [name]: value }));
    setInputError('');
  };

  const handlePivotNameChange = (e) => {
    if (!e.target.value) {
      setInputError('Please enter a valid pivot name');
      return;
    }
    setPivotName(e.target.value);
    setInputError('');
  };

  const calculatePointFromAngle = useCallback((angle, radius) => {
    const radian = (angle * Math.PI) / 180;
    const lat = centerPoint.lat + (radius * Math.cos(radian)) / 111320;
    const lng = centerPoint.lng + (radius * Math.sin(radian)) / (111320 * Math.cos((centerPoint.lat * Math.PI) / 180));
    return { lat, lng };
  }, [centerPoint.lat, centerPoint.lng]);

  const handleStartAngleChange = (e) => {
    const newAngle = parseFloat(e.target.value);
    if (isNaN(newAngle)) {
      setInputError('Please enter a valid start angle');
      return;
    }
    setStartAngle(newAngle);
    const newPosition = calculatePointFromAngle(newAngle, radius);
    setStartMarkerPosition(newPosition);
    setShowStartPopup(false); // Hide the start angle popup if the input is valid
    setInputError('');
  };

  const handleEndAngleChange = (e) => {
    const newAngle = parseFloat(e.target.value);
    if (isNaN(newAngle)) {
      setInputError('Please enter a valid end angle');
      return;
    }
    setEndAngle(newAngle);
    const newPosition = calculatePointFromAngle(newAngle, radius);
    setEndMarkerPosition(newPosition);
    setShowEndPopup(false); // Hide the end angle popup if the input is valid
    setInputError('');
  };

  const calculateAngleFromNorth = (point) => {
    const dx = point.lng - centerPoint.lng;
    const dy = point.lat - centerPoint.lat;
    const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
    return (angle + 360) % 360;
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        console.log('Map clicked at', e.latlng);
        if (angleSelectionMode === 'start') {
          const startPosition = { lat: e.latlng.lat, lng: e.latlng.lng };
          setStartMarkerPosition(startPosition);
          const angle = calculateAngleFromNorth(startPosition);
          setStartAngle(angle);
          console.log('Start angle selected:', angle);
          setAngleSelectionMode('end');
          setShowStartPopup(false);
          setShowEndPopup(true);
        } else if (angleSelectionMode === 'end') {
          const endPosition = { lat: e.latlng.lat, lng: e.latlng.lng };
          setEndMarkerPosition(endPosition);
          const angle = calculateAngleFromNorth(endPosition);
          setEndAngle(angle);
          console.log('End angle selected:', angle);
          setAngleSelectionMode(null);
          setShowEndPopup(false);
        }
      },
    });
    return null;
  };

  const generateSectorPoints = (startAngle, endAngle, radius) => {
    const points = [];
    if (startAngle === endAngle) {
      points.push(calculatePointFromAngle(startAngle, radius));
      points.push(calculatePointFromAngle(endAngle + 0.1, radius)); // Small offset to create a visible line
    } else {
      for (let angle = startAngle; angle <= endAngle; angle += 1) {
        points.push(calculatePointFromAngle(angle, radius));
      }
    }
    points.push(centerPoint);
    return points;
  };

  const validateInputs = () => {
    if (!user_id) {
      setInputError('User not logged in or user ID not available');
      return false;
    }

    if (drawnLayers.length === 0) {
      setInputError('Please draw a shape on the map before submitting.');
      return false;
    }

    if ((!startAngle && startAngle !== 0) || (!endAngle && endAngle !== 0)) {
      setInputError('Start and end angles are not set. Please make sure to set the start and end angles.');
      return false;
    }

    const radiusValue = parseFloat(radius);
    if (isNaN(radiusValue) || radiusValue <= 0) {
      setInputError('Please enter a valid radius');
      return false;
    }

    for (let i = 0; i < sprinklerZones.length; i++) {
      const initialRadius = parseFloat(sprinklerZones[i].initialRadius);
      const finalRadius = parseFloat(sprinklerZones[i].finalRadius);
      if (isNaN(initialRadius) || isNaN(finalRadius) || initialRadius <= 0 || finalRadius <= 0) {
        setInputError(`Please enter valid radii for sprinkler zone ${i + 1}`);
        return false;
      }
      if (i === sprinklerZones.length - 1 && finalRadius > radius) {
        setInputError(`Final radius of the last sprinkler zone cannot exceed the radius of the circle`);
        return false;
      }
    }

    const spaceBetweenNozzlesValue = parseFloat(spaceBetweenNozzles);
    const maximumSpeedValue = parseFloat(maximumSpeed);
    const waterApplicationAtMaxSpeedValue = parseFloat(waterApplicationAtMaxSpeed);

    if (isNaN(spaceBetweenNozzlesValue) || spaceBetweenNozzlesValue <= 0) {
      setInputError('Please enter a valid space between nozzles');
      return false;
    }

    if (isNaN(maximumSpeedValue) || maximumSpeedValue <= 0) {
      setInputError('Please enter a valid maximum speed');
      return false;
    }

    if (isNaN(waterApplicationAtMaxSpeedValue) || waterApplicationAtMaxSpeedValue <= 0) {
      setInputError('Please enter a valid water application at maximum speed');
      return false;
    }

    setInputError('');
    return true;
  };

  const handleSubmit = async () => {
    console.log('Submit clicked');

    if (!validateInputs()) {
      return;
    }

    const radiusValue = parseFloat(radius);

    const sprinklerZonesData = sprinklerZones.reduce((acc, zone, index) => {
      acc[index + 1] = [
        parseFloat(zone.initialRadius),
        parseFloat(zone.finalRadius)
      ];
      return acc;
    }, {});

    const geoJsonRequest = {
      user_id: user_id,
      farmname: farmName,
      center: {
        latitude: parseFloat(centerPoint.lat),
        longitude: parseFloat(centerPoint.lng),
      },
      radius: radiusValue,
      sprinklerzones: sprinklerZonesData,
      space_between_nozzles: parseFloat(spaceBetweenNozzles),
      maximum_speed: parseFloat(maximumSpeed),
      water_application_at_max_speed: parseFloat(waterApplicationAtMaxSpeed),
      irrigation_system_name: pivotName,
      start_angle: startAngle,
      end_angle: endAngle,
    };

    console.log('Request Body:', geoJsonRequest);

    const endpoint = 'http://127.0.0.1:8000/generate-geojson';
    try {
      const response = await axios.post(endpoint, geoJsonRequest);
      console.log('API Response:', response.data);

      navigate('/addmz', { state: { farmname: farmName, irrigation_system_name: pivotName } });
    } catch (error) {
      console.error('Error submitting GeoJSON:', error);
    }
  };

  useEffect(() => {
    if (startAngle !== '' && radius) {
      const newPosition = calculatePointFromAngle(startAngle, radius);
      setStartMarkerPosition(newPosition);
    }
  }, [startAngle, radius, calculatePointFromAngle]);

  useEffect(() => {
    if (endAngle !== '' && radius) {
      const newPosition = calculatePointFromAngle(endAngle, radius);
      setEndMarkerPosition(newPosition);
    }
  }, [endAngle, radius, calculatePointFromAngle]);

  return (
    <div className="Add-centerpivot-map-container">
      <form className="search-container" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          placeholder="Search location"
          value={searchText}
          onChange={handleSearchChange}
        />
        <div className="search-results">
          {searchResults.map((result, index) => (
            <div key={index} onClick={() => handleResultClick(result)}>
              {result.display_name}
            </div>
          ))}
        </div>
      </form>
      <MapContainer center={[39.539106, -119.806483]} zoom={13} className="leaflet-container" ref={mapRef}>
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
        />
        <FeatureGroup key={key}>
          {!shapeDrawn && (
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: true,
                polygon: true,
                polyline: false,
                marker: false,
                circlemarker: false,
              }}
              edit={{
                remove: true,
                edit: false,
              }}
            />
          )}
          {shapeDrawn && (
            <EditControl
              position="topright"
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: false,
                polygon: false,
                polyline: false,
                marker: false,
                circlemarker: false,
              }}
              edit={{
                remove: true,
                edit: false,
              }}
            />
          )}
        </FeatureGroup>
        {selectedPosition && <Marker position={selectedPosition} />}
        {centerPoint.lat && centerPoint.lng && radius && (
          <Circle center={centerPoint} radius={radius} />
        )}
        {startMarkerPosition && (
          <Marker position={startMarkerPosition} icon={L.divIcon({ className: 'custom-marker green-marker' })}>
            <Popup>Start Angle: {startAngle.toFixed(2)}°</Popup>
          </Marker>
        )}
        {endMarkerPosition && (
          <Marker position={endMarkerPosition} icon={L.divIcon({ className: 'custom-marker red-marker' })}>
            <Popup>End Angle: {endAngle.toFixed(2)}°</Popup>
          </Marker>
        )}
        {startAngle !== '' && radius && (
          <Polyline
            positions={[centerPoint, calculatePointFromAngle(startAngle, radius)]}
            color="green"
          />
        )}
        {endAngle !== '' && radius && (
          <Polyline
            positions={[centerPoint, calculatePointFromAngle(endAngle, radius)]}
            color="red"
          />
        )}
        {startAngle !== '' && endAngle !== '' && radius && (
          <Polygon
            positions={generateSectorPoints(startAngle, endAngle, radius)}
            color="blue"
            fillOpacity={0.3}
          />
        )}
        {showStartPopup && (
          <Popup position={centerPoint}>
            <div>
              <p>Click on the circumference to select the start angle.</p>
            </div>
          </Popup>
        )}
        {showEndPopup && (
          <Popup position={centerPoint}>
            <div>
              <p>Click on the circumference to select the end angle.</p>
            </div>
          </Popup>
        )}
        <MapClickHandler />
      </MapContainer>
      <div className="input-fields">
        <div className="input-field">
          <label>
            Farm Name:
            <input
              type="text"
              value={farm}
              readOnly
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Pivot Name:
            <input
              type="text"
              value={pivotName}
              onChange={handlePivotNameChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Radius (meters):
            <input
              type="text"
              value={radius}
              onChange={handleRadiusChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Center Latitude:
            <input
              type="text"
              name="lat"
              value={centerPoint.lat}
              onChange={handleCenterPointChange}
            />
          </label>
          <label>
            Center Longitude:
            <input
              type="text"
              name="lng"
              value={centerPoint.lng}
              onChange={handleCenterPointChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Start Angle (degrees):
            <input
              type="number"
              value={startAngle}
              onChange={handleStartAngleChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            End Angle (degrees):
            <input
              type="number"
              value={endAngle}
              onChange={handleEndAngleChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Maximum Speed (meters/second):
            <input
              type="text"
              value={maximumSpeed}
              onChange={handleMaximumSpeedChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Water Application at Maximum Speed (liters/second):
            <input
              type="text"
              value={waterApplicationAtMaxSpeed}
              onChange={handleWaterApplicationAtMaxSpeedChange}
            />
          </label>
        </div>
        <div className="input-field">
          <label>
            Number of Sprinkler Zones:
            <input
              type="number"
              value={numberOfSprinklerZones}
              onChange={handleNumberOfSprinklerZonesChange}
              min="1"
            />
          </label>
        </div>
        {sprinklerZones.map((zone, index) => (
          <div key={index} className="sprinkler-zone">
            {index === 0 && (
              <label>
                Initial Radius of Sprinkler Zone 1 (meters):
                <input
                  type="text"
                  value={zone.initialRadius}
                  onChange={(e) => handleSprinklerZoneChange(index, 'initialRadius', e.target.value)}
                />
              </label>
            )}
            <label>
              Final Radius of Sprinkler Zone {index + 1} (meters):
              <input
                type="text"
                value={index === sprinklerZones.length - 1 ? radius : zone.finalRadius}
                onChange={(e) => handleSprinklerZoneChange(index, 'finalRadius', e.target.value)}
                readOnly={index === sprinklerZones.length - 1}
              />
            </label>
          </div>
        ))}
        <div className="input-field">
          <label>
            Space Between Nozzles (meters):
            <input
              type="text"
              value={spaceBetweenNozzles}
              onChange={handleSpaceBetweenNozzlesChange}
            />
          </label>
        </div>
        {inputError && <div className="error-message">{inputError}</div>}
      </div>
      <button className="submit-button" onClick={handleSubmit}>
        Submit
      </button>
    </div>
  );
};

export default AddCenterPivot;
