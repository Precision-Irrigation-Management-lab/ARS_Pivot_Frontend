import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import axios from 'axios';
import '../CSS/AddMZ.css';
import Modal from './Modal'; // Ensure the correct import path

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

const AddMZ = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { farmname, irrigation_system_name } = location.state || {};

  const user = JSON.parse(sessionStorage.getItem('user'));
  const user_id = user?.user_id;

  const mapRef = useRef();
  const [geojsonData, setGeojsonData] = useState(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [managementZoneName, setManagementZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#ff0000'); // Default color
  const [managementZones, setManagementZones] = useState([]);
  const [selectedZoneToDelete, setSelectedZoneToDelete] = useState(''); // State to manage the selected zone to delete
  const managementZonesRef = useRef(managementZones);
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]); // Default center
  const [mapZoom, setMapZoom] = useState(17); // Default zoom
  const [errorMessage, setErrorMessage] = useState('');
  const [irrigationSystemName, setIrrigationSystemName] = useState(irrigation_system_name);

  const [showModal, setShowModal] = useState(false); // State to control modal visibility

  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        console.log(`Fetching GeoJSON data for user_id: ${user_id}, farmname: ${farmname}, irrigation_system_name: ${irrigationSystemName}`);
        const response = await axios.get(`http://localhost:8000/geojson/${user_id}/${farmname}/${irrigationSystemName}`);
        console.log('GeoJSON fetch response:', response.data);

        const { geojson, user_id: responseUserId, farmname: responseFarmname, center, irrigation_system_name: responseIrrigationSystemName } = response.data;

        console.log('Fetched GeoJSON:', geojson);
        console.log('Response User ID:', responseUserId);
        console.log('Response Farmname:', responseFarmname);
        console.log('Map Center:', center);
        console.log('Irrigation System Name:', responseIrrigationSystemName);

        if (!geojson.features) {
          throw new Error('Invalid GeoJSON data: features property is missing');
        }

        const features = geojson.features.map((feature, index) => ({
          ...feature,
          id: feature.id || feature.properties.id || index,
        }));

        setGeojsonData({ type: 'FeatureCollection', features });
        setIrrigationSystemName(responseIrrigationSystemName);

        // Use the center from the GET request to set the map center
        const mapCenter = [center.latitude, center.longitude] || [39.539106, -119.806483]; // Fallback to default if no center is provided
        setMapCenter(mapCenter);

        // Update the map view if the mapRef is set
        if (mapRef.current) {
          mapRef.current.setView(mapCenter, mapZoom);
        }
      } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
      }
    };

    if (user_id && farmname && irrigationSystemName) {
      fetchGeoJson();
    }
  }, [user_id, farmname, irrigationSystemName, mapZoom]);

  useEffect(() => {
    managementZonesRef.current = managementZones;
  }, [managementZones]);

  const handleFeatureSelection = useCallback((layer, featureId) => {
    setSelectedFeatureIds((prevIds) => {
      const isSelected = prevIds.includes(featureId);
      if (!isSelected) {
        layer.setStyle({ fillOpacity: 0.7, color: 'blue', fillColor: 'blue', weight: 3 });
      } else {
        layer.setStyle({ fillOpacity: 0.2, color: 'blue', fillColor: 'blue', weight: 3 });
      }
      return isSelected ? prevIds.filter((id) => id !== featureId) : [...prevIds, featureId];
    });
  }, []);

  const handleFeatureClick = useCallback((e) => {
    const layer = e.target;
    const feature = layer.feature;
    const featureId = feature.id || feature.properties.id;

    const zoneContainingFeature = managementZonesRef.current.find(zone => zone.feature_ids.includes(featureId));
    if (zoneContainingFeature) {
      const errorMsg = `Polygon ${featureId} is already part of zone ${zoneContainingFeature.mz_name}`;
      setErrorMessage(errorMsg);
      setShowModal(true); // Show the modal with error message
      console.error(errorMsg);
      return;
    }

    handleFeatureSelection(layer, featureId);
  }, [handleFeatureSelection]);

  const getFeatureStyle = useCallback((feature) => {
    const featureId = feature.id || feature.properties.id;
    const zone = managementZones.find((z) => z.feature_ids && z.feature_ids.includes(featureId));
    if (zone) {
      const isEdge = (featureId) => {
        const neighbors = geojsonData.features.filter(f => {
          const fId = f.id || f.properties.id;
          return fId !== featureId && zone.feature_ids.includes(fId);
        });
        return neighbors.length < geojsonData.features.length;
      };

      const style = { fillColor: zone.color, fillOpacity: 0.7 };

      if (isEdge(featureId)) {
        style.color = 'black';
        style.weight = 3;
      } else {
        style.color = zone.color;
        style.weight = 1;
      }

      return style;
    }
    if (selectedFeatureIds.includes(featureId)) {
      return { color: 'blue', fillColor: 'blue', fillOpacity: 0.7, weight: 3 };
    }
    return { color: 'blue', fillOpacity: 0.2, weight: 1 };
  }, [managementZones, selectedFeatureIds, geojsonData]);

  const handleAddZone = async () => {
    const trimmedZoneName = managementZoneName.trim().toLowerCase();

    if (trimmedZoneName && selectedFeatureIds.length > 0) {
      if (managementZones.some((zone) => zone.mz_name.toLowerCase() === trimmedZoneName)) {
        setErrorMessage('Management zone name must be unique');
        setShowModal(true); // Show the modal with error message
        console.error('Management zone name must be unique');
        return;
      }

      const validFeatureIds = selectedFeatureIds.filter(id => id !== null && id !== undefined);

      const newZone = {
        mz_name: managementZoneName.trim(), // Use the trimmed name
        feature_ids: validFeatureIds.filter(featureId => !managementZonesRef.current.some(zone => zone.feature_ids.includes(featureId))),
        color: zoneColor,
        user_id: user_id,
        farmname: farmname,
        irrigation_system_name: irrigationSystemName, // Add irrigation system name
      };

      console.log('Adding new management zone:', newZone);

      setManagementZones((prevZones) => {
        const updatedZones = [...prevZones, newZone];
        managementZonesRef.current = updatedZones;
        return updatedZones;
      });

      setManagementZoneName('');
      setZoneColor('#ff0000');
      setSelectedFeatureIds([]);
      setErrorMessage('');

      updateGeoJsonWithZones(newZone);

      try {
        await axios.post('http://localhost:8000/management-zones', newZone);
        console.log('Zone data successfully posted');
      } catch (error) {
        console.error('Error posting zone data:', error);
      }
    } else {
      setErrorMessage('Management zone name and selected features are required');
      setShowModal(true); // Show the modal with error message
      console.error('Management zone name and selected features are required');
    }
  };

  const handleDeleteZone = async () => {
    if (selectedZoneToDelete) {
      const zoneToDelete = managementZones.find(zone => zone.mz_name === selectedZoneToDelete);
      if (!zoneToDelete) {
        setErrorMessage('Selected zone not found');
        setShowModal(true); // Show the modal with error message
        console.error('Selected zone not found');
        return;
      }

      console.log('Deleting zone:', zoneToDelete);

      setManagementZones((prevZones) => {
        const updatedZones = prevZones.filter(zone => zone.mz_name !== selectedZoneToDelete);
        managementZonesRef.current = updatedZones;
        return updatedZones;
      });

      updateGeoJsonWithZonesAfterDeletion(selectedZoneToDelete);

      try {
        await axios.delete(`http://localhost:8000/management-zones/${user_id}/${farmname}/${zoneToDelete.irrigation_system_name}/${zoneToDelete.mz_name}`);
        console.log('Zone data successfully deleted');
      } catch (error) {
        console.error('Error deleting zone data:', error);
      }

      setSelectedZoneToDelete('');
    } else {
      setErrorMessage('Please select a zone to delete');
      setShowModal(true); // Show the modal with error message
      console.error('Please select a zone to delete');
    }
  };

  const updateGeoJsonWithZones = useCallback((newZone) => {
    setGeojsonData((prevData) => {
      const updatedFeatures = prevData.features.map((feature) => {
        const featureId = feature.id || feature.properties.id;
        const isSelected = newZone.feature_ids.includes(featureId);
        if (isSelected) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              zone: newZone.mz_name,
            },
          };
        }
        return feature;
      });
      return { ...prevData, features: updatedFeatures };
    });
  }, []);

  const updateGeoJsonWithZonesAfterDeletion = useCallback((deletedZoneName) => {
    setGeojsonData((prevData) => {
      const updatedFeatures = prevData.features.map((feature) => {
        if (feature.properties.zone === deletedZoneName) {
          const { zone, ...restProperties } = feature.properties;
          return {
            ...feature,
            properties: restProperties,
          };
        }
        return feature;
      });
      return { ...prevData, features: updatedFeatures };
    });

    // Restore the display of polygons to normal (not red background color)
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((geoLayer) => {
          if (geoLayer.feature.properties.zone === deletedZoneName) {
            geoLayer.setStyle({ color: 'blue', fillColor: 'blue', fillOpacity: 0.2, weight: 1 });
          }
        });
      }
    });
  }, []);

  const handleRectangleCreated = useCallback((e) => {
    const rectangle = e.layer.getBounds();
    const selectedIds = [];
    const conflictingIds = [];
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((geoLayer) => {
          if (rectangle.intersects(geoLayer.getBounds())) {
            const featureId = geoLayer.feature.id || geoLayer.feature.properties.id;
            const zoneContainingFeature = managementZonesRef.current.find(zone => zone.feature_ids && zone.feature_ids.includes(featureId));

            if (zoneContainingFeature) {
              conflictingIds.push(featureId);
              return;
            }

            selectedIds.push(featureId);
            geoLayer.setStyle({ fillOpacity: 0.7, color: 'blue', fillColor: 'blue', weight: 3 });
          }
        });
      }
    });

    if (conflictingIds.length > 0) {
      const errorMsg = `Polygons ${conflictingIds.join(', ')} are already part of a zone`;
      setErrorMessage(errorMsg);
      setShowModal(true); // Show the modal with error message
      console.error(errorMsg);
    }

    setSelectedFeatureIds((prevIds) => [...new Set([...prevIds, ...selectedIds])]);

    // Remove the rectangle layer
    const drawnItems = mapRef.current._layers;
    Object.values(drawnItems).forEach((layer) => {
      if (layer instanceof L.Rectangle) {
        mapRef.current.removeLayer(layer);
      }
    });
  }, []);

  const handleCloseError = () => {
    setErrorMessage('');
    setShowModal(false); // Hide the modal
  };

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

  const handleNext = () => {
    navigate('/home', { state: { user_id: user_id, farmname: farmname, irrigation_system_name: irrigationSystemName } });
  };

  return (
    <div className="map-container">
      <div className="zone-form">
        <input
          type="text"
          placeholder="Management Zone Name"
          value={managementZoneName}
          onChange={(e) => {
            setManagementZoneName(e.target.value);
            setErrorMessage('');
          }}
          style={{ borderColor: errorMessage ? 'red' : '' }}
        />
        <input
          type="color"
          value={zoneColor}
          onChange={(e) => setZoneColor(e.target.value)}
        />
        <button className="add-zone-button" onClick={handleAddZone}>
          Add Management Zone
        </button>
        <select
          value={selectedZoneToDelete}
          onChange={(e) => {
            setSelectedZoneToDelete(e.target.value);
            setErrorMessage('');
          }}
        >
          <option value="">Select zone to delete</option>
          {managementZones.map(zone => (
            <option key={zone.mz_name} value={zone.mz_name}>
              {zone.mz_name}
            </option>
          ))}
        </select>
        <button className="delete-zone-button" onClick={handleDeleteZone}>
          Delete Zone
        </button>
      </div>
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
              // Initial style
              layer.setStyle(getFeatureStyle(feature));
            }}
            style={getFeatureStyle}
          />
        )}
        <LegendControl managementZones={managementZones} />
      </MapContainer>
      <button className="next-button" onClick={handleNext}>
        Next
      </button>
      <Modal
        message={errorMessage}
        onClose={handleCloseError}
        onConfirm={() => {}}
        buttonText="OK"
        onButtonClick={handleCloseError}
        isYesNo={false}
        show={showModal}
      />
    </div>
  );
};

export default AddMZ;
