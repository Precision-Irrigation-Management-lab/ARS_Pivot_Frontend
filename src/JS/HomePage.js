import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/HomePage.css'; // Ensure to create appropriate CSS styles

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
        .sort((a, b) => a.mz_name.localeCompare(b.mz_name)) // Sort management zones by name
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
  const location = useLocation();
  const { user_id, farmname, irrigation_system_name } = location.state || {};

  const mapRef = useRef();
  const [geojsonData, setGeojsonData] = useState(null);
  const [managementZones, setManagementZones] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]); // Default center
  const [mapZoom, setMapZoom] = useState(17); // Default zoom

  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/geojson/${user_id}/${farmname}/${irrigation_system_name}`);
        const { geojson, center } = response.data;

        if (!geojson.features) {
          throw new Error('Invalid GeoJSON data: features property is missing');
        }

        const features = geojson.features.map((feature, index) => ({
          ...feature,
          id: feature.id || feature.properties.id || index,
        }));

        setGeojsonData({ type: 'FeatureCollection', features });

        // Use the center from the GET request to set the map center
        const mapCenter = center || [39.539106, -119.806483]; // Fallback to default if no center is provided
        setMapCenter(mapCenter);
        mapRef.current && mapRef.current.setView(mapCenter, mapZoom); // Update the map view
      } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
      }
    };

    const fetchManagementZones = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/all/management-zones/${user_id}/${farmname}/${irrigation_system_name}`);
        setManagementZones(response.data.zones);
      } catch (error) {
        console.error('Error fetching management zones:', error);
      }
    };

    fetchGeoJson();
    fetchManagementZones();
  }, [user_id, farmname, irrigation_system_name, mapZoom]);

  const isEdgeFeature = (feature, allFeatures, zoneName) => {
    const bounds = L.geoJSON(feature).getBounds();
    const edgeSides = {
      left: true,
      right: true,
      top: true,
      bottom: true,
    };

    allFeatures.forEach(neighbor => {
      if (neighbor.id === feature.id) return;

      const neighborBounds = L.geoJSON(neighbor).getBounds();
      const neighborZone = managementZones.find(zone => zone.feature_ids.includes(neighbor.id));

      if (!neighborZone) return;

      const neighborZoneName = neighborZone.mz_name;

      if (bounds.getSouthWest().lng === neighborBounds.getNorthEast().lng && neighborZoneName === zoneName) {
        edgeSides.left = false;
      }
      if (bounds.getNorthEast().lng === neighborBounds.getSouthWest().lng && neighborZoneName === zoneName) {
        edgeSides.right = false;
      }
      if (bounds.getSouthWest().lat === neighborBounds.getNorthEast().lat && neighborZoneName === zoneName) {
        edgeSides.top = false;
      }
      if (bounds.getNorthEast().lat === neighborBounds.getSouthWest().lat && neighborZoneName === zoneName) {
        edgeSides.bottom = false;
      }
    });

    return edgeSides;
  };

  const getFeatureStyle = useCallback((feature) => {
    const featureId = feature.id || feature.properties.id;
    const zone = managementZones.find((z) => z.feature_ids && z.feature_ids.includes(featureId));

    if (zone) {
      const edgeSides = isEdgeFeature(feature, geojsonData.features, zone.mz_name);

      const style = {
        fillColor: zone.color,
        fillOpacity: 0.7,
        color: zone.color,
        weight: 1,
        opacity: 0.5,
      };

      if (edgeSides.left) style.borderLeft = '3px solid black';
      if (edgeSides.right) style.borderRight = '3px solid black';
      if (edgeSides.top) style.borderTop = '3px solid black';
      if (edgeSides.bottom) style.borderBottom = '3px solid black';

      return style;
    }

    return { color: 'blue', fillOpacity: 0.2, weight: 1 };
  }, [managementZones, geojsonData]);

  const calculateCentroid = (features) => {
    const centroid = [0, 0];
    features.forEach((feature) => {
      const latLng = L.geoJSON(feature).getBounds().getCenter();
      centroid[0] += latLng.lat;
      centroid[1] += latLng.lng;
    });
    centroid[0] /= features.length;
    centroid[1] /= features.length;
    return centroid;
  };

  const addTextToMap = useCallback((map, text, position) => {
    const divIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="map-text">${text}</div>`,
    });
    L.marker(position, { icon: divIcon }).addTo(map);
  }, []);

  useEffect(() => {
    if (mapRef.current && geojsonData) {
      const map = mapRef.current;

      // Clear existing markers
      map.eachLayer((layer) => {
        if (layer.options.icon && layer.options.icon.options.className === 'custom-div-icon') {
          map.removeLayer(layer);
        }
      });

      // Display farm name
      const farmName = geojsonData.features[0].properties.farmname || 'Unknown';
      const farmCenter = L.geoJSON(geojsonData).getBounds().getCenter();
      addTextToMap(map, `${farmName}`, farmCenter);

      // Display management zone names
      managementZones.forEach(zone => {
        const zoneFeatures = geojsonData.features.filter(f => zone.feature_ids.includes(f.id || f.properties.id));
        const zoneCentroid = calculateCentroid(zoneFeatures);
        addTextToMap(map, zone.mz_name, zoneCentroid);
      });

      map.on('zoomend', () => {
        const zoomLevel = map.getZoom();
        const fontSize = Math.max(10, zoomLevel); // Adjust font size based on zoom level
        map.eachLayer((layer) => {
          if (layer.options.icon && layer.options.icon.options.className === 'custom-div-icon') {
            const div = layer.getElement();
            if (div) {
              div.style.fontSize = `${fontSize}px`;
            }
          }
        });
      });
    }
  }, [geojsonData, managementZones, addTextToMap]);

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom} // Use the same zoom level
        className="leaflet-container"
        ref={mapRef}
        maxZoom={22} // Set a high maxZoom value to allow more zoom levels
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
        />
        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={getFeatureStyle}
          />
        )}
        <LegendControl managementZones={managementZones} />
      </MapContainer>
    </div>
  );
};

export default HomePage;
