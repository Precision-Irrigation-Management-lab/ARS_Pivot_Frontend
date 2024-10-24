import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Rectangle, Marker, Popup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L, { circleMarker } from 'leaflet';
import axios from 'axios';
import { useLocation,useNavigate } from 'react-router-dom';
import '../CSS/AddCenterPivot.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AddMicroIrrigation = () => {
    const navigate = useNavigate();
    const mapRef = useRef();
    const location = useLocation();
    const [farmName, setFarmName] = useState('');
    const [irrigationSystemName, setIrrigationSystemName] = useState('');
    const [emitterFlow, setEmitterFlow] = useState('');
    const [emitterSpacing, setEmitterSpacing] = useState('');
    const [dripLineDistance, setDripLineDistance] = useState('');
    const [irrigationEfficiency, setIrrigationEfficiency] = useState(0.95);
    const [applicationRate, setApplicationRate] = useState('');
    const [area, setArea] = useState(0);
    const [unit, setUnit] = useState({
        emitterFlow: 'imperial',
        emitterSpacing: 'imperial',
        dripLineDistance: 'imperial',
        applicationRate: 'imperial',
    });
    const [drawnLayer, setDrawnLayer] = useState(null);
    const [markers, setMarkers] = useState([]);
    const [startPoint, setStartPoint] = useState(null);
    const [centerPoint, setCenterPoint] = useState(null);
    const [horizontalDistance, setHorizontalDistance] = useState('');
    const [verticalDistance, setVerticalDistance] = useState('');
    const [bbox, setBbox] = useState(null);
    const [length, setLength] = useState(0);
    const [width, setWidth] = useState(0);

    // Parse the user ID from the session storage
    const user = JSON.parse(sessionStorage.getItem('user'));
    const user_id = user?.user_id || location.state?.user_id;

    useEffect(() => {
        // Retrieve farmName from previous page (if using location state)
        if (location.state && location.state.farm) {
            setFarmName(location.state.farm);
        }
    }, [location.state]);

    const convertValue = (value, fromUnit, toUnit, type) => {
        const conversions = {
            gph_to_lph: 3.78541,
            lph_to_gph: 1 / 3.78541,
            inches_to_meters: 0.0254,
            meters_to_inches: 1 / 0.0254,
        };

        if (type === 'flow') {
            if (fromUnit === 'imperial' && toUnit === 'SI') return value * conversions.gph_to_lph;
            if (fromUnit === 'SI' && toUnit === 'imperial') return value * conversions.lph_to_gph;
        } else if (type === 'distance') {
            if (fromUnit === 'imperial' && toUnit === 'SI') return value * conversions.inches_to_meters;
            if (fromUnit === 'SI' && toUnit === 'imperial') return value * conversions.meters_to_inches;
        }
        return value;
    };

    const calculateApplicationRate = () => {
        let Q_e = parseFloat(emitterFlow);
        let Row_x = parseFloat(dripLineDistance);
        let Emit_y = parseFloat(emitterSpacing);

        if (unit.emitterFlow === 'SI') Q_e = convertValue(Q_e, 'SI', 'imperial', 'flow');
        if (unit.dripLineDistance === 'SI') Row_x = convertValue(Row_x, 'SI', 'imperial', 'distance');
        if (unit.emitterSpacing === 'SI') Emit_y = convertValue(Emit_y, 'SI', 'imperial', 'distance');

        const PR = (231.0 * (Q_e * irrigationEfficiency)) / (Row_x * Emit_y);
        const result = unit.applicationRate === 'SI' ? PR * 25.4 : PR;

        setApplicationRate(result.toFixed(2));
    };

    const handleUnitChange = (e, type) => {
        const newUnit = { ...unit, [type]: e.target.value };
        setUnit(newUnit);
    };

    const handleValueChange = (e, setValue) => {
        setValue(e.target.value);
    };

    const handleCreated = useCallback((e) => {
        const { layerType, layer } = e;

        if (layerType === 'rectangle') {
            const bounds = layer.getBounds();
            let areaValue = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);

            setArea(areaValue);
            setDrawnLayer(layer);

            const bboxValue = [
                [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
                [bounds.getNorthEast().lat, bounds.getNorthEast().lng]
            ];
            setBbox(bboxValue);

            const lengthValue = bounds.getNorthEast().lng - bounds.getNorthWest().lng;
            const widthValue = bounds.getNorthWest().lat - bounds.getSouthWest().lat;
            setLength(lengthValue);
            setWidth(widthValue);

            const center = bounds.getCenter();
            setCenterPoint({ lat: center.lat, lng: center.lng });

            const cornerMarkers = [
                bounds.getNorthWest(),
                bounds.getNorthEast(),
                bounds.getSouthWest(),
                bounds.getSouthEast(),
            ];
            setMarkers(cornerMarkers);
        }
    }, []);
   
    const handleMarkerClick = (latlng) => {
        const startPointArray = [latlng.lat, latlng.lng]; // Convert to [latitude, longitude] format
        setStartPoint(startPointArray);
        console.log('Start Point selected:', startPointArray);
    };
    


    const handleSubmit = async () => {
        const geoJsonRequest = {
            farmname:farmName,
            irrigation_system_name: irrigationSystemName,
            user_id,
            emitterFlow: convertValue(emitterFlow, unit.emitterFlow, 'SI', 'flow'),
            emitterSpacing: convertValue(emitterSpacing, unit.emitterSpacing, 'SI', 'distance'),
            dripLineDistance: convertValue(dripLineDistance, unit.dripLineDistance, 'SI', 'distance'),
            irrigationEfficiency,
            applicationRate,
            area,
            startpoint: startPoint,
            center: {
                latitude: parseFloat(centerPoint.lat),
                longitude: parseFloat(centerPoint.lng),
            },
            bbox,
            length,
            width,
            length_split: horizontalDistance,
            width_split: verticalDistance,
        };

        const endpoint = 'http://127.0.0.1:8000/micro-irrigation/generate-geojson';
        try {
            const response = await axios.post(endpoint, geoJsonRequest);
            console.log('API Response:', response.data);
            navigate('/addmz', { state: { farmname: farmName, irrigation_system_name: irrigationSystemName } });
        } catch (error) {
            console.error('Error submitting data:', error);
        }
    };

    return (
        <div className="Add-microirrigation-map-container">
            <MapContainer center={[39.539106, -119.806483]} zoom={13} className="leaflet-container" ref={mapRef}>
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    attribution='Imagery © <a href="https://www.google.com/maps">Google Maps</a>'
                />
                <FeatureGroup>
                    <EditControl
                        position="topright"
                        onCreated={handleCreated}
                        draw={{
                            rectangle: true,
                            polygon: true,
                            circle: false,
                            polyline: false,
                            marker: false,
                            circlemarker:false,
                        }}
                        edit={{ remove: true }}
                    />
                </FeatureGroup>
                {drawnLayer && drawnLayer.getBounds && (
                    <Rectangle bounds={drawnLayer.getBounds()} color="blue" weight={1} />
                )}
                {markers.map((marker, index) => (
                    <Marker
                        key={index}
                        position={marker}
                        eventHandlers={{
                            click: () => handleMarkerClick(marker),
                        }}
                    >
                        <Popup>Click to set as Start Point</Popup>
                    </Marker>
                ))}
            </MapContainer>
            <div className="input-fields">
                <div className="input-field">
                    <label>Irrigation System Name:</label>
                    <input type="text" value={irrigationSystemName} onChange={(e) => handleValueChange(e, setIrrigationSystemName)} />
                </div>
                <div className="input-field">
                    <label>Emitter Flow:</label>
                    <input type="text" value={emitterFlow} onChange={(e) => handleValueChange(e, setEmitterFlow)} />
                    <select value={unit.emitterFlow} onChange={(e) => handleUnitChange(e, 'emitterFlow')}>
                        <option value="imperial">gph (Imperial)</option>
                        <option value="SI">liters/hour (SI)</option>
                    </select>
                </div>
                <div className="input-field">
                    <label>Emitter Spacing:</label>
                    <input type="text" value={emitterSpacing} onChange={(e) => handleValueChange(e, setEmitterSpacing)} />
                    <select value={unit.emitterSpacing} onChange={(e) => handleUnitChange(e, 'emitterSpacing')}>
                        <option value="imperial">inches (Imperial)</option>
                        <option value="SI">meters (SI)</option>
                    </select>
                </div>
                <div className="input-field">
                    <label>Drip Line Distance:</label>
                    <input type="text" value={dripLineDistance} onChange={(e) => handleValueChange(e, setDripLineDistance)} />
                    <select value={unit.dripLineDistance} onChange={(e) => handleUnitChange(e, 'dripLineDistance')}>
                        <option value="imperial">inches (Imperial)</option>
                        <option value="SI">meters (SI)</option>
                    </select>
                </div>
                <div className="input-field">
                    <label>Horizontal Distance:</label>
                    <input type="text" value={horizontalDistance} onChange={(e) => handleValueChange(e, setHorizontalDistance)} />
                </div>
                <div className="input-field">
                    <label>Vertical Distance:</label>
                    <input type="text" value={verticalDistance} onChange={(e) => handleValueChange(e, setVerticalDistance)} />
                </div>
                <div className="input-field">
                    <label>Irrigation Efficiency (default 0.95 for drip):</label>
                    <input type="text" value={irrigationEfficiency} onChange={(e) => handleValueChange(e, setIrrigationEfficiency)} />
                </div>
                <div className="input-field">
                    <label>Application Rate:</label>
                    <input type="text" value={applicationRate} readOnly />
                    <select value={unit.applicationRate} onChange={(e) => handleUnitChange(e, 'applicationRate')}>
                        <option value="imperial">in/hr (Imperial)</option>
                        <option value="SI">mm/hour (SI)</option>
                    </select>
                    <button onClick={calculateApplicationRate}>Calculate Application Rate</button>
                </div>
                <div className="input-field">
                    <label>Area:</label>
                    <input type="text" value={area} onChange={(e) => handleValueChange(e, setArea)} />
                </div>
                <button className="submit-button" onClick={handleSubmit}>
                    Submit
                </button>
            </div>
        </div>
    );
};

export default AddMicroIrrigation;
