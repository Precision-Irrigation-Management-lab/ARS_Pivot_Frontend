// src/MapComponent.js
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [geojsonData, setGeojsonData] = useState(null);
  const [center, setCenter] = useState([0, 0]);  // Default center
  const [error, setError] = useState(null);

  useEffect(() => {
    const sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-139.8045199125961, 14.541153496348372],
                [-129.8045199125961, 14.541153496348372],
                [-129.8045199125961, 16.54115349634837],
                [-139.8045199125961, 16.54115349634837],
                [-139.8045199125961, 14.541153496348372]
              ]
            ]
          },
          properties: {
            farmname: 'AXE',
            irrigation_system_name: 'dog'
          }
        }
        // More features...
      ]
    };
  
    setGeojsonData(sampleGeoJSON);
    setCenter([15.541153496348372, -134.8045199125961]);
  }, []);
  

  if (error) {
    return <div>Error loading map data: {error.message}</div>;
  }

  return (
    <MapContainer center={center} zoom={17} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {geojsonData && <GeoJSON data={geojsonData} />}
    </MapContainer>
  );
};

export default MapComponent;
