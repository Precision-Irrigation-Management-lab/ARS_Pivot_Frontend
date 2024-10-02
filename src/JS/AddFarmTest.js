import React, { useRef, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import '../CSS/AddFarmTest.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AddFarmTest = () => {
  const mapRef = useRef();
  const [radius, setRadius] = useState(0);
  const [currentLayer, setCurrentLayer] = useState(null);

  const handleCreated = (e) => {
    const { layer } = e;
    const geojson = layer.toGeoJSON();

    // Check if the drawn layer is a circle and get the radius
    if (layer instanceof L.Circle) {
      const radius = layer.getRadius();
      geojson.properties.radius = radius; // Add radius to GeoJSON properties
      setRadius(radius);
      setCurrentLayer(layer);
    }
  };

  const handleRadiusChange = (e) => {
    const newRadius = parseFloat(e.target.value);
    setRadius(newRadius);

    if (currentLayer && currentLayer instanceof L.Circle) {
      currentLayer.setRadius(newRadius);
    }
  };

  const handleSubmit = async () => {
    if (currentLayer && currentLayer instanceof L.Circle) {
      const geojson = currentLayer.toGeoJSON();
      geojson.properties.radius = radius;

      try {
        const response = await fetch('http://localhost:8000/generate-geojson', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geojson),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log('Posted GeoJSON data:', data);
      } catch (error) {
        console.error('Failed to post GeoJSON data:', error);
      }
    }
  };

  return (
    <div className="map-container">
      <div className="radius-input">
        <label>
          Radius (meters):
          <input
            type="number"
            value={radius}
            onChange={handleRadiusChange}
          />
        </label>
      </div>
      <button onClick={handleSubmit}>Submit</button>
      <MapContainer center={[39.539106, -119.806483]} zoom={13} className="leaflet-container" ref={mapRef}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            draw={{
              rectangle: true,
              circle: true,
              polygon: true,
              polyline: false,
              marker: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

export default AddFarmTest;
