import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, FeatureGroup, Polygon, Rectangle, Marker, Popup } from 'react-leaflet';
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

const AddLinearMove = () => {
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
    const [drawnLayer, setDrawnLayer] = useState(null);
    const [lengthOfLinear, setLengthOfLinear] = useState('');
    const [widthOfLinear, setWidthOfLinear] = useState('');
    const [numberOfSprinklerZones, setNumberOfSprinklerZones] = useState(1);
    const [sprinklerZones, setSprinklerZones] = useState([{ id: 1, initialWidth: '', finalWidth: '' }]);
    const [spaceBetweenNozzles, setSpaceBetweenNozzles] = useState('');
    const [maximumSpeed, setMaximumSpeed] = useState('');
    const [waterApplicationAtMaxSpeed, setWaterApplicationAtMaxSpeed] = useState('');
    const [centerPoint, setCenterPoint] = useState({ lat: '', lng: '' });
    const [linearMoveName, setLinearMoveName] = useState('');
    const [bbox, setBbox] = useState(null);
    const [startPoint, setStartPoint] = useState(null);
    const [key, setKey] = useState(0);
    const [isLengthHorizontal, setIsLengthHorizontal] = useState(true);
    const debouncedSearchText = useDebounce(searchText, 500);

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

        if (layerType === 'rectangle' || layerType === 'polygon') {
            if (drawnLayer) {
                // Remove the newly created layer immediately if one already exists
                mapRef.current.removeLayer(layer);
                alert('Please delete the existing layer before drawing a new one.');
                return;
            }

            const geojson = layer.toGeoJSON();
            const bounds = layer.getBounds ? layer.getBounds() : L.latLngBounds(layer.getLatLngs()[0]);
            const southWest = bounds.getSouthWest();
            const northEast = bounds.getNorthEast();
            const layerLength = southWest.distanceTo([southWest.lat, northEast.lng]);
            const layerWidth = southWest.distanceTo([northEast.lat, southWest.lng]);

            geojson.properties.length = layerLength;
            geojson.properties.width = layerWidth;

            const center = bounds.getCenter();
            setCenterPoint({ lat: center.lat, lng: center.lng });

            setDrawnLayer(layer);

            // Ask the user to select which side is length and which is width
            const userChoice = window.confirm('Does the Linear move horizontally? Click "OK" for Yes, "Cancel" for No.');
            setIsLengthHorizontal(userChoice);
            if (userChoice) {
                setLengthOfLinear(layerLength);
                setWidthOfLinear(layerWidth);
            } else {
                setLengthOfLinear(layerWidth);
                setWidthOfLinear(layerLength);
            }

            const newBbox = [
                [southWest.lat, southWest.lng],
                [northEast.lat, northEast.lng]
            ];
            setBbox(newBbox);

            console.log('Layer created:', geojson);
            console.log('Bounding Box:', newBbox);
        }
    }, [drawnLayer]);

    const handleDeleted = useCallback(() => {
        setDrawnLayer(null);
        setLengthOfLinear('');
        setWidthOfLinear('');
        setCenterPoint({ lat: '', lng: '' });
        setBbox(null);
        setStartPoint(null);
        setKey((prevKey) => prevKey + 1);  // Force re-rendering by changing the key
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

    const handleLengthChange = (e) => {
        const newLength = parseFloat(e.target.value);
        setLengthOfLinear(newLength);
    };

    const handleWidthChange = (e) => {
        const newWidth = parseFloat(e.target.value);
        setWidthOfLinear(newWidth);
    };

    const handleSprinklerZoneChange = (index, field, value) => {
        const newSprinklerZones = [...sprinklerZones];
        newSprinklerZones[index][field] = value;
        setSprinklerZones(newSprinklerZones);

        if (field === 'finalWidth' && index < numberOfSprinklerZones - 1) {
            const nextZone = newSprinklerZones[index + 1];
            nextZone.initialWidth = value;
            setSprinklerZones(newSprinklerZones);
        }
    };

    const handleNumberOfSprinklerZonesChange = (e) => {
        const newNumber = parseInt(e.target.value, 10);
        setNumberOfSprinklerZones(newNumber);

        const newSprinklerZones = Array.from({ length: newNumber }, (_, index) => ({
            id: index + 1,
            initialWidth: index === 0 ? '' : sprinklerZones[index - 1]?.finalWidth || '',
            finalWidth: '',
        }));

        setSprinklerZones(newSprinklerZones);
    };

    const handleSpaceBetweenNozzlesChange = (e) => {
        setSpaceBetweenNozzles(e.target.value);
    };

    const handleMaximumSpeedChange = (e) => {
        setMaximumSpeed(e.target.value);
    };

    const handleWaterApplicationAtMaxSpeedChange = (e) => {
        setWaterApplicationAtMaxSpeed(e.target.value);
    };

    const handleCenterPointChange = (e) => {
        const { name, value } = e.target;
        setCenterPoint((prev) => ({ ...prev, [name]: value }));
    };

    const handleLinearMoveNameChange = (e) => {
        setLinearMoveName(e.target.value);
    };

    const handleStartPointSelection = (e, point) => {
        setStartPoint(point);
        console.log('Start Point selected:', point);
    };

    const updateRectangle = useCallback(() => {
        if (!mapRef.current || !drawnLayer) return;

        // Determine the deltas based on user choice
        const latDelta = isLengthHorizontal ? widthOfLinear / 111320 : lengthOfLinear / 111320; // Width or Length in meters converted to degrees latitude
        const lngDelta = isLengthHorizontal ? lengthOfLinear / (111320 * Math.cos(centerPoint.lat * Math.PI / 180)) : widthOfLinear / (111320 * Math.cos(centerPoint.lat * Math.PI / 180)); // Length or Width in meters converted to degrees longitude

        const bounds = L.latLngBounds([
            [centerPoint.lat - latDelta / 2, centerPoint.lng - lngDelta / 2],
            [centerPoint.lat + latDelta / 2, centerPoint.lng + lngDelta / 2]
        ]);

        if (drawnLayer.setBounds) {
            drawnLayer.setBounds(bounds);
        } else if (drawnLayer.setLatLngs) {
            drawnLayer.setLatLngs([bounds.getSouthWest(), bounds.getNorthEast()]);
        }

        const newBbox = [
            [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ];
        setBbox(newBbox);

        console.log('Bounding Box updated:', newBbox);
    }, [lengthOfLinear, widthOfLinear, centerPoint, drawnLayer, isLengthHorizontal]);

    useEffect(() => {
        if (lengthOfLinear && widthOfLinear && centerPoint.lat && centerPoint.lng) {
            updateRectangle();
        }
    }, [lengthOfLinear, widthOfLinear, centerPoint, updateRectangle]);

    const handleSubmit = async () => {
        if (!user_id) {
            alert('User not logged in or user ID not available');
            return;
        }

        if (!drawnLayer || !startPoint) {
            alert('Please draw a shape and select a start point on the map before submitting.');
            return;
        }

        const bounds = drawnLayer.getBounds ? drawnLayer.getBounds() : L.latLngBounds(drawnLayer.getLatLngs()[0]);
        const bbox = [
            [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
            [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
        ];

        const sprinklerZonesData = sprinklerZones.reduce((acc, zone, index) => {
            const width = index === numberOfSprinklerZones - 1 ? widthOfLinear : parseFloat(zone.finalWidth);
            acc[zone.id] = [parseFloat(zone.initialWidth || 0), width];
            return acc;
        }, {});

        console.log('Sprinkler Zones Data:', sprinklerZonesData);

        const geoJsonRequest = {
            center: {
                latitude: parseFloat(centerPoint.lat),
                longitude: parseFloat(centerPoint.lng),
            },
            width: widthOfLinear,
            length: lengthOfLinear,
            gridspacing: 2,
            farmname: farmName,
            irrigation_system_name: linearMoveName,
            sprinklerzones: sprinklerZonesData,
            bbox: bbox,
            startpoint: startPoint, // Add start_point to request
            user_id: user_id, // Added user_id field here
            isLengthHorizontal: isLengthHorizontal // Add isLengthHorizontal field here
        };
        console.log('bbox:', bbox);
        console.log('Request Body:', JSON.stringify(geoJsonRequest, null, 2));

        const endpoint = 'http://127.0.0.1:8000/linear/generate-geojson';
        try {
            const response = await axios.post(endpoint, geoJsonRequest);
            console.log('API Response:', response.data);

            navigate('/addmz', { state: { farmname: farmName, irrigation_system_name: linearMoveName } });
        } catch (error) {
            console.error('Error submitting GeoJSON:', error);
        }
    };

    const getCornerMarkers = () => {
        if (!bbox) return null;

        const [southWest, northEast] = bbox;
        const southEast = [southWest[0], northEast[1]];
        const northWest = [northEast[0], southWest[1]];

        const corners = [
            { latlng: southWest, name: 'South West' },
            { latlng: northEast, name: 'North East' },
            { latlng: southEast, name: 'South East' },
            { latlng: northWest, name: 'North West' }
        ];

        return corners.map((corner, index) => (
            <Marker key={index} position={corner.latlng} eventHandlers={{ click: (e) => handleStartPointSelection(e, corner.latlng) }}>
                <Popup>{corner.name}</Popup>
            </Marker>
        ));
    };

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
                    <EditControl
                        position="topright"
                        onCreated={handleCreated}
                        onDeleted={handleDeleted}
                        draw={{
                            rectangle: drawnLayer ? false : true,
                            polygon: drawnLayer ? false : true,
                            circle: false,
                            polyline: false,
                            marker: false,
                            circlemarker: false,
                        }}
                        edit={{
                            remove: true,
                            edit: false,
                        }}
                    />
                </FeatureGroup>
                {selectedPosition && <Marker position={selectedPosition} />}
                {drawnLayer && drawnLayer.getBounds && <Rectangle bounds={drawnLayer.getBounds()} color="blue" weight={1} />}
                {drawnLayer && !drawnLayer.getBounds && <Polygon positions={drawnLayer.getLatLngs()[0]} color="blue" weight={1} />}
                {getCornerMarkers()}
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
                        Linear Move Name:
                        <input
                            type="text"
                            value={linearMoveName}
                            onChange={handleLinearMoveNameChange}
                        />
                    </label>
                </div>
                <div className="input-field">
                    <label>
                        Length of Linear (meters):
                        <input
                            type="text"
                            value={lengthOfLinear}
                            onChange={handleLengthChange}
                        />
                    </label>
                </div>
                <div className="input-field">
                    <label>
                        Width of Linear (meters):
                        <input
                            type="text"
                            value={widthOfLinear}
                            onChange={handleWidthChange}
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
                    <div key={zone.id} className="sprinkler-zone">
                        {index === 0 && (
                            <label>
                                Sprinkler Zone {zone.id} - Initial Width (meters):
                                <input
                                    type="text"
                                    value={zone.initialWidth}
                                    onChange={(e) => handleSprinklerZoneChange(index, 'initialWidth', e.target.value)}
                                />
                            </label>
                        )}
                        <label>
                            Sprinkler Zone {zone.id} - Final Width (meters):
                            <input
                                type="text"
                                value={index === numberOfSprinklerZones - 1 ? widthOfLinear : zone.finalWidth}
                                onChange={(e) => handleSprinklerZoneChange(index, 'finalWidth', e.target.value)}
                                readOnly={index === numberOfSprinklerZones - 1}
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
            </div>
            <button className="submit-button" onClick={handleSubmit}>
                Submit
            </button>
        </div>
    );
};

export default AddLinearMove;
