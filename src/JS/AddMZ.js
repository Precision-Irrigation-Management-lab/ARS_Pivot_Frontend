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

const AddMZ = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { farmname, irrigation_system_name, fromPage } = location.state || {};

  console.log('Location state:', location.state);

  const user = JSON.parse(sessionStorage.getItem('user'));
  const user_id = user?.user_id;

  const mapRef = useRef();
  const [geojsonData, setGeojsonData] = useState(null);
  // Store objects with { featureId, bearingSeqNum, distanceSeqNum }
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [managementZoneName, setManagementZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#ff0000');
  const [managementZones, setManagementZones] = useState([]);
  const [selectedZoneToDelete, setSelectedZoneToDelete] = useState('');
  const managementZonesRef = useRef(managementZones);
  const [mapCenter, setMapCenter] = useState([39.539106, -119.806483]);
  const [mapZoom, setMapZoom] = useState(17);
  const [errorMessage, setErrorMessage] = useState('');
  const [irrigationSystemName, setIrrigationSystemName] = useState(irrigation_system_name);
  const [irrigationTreatment, setIrrigationTreatment] = useState('');
  const [irrigationScheduleMethod, setIrrigationScheduleMethod] = useState('');

  // New state for farms dropdown
  const [farms, setFarms] = useState([]);
  const [selectedFarmName, setSelectedFarmName] = useState('');

  // New state for nodes dropdown
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');

  const [showModal, setShowModal] = useState(false);

  // Fetch farms for the dropdown
  useEffect(() => {
    if (user_id) {
      axios.get(`http://localhost:8001/farms/${user_id}`)
        .then((response) => {
          setFarms(response.data);
          // If a farmname is provided from location state, use it; otherwise, default to the first farm in the response
          const defaultFarm = response.data.find(farm => farm.farmname === farmname) || response.data[0];
          if (defaultFarm) {
            setSelectedFarmName(defaultFarm.farmname);
          }
        })
        .catch((error) => {
          console.error('Error fetching farms:', error);
        });
    }
  }, [user_id, farmname]);

  // Fetch nodes based on the selected farm's gateway id.
  useEffect(() => {
    const currentFarmName = farmname || selectedFarmName;
    if (user_id && farms.length > 0 && currentFarmName) {
      const matchingFarm = farms.find(farm => farm.farmname === currentFarmName);
      if (matchingFarm && matchingFarm.gateway) {
        axios.get(`http://localhost:8002/nodes/userid/${user_id}/gatewayid/${matchingFarm.gateway}`)
          .then((response) => {
            const nodesData = response.data.nodes;
            const nodesArray = Object.keys(nodesData).map(key => ({
              nodename: key,
              nodeid: nodesData[key][0]  // taking the first id from the array
            }));
            setNodes(nodesArray);
            if (nodesArray.length > 0) {
              setSelectedNodeId(nodesArray[0].nodeid);
            }
          })
          .catch((error) => {
            console.error('Error fetching nodes:', error);
          });
      }
    }
  }, [farms, farmname, selectedFarmName, user_id]);

  useEffect(() => {
    managementZonesRef.current = managementZones;
  }, [managementZones]);

  useEffect(() => {
    const fetchGeoJsonAndZones = async () => {
      try {
        if (!user_id || (!farmname && !selectedFarmName) || !irrigationSystemName) return;
    
        const geoJsonResponse = await axios.get(`http://localhost:8000/geojson/${user_id}/${farmname || selectedFarmName}/${irrigationSystemName}`);
        const { geojson, center } = geoJsonResponse.data;
        console.log('GeoJSON data:', geojson);
    
        if (!geojson.features) {
          throw new Error('Invalid GeoJSON data: features property is missing');
        }
    
        const features = geojson.features.map((feature, index) => ({
          ...feature,
          id: feature.id || feature.properties.id || index,
        }));
    
        setGeojsonData({ type: 'FeatureCollection', features });
    
        if (center && center.latitude !== undefined && center.longitude !== undefined) {
          const newCenter = [center.latitude, center.longitude];
          setMapCenter(newCenter);
          mapRef.current && mapRef.current.setView(newCenter, mapZoom);
        }
    
        if (fromPage === '/home') {
          const zonesResponse = await axios.get(`http://localhost:8000/all/management-zones/${user_id}/${farmname || selectedFarmName}/${irrigationSystemName}`);
          setManagementZones(zonesResponse.data.zones);
        }
    
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage('Failed to load data. Please try again later.');
        setShowModal(true);
      }
    };

    fetchGeoJsonAndZones();
  }, [user_id, farmname, irrigationSystemName, selectedFarmName, fromPage]);

  // Modified: capture extra metadata when selecting a feature
  const handleFeatureSelection = useCallback((layer, feature) => {
    // Try different keys for the feature identifier.
    const featureId = feature.id || feature.properties.polygon_id || feature.properties.feature_id;
    
    // Check both for uppercase and lowercase keys from two potential sources.
    const bearingSeqNum = 
      feature.properties.linear_zone_bearing?.BearingSeqNum ||
      feature.properties.linear_zone_bearing?.bearingSeqNum ||
      feature.properties.BearingSeqNum ||
      feature.properties.bearingSeqNum;
      
    const distanceSeqNum = 
      feature.properties.linear_zone_distance?.DistanceSeqNum ||
      feature.properties.linear_zone_distance?.distanceSeqNum ||
      feature.properties.DistanceSeqNum ||
      feature.properties.distanceSeqNum;
    
    console.log('Feature ID:', featureId, 'BearingSeqNum:', bearingSeqNum, 'DistanceSeqNum:', distanceSeqNum);
    
    setSelectedFeatureIds((prevIds) => {
      const alreadySelected = prevIds.find(item => item.featureId === featureId);
      if (alreadySelected) {
        // Deselect: reset style and remove from state.
        layer.setStyle({ fillOpacity: 0.2, color: 'blue', fillColor: 'blue', weight: 3 });
        return prevIds.filter(item => item.featureId !== featureId);
      } else {
        // Select: update style and add extra info.
        layer.setStyle({ fillOpacity: 0.7, color: 'blue', fillColor: 'blue', weight: 3 });
        return [...prevIds, { featureId, bearingSeqNum, distanceSeqNum }];
      }
    });
  }, []);
  

  const handleFeatureClick = useCallback((e) => {
    const layer = e.target;
    const feature = layer.feature;
    const featureId = feature.id || feature.properties.id;
    const bearingSeqNum = feature.properties.linear_zone_bearing?.BearingSeqNum || feature.properties.BearingSeqNum;
    const distanceSeqNum = feature.properties.linear_zone_distance?.DistanceSeqNum || feature.properties.DistanceSeqNum;
    
    // Check if the feature already belongs to a management zone using the new structure
    const zoneContainingFeature = managementZonesRef.current.find(zone => 
      zone.features && zone.features.some(f => f.feature_id === featureId)
    );
    if (zoneContainingFeature) {
      const errorMsg = `Polygon ${featureId} is already part of zone ${zoneContainingFeature.mz_name}`;
      setErrorMessage(errorMsg);
      setShowModal(true);
      console.error(errorMsg);
      return;
    }

    handleFeatureSelection(layer, feature);
  }, [handleFeatureSelection]);

  const getFeatureStyle = useCallback((feature) => {
    const featureId = feature.id || feature.properties.id;
    const zone = managementZones.find((z) => 
      z.features && z.features.some(f => f.feature_id === featureId)
    );
    if (zone) {
      const isEdge = (featureId) => {
        const neighbors = geojsonData.features.filter(f => {
          const fId = f.id || f.properties.id;
          return fId !== featureId && zone.features.some(f => f.feature_id === fId);
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
    if (selectedFeatureIds.some(item => item.featureId === featureId)) {
      return { color: 'blue', fillColor: 'blue', fillOpacity: 0.7, weight: 3 };
    }
    return { color: 'blue', fillOpacity: 0.2, weight: 1 };
  }, [managementZones, selectedFeatureIds, geojsonData]);

  // Modified: capture extra metadata in rectangle selections
  const handleRectangleCreated = useCallback((e) => {
    const rectangle = e.layer.getBounds();
    const selectedFeatures = [];
    const conflictingIds = [];
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((geoLayer) => {
          if (rectangle.intersects(geoLayer.getBounds())) {
            const feature = geoLayer.feature;
            const featureId = feature.id || feature.properties.id;
            const bearingSeqNum = feature.properties.linear_zone_bearing?.BearingSeqNum|| feature.properties.BearingSeqNum;
            const distanceSeqNum = feature.properties.linear_zone_distance?.DistanceSeqNum|| feature.properties.DistanceSeqNum;
            const zoneContainingFeature = managementZonesRef.current.find(zone => 
              zone.features && zone.features.some(f => f.feature_id === featureId)
            );

            if (zoneContainingFeature) {
              conflictingIds.push(featureId);
              return;
            }

            selectedFeatures.push({ featureId, bearingSeqNum, distanceSeqNum });
            geoLayer.setStyle({ fillOpacity: 0.7, color: 'blue', fillColor: 'blue', weight: 3 });
          }
        });
      }
    });

    if (conflictingIds.length > 0) {
      const errorMsg = `Polygons ${conflictingIds.join(', ')} are already part of a zone`;
      setErrorMessage(errorMsg);
      setShowModal(true);
      console.error(errorMsg);
    }

    setSelectedFeatureIds(prev => {
      const merged = [...prev];
      selectedFeatures.forEach(newItem => {
        if (!prev.some(item => item.featureId === newItem.featureId)) {
          merged.push(newItem);
        }
      });
      return merged;
    });

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
    setShowModal(false);
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

      const farmNameDisplay = geojsonData.features[0].properties.farmname || 'Unknown';
      const farmCenter = L.geoJSON(geojsonData).getBounds().getCenter();
      addTextToMap(map, `${farmNameDisplay}`, farmCenter);

      managementZones.forEach(zone => {
        const zoneFeatures = geojsonData.features.filter(f => 
          zone.features && zone.features.some(feat => feat.feature_id === (f.id || f.properties.id))
        );
        const zoneCentroid = calculateCentroid(zoneFeatures);
        addTextToMap(map, zone.mz_name, zoneCentroid);
      });

      map.on('zoomend', () => {
        const zoomLevel = map.getZoom();
        const fontSize = Math.max(10, zoomLevel);
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
    navigate('/home', { state: { user_id: user_id, farmname: farmname || selectedFarmName, irrigation_system_name: irrigationSystemName } });
  };

  // Updated: combine feature information into one array
  const handleAddZone = async () => {
    const trimmedZoneName = managementZoneName.trim().toLowerCase();
    const validSelectedFeatures = selectedFeatureIds.filter(item => item && item.featureId != null);

    if (trimmedZoneName && validSelectedFeatures.length > 0) {
      if (managementZones.some((zone) => zone.mz_name.toLowerCase() === trimmedZoneName)) {
        setErrorMessage('Management zone name must be unique');
        setShowModal(true);
        console.error('Management zone name must be unique');
        return;
      }

      const farmData = farms.find(farm => farm.farmname === (farmname || selectedFarmName));
      if (!farmData) {
        setErrorMessage('Selected farm not found');
        setShowModal(true);
        return;
      }

      const newZoneFeatures = validSelectedFeatures.map(item => ({
        feature_id: item.featureId,
        bearingSeqNum: item.bearingSeqNum,
        distanceSeqNum: item.distanceSeqNum,
      }));

      const newZone = {
        mz_name: managementZoneName.trim(),
        features: newZoneFeatures,
        color: zoneColor,
        user_id: user_id,
        farmname: farmData.farmname,
        gateway: farmData.gateway,
        nodeid: selectedNodeId,
        irrigation_system_name: irrigationSystemName,
        irrigation_treatment: irrigationTreatment,
        irrigation_schedule_method: irrigationScheduleMethod,
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
        console.log('newZone:', newZone);
        console.log('Zone data successfully posted');
      } catch (error) {
        console.error('Error posting zone data:', error);
      }
    } else {
      setErrorMessage('Management zone name and selected features are required');
      setShowModal(true);
      console.error('Management zone name and selected features are required');
    }
  };

  const handleDeleteZone = async () => {
    if (selectedZoneToDelete) {
      const zoneToDelete = managementZones.find(zone => zone.mz_name === selectedZoneToDelete);
      if (!zoneToDelete) {
        setErrorMessage('Selected zone not found');
        setShowModal(true);
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
        await axios.delete(`http://localhost:8000/management-zones/${user_id}/${farmname || selectedFarmName}/${irrigation_system_name}/${zoneToDelete.mz_name}`);
        console.log('Zone data successfully deleted');
      } catch (error) {
        console.error('Error deleting zone data:', error);
      }

      setSelectedZoneToDelete('');
    } else {
      setErrorMessage('Please select a zone to delete');
      setShowModal(true);
      console.error('Please select a zone to delete');
    }
  };

  const updateGeoJsonWithZones = useCallback((newZone) => {
    setGeojsonData((prevData) => {
      const newZoneFeatureIds = newZone.features.map(f => f.feature_id);
      const updatedFeatures = prevData.features.map((feature) => {
        const featureId = feature.id || feature.properties.id;
        const isSelected = newZoneFeatureIds.includes(featureId);
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

  return (
    <div className="addmz-map-container">
      <div className="zone-form">
        {/* Farms Dropdown */}
        <select
          value={selectedFarmName}
          onChange={(e) => {
            setSelectedFarmName(e.target.value);
            setErrorMessage('');
          }}
        >
          {farms.map((farm, index) => (
            <option key={index} value={farm.farmname}>
              {farm.farmname} ({farm.gateway})
            </option>
          ))}
        </select>

        {/* Nodes Dropdown */}
        <select
          value={selectedNodeId}
          onChange={(e) => {
            setSelectedNodeId(e.target.value);
            setErrorMessage('');
          }}
        >
          {nodes.length > 0 ? (
            nodes.map((node, index) => (
              <option key={index} value={node.nodeid}>
                {node.nodename} ({node.nodeid})
              </option>
            ))
          ) : (
            <option value="">No nodes available</option>
          )}
        </select>

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

        {/* New Field: Irrigation Treatment (% of Full Irrigation) */}
        <input
          type="number"
          placeholder="Irrigation Treatment (% of Full Irrigation)"
          value={irrigationTreatment}
          onChange={(e) => {
            setIrrigationTreatment(e.target.value);
            setErrorMessage('');
          }}
          style={{ borderColor: errorMessage ? 'red' : '' }}
        />

        {/* New Field: Irrigation Scheduling Method */}
        <select
          value={irrigationScheduleMethod}
          onChange={(e) => {
            setIrrigationScheduleMethod(e.target.value);
            setErrorMessage('');
          }}
        >
          <option value="">Select Irrigation Scheduling Method</option>
          <option value="1">MANUAL</option>
          <option value="2">iCWSI</option>
          <option value="3">HYBRID</option>
        </select>

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
        zoom={mapZoom}
        className="leaflet-container"
        ref={mapRef}
        maxZoom={22}
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
              layer.feature = feature;
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
