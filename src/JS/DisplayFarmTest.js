import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/AddMZ.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LegendControl = ({ groups }) => {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'topright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.background = 'white';
      div.style.padding = '10px';
      div.style.margin = '10px';
      div.style.borderRadius = '5px';
      div.innerHTML += '<h4>Groups</h4>';
      groups.forEach(group => {
        div.innerHTML += `<i style="background:${group.color}; width: 18px; height: 18px; display: inline-block; margin-right: 8px;"></i> ${group.name}<br>`;
      });
      return div;
    };

    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [groups, map]);

  return null;
};

const DisplayFarmTest = () => {
  const mapRef = useRef();
  const [geojsonData, setGeojsonData] = useState(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#ff0000'); // Default color
  const [groups, setGroups] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]); // Default center

  const id = 1; // Define the constant ID here

  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/geojson/${id}`);
        const geojson = response.data;
        const features = geojson.features.map((feature, index) => ({
          ...feature,
          id: feature.id || feature.properties.id || index,
        }));
        setGeojsonData({ type: 'FeatureCollection', features });
        const bounds = L.geoJSON({ type: 'FeatureCollection', features }).getBounds();
        const center = bounds.getCenter();
        setMapCenter([center.lat, center.lng]);
      } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
      }
    };

    fetchGeoJson();
  }, [id]);

  const handleFeatureClick = (e) => {
    const layer = e.target;
    const feature = layer.feature;
    const featureId = feature.id || feature.properties.id;
    if (feature) {
      toggleFeatureSelection(layer, featureId);
    }
  };

  const toggleFeatureSelection = (layer, featureId) => {
    const isSelected = selectedFeatureIds.includes(featureId);
    if (isSelected) {
      layer.setStyle({ fillOpacity: 0.2 });
      setSelectedFeatureIds((prevIds) => prevIds.filter((id) => id !== featureId));
    } else {
      layer.setStyle({ fillOpacity: 0.7 });
      setSelectedFeatureIds((prevIds) => [...prevIds, featureId]);
    }
  };

  const getFeatureStyle = (feature) => {
    const featureId = feature.id || feature.properties.id;
    const group = groups.find((g) => g.featureIds.includes(featureId));
    if (group) {
      return { color: group.color, fillColor: group.color, fillOpacity: 0.7 };
    }
    if (selectedFeatureIds.includes(featureId)) {
      return { fillOpacity: 0.7 };
    }
    return { color: 'blue', fillOpacity: 0.2 };
  };

  const handleAddGroup = () => {
    if (groupName && selectedFeatureIds.length > 0) {
      const newGroup = { name: groupName, featureIds: selectedFeatureIds, color: groupColor };
      setGroups((prevGroups) => [...prevGroups, newGroup]);
      setGroupName('');
      setGroupColor('#ff0000');
      setSelectedFeatureIds([]);
      updateGeoJsonWithGroups(newGroup);
    }
  };

  const updateGeoJsonWithGroups = (newGroup) => {
    setGeojsonData((prevData) => {
      const updatedFeatures = prevData.features.map((feature) => {
        const featureId = feature.id || feature.properties.id;
        const isSelected = newGroup.featureIds.includes(featureId);
        if (isSelected) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              group: newGroup.name,
            },
          };
        }
        return feature;
      });
      return { ...prevData, features: updatedFeatures };
    });
  };

  const handleRectangleCreated = (e) => {
    const rectangle = e.layer.getBounds();
    const selectedIds = [];
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((geoLayer) => {
          if (rectangle.intersects(geoLayer.getBounds())) {
            const featureId = geoLayer.feature.id || geoLayer.feature.properties.id;
            selectedIds.push(featureId);
            geoLayer.setStyle({ fillOpacity: 0.7 });
          }
        });
      }
    });
    setSelectedFeatureIds((prevIds) => [...new Set([...prevIds, ...selectedIds])]);

    // Remove the rectangle layer
    const drawnItems = mapRef.current._layers;
    Object.values(drawnItems).forEach((layer) => {
      if (layer instanceof L.Rectangle) {
        mapRef.current.removeLayer(layer);
      }
    });
  };

  return (
    <div className="map-container">
      <div className="group-form">
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <input
          type="color"
          value={groupColor}
          onChange={(e) => setGroupColor(e.target.value)}
        />
        <button className="add-group-button" onClick={handleAddGroup}>
          Add Group
        </button>
      </div>
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="leaflet-container"
        ref={mapRef}
        maxZoom={22} // Set a high maxZoom value to allow more zoom levels
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
        />
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleRectangleCreated}
            draw={{
              rectangle: true,
              circle: false,
              polygon: false,
              polyline: false,
              marker: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
        {geojsonData && (
          <GeoJSON
            data={geojsonData}
            onEachFeature={(feature, layer) => {
              layer.on('click', handleFeatureClick);
              layer.feature = feature; // Ensure the feature property is set
            }}
            style={getFeatureStyle}
          />
        )}
        <LegendControl groups={groups} />
      </MapContainer>
    </div>
  );
};

export default DisplayFarmTest;
