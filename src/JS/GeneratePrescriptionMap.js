import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, useMap, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
} from "@mui/material";

// Helper: Convert ARGB (e.g. "#FF009F55") to standard hex or rgba string.
const convertColor = (argb) => {
  if (argb && argb.startsWith("#") && argb.length === 9) {
    const alpha = argb.substring(1, 3);
    const rgb = argb.substring(3);
    if (alpha.toUpperCase() === "FF") {
      return `#${rgb}`;
    } else {
      const a = parseInt(alpha, 16) / 255;
      const r = parseInt(argb.substring(3, 5), 16);
      const g = parseInt(argb.substring(5, 7), 16);
      const b = parseInt(argb.substring(7, 9), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
  }
  return argb;
};

// Recenter the map when center changes.
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Legend component: displayed at the top center inside the map container.
const MapLegend = ({ legend }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "white",
        padding: "3px 3px",
        borderRadius: "5px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
        zIndex: 900,
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`,
        gap: "10px",
        width: "calc(100% - 20px)",
        maxWidth: "90%",
        boxSizing: "border-box",
      }}
    >
      {legend.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: "10px",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: item.color,
              marginRight: "5px",
            }}
          ></div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Returns a color based on the watering rate using the legend thresholds.
const getColorForWateringRate = (rate, legend) => {
  if (!legend || rate == null || legend.length === 0) return "#3388ff";
  for (let i = 0; i < legend.length; i++) {
    if (rate <= legend[i].threshold) {
      return legend[i].color;
    }
  }
  return legend[legend.length - 1].color;
};

// Merge watering rate data from XML into GeoJSON and extract the legend.
const mergeGeoJsonWithXML = (geojson, xmlDoc) => {
  const nsList = ["http://tempuri.org/VSSILinearData.xsd", "http://tempuri.org/VSSI.xsd"];
  let ns = nsList.find((namespace) => xmlDoc.getElementsByTagNameNS(namespace, "MapZoneRate").length > 0);
  if (!ns) {
    console.error("No matching namespace found for MapZoneRate.");
    return geojson;
  }

  // Build a lookup from composite key ("BearingSeqNum-DistanceSeqNum") to watering rate.
  const wateringData = {};
  const rateNodes = xmlDoc.getElementsByTagNameNS(ns, "MapZoneRate");
  for (let i = 0; i < rateNodes.length; i++) {
    const node = rateNodes[i];
    const bearingSeq = node.getAttribute("BearingSeqNum");
    const distanceSeq = node.getAttribute("DistanceSeqNum");
    const wateringRate = node.getAttribute("WateringRatePercent");
    //console.log("Watering Rate:", wateringRate);
    if (bearingSeq && distanceSeq && wateringRate != null) {
      const key = `${bearingSeq}-${distanceSeq}`;
      wateringData[key] = parseFloat(wateringRate);
    }
  }
  // Merge watering rates into GeoJSON features.
  geojson.features.forEach((feature) => {
    const bearingSeq =
      feature.properties.linear_zone_bearing?.BearingSeqNum ||
      feature.properties.linear_zone_bearing?.SeqNum||
      feature.properties.BearingSeqNum;
    const distanceSeq =
      feature.properties.linear_zone_distance?.DistanceSeqNum ||
      feature.properties.linear_zone_distance?.SeqNum ||
      feature.properties.DistanceSeqNum
      ;
    if (bearingSeq != null && distanceSeq != null) {
      const key = `${bearingSeq}-${distanceSeq}`;
      if (wateringData[key] !== undefined) {
        feature.properties.wateringratepercent = wateringData[key];
      }
    }
  });

  // Extract legend items from WateringColor nodes.
  const wateringColorNodes = xmlDoc.getElementsByTagNameNS(ns, "WateringColor");
  const legend = [];
  for (let i = 0; i < wateringColorNodes.length; i++) {
    const node = wateringColorNodes[i];
    const wateringPercent = parseFloat(node.getAttribute("WateringPercent"));
    const rawColor = node.getAttribute("Color");
    const color = convertColor(rawColor);
    legend.push({ threshold: wateringPercent, color: color, label: `${wateringPercent}%` });
  }
  legend.sort((a, b) => a.threshold - b.threshold);
  geojson.legend = legend;
  return geojson;
};

const GeneratePrescriptionMap = () => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user"));
  const user_id = user?.user_id || location.state?.user_id;

  const [farms, setFarms] = useState([]);
  const [irrigationSystems, setIrrigationSystems] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [selectedIrrigationSystem, setSelectedIrrigationSystem] = useState("");
  const [date, setDate] = useState("");
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [xmlResponse, setXmlResponse] = useState("");
  const [originalGeoJson, setOriginalGeoJson] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "info" });

  // For displaying additional response data as cards
  const [speed, setSpeed] = useState(null);
  const [maxIrrigationAmount, setMaxIrrigationAmount] = useState(null);

  // Modal states for updating selected polygons
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [newWateringRate, setNewWateringRate] = useState("");

  const mapRef = useRef();
  const geoJsonLayerRef = useRef();
  const featureGroupRef = useRef();

  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/farms/${user_id}`);
        setFarms(response.data);
        if (response.data.length > 0) {
          setSelectedFarm(response.data[0].farmname);
        }
      } catch (error) {
        console.error("Error fetching farms:", error);
        setAlert({
          open: true,
          message: "Failed to load farms. Please try again later.",
          severity: "error",
        });
      }
    };
    fetchFarms();
  }, [user_id]);

  useEffect(() => {
    if (!selectedFarm) return;
    const fetchIrrigationSystems = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/irrigation-systems/${user_id}/${selectedFarm}/`
        );
        setIrrigationSystems(response.data.irrigation_system_names || []);
        if (response.data.irrigation_system_names?.length > 0) {
          setSelectedIrrigationSystem(response.data.irrigation_system_names[0]);
        }
        if (response.data.center) {
          setMapCenter([response.data.center.latitude, response.data.center.longitude]);
        }
      } catch (error) {
        console.error("Error fetching irrigation systems:", error);
        setAlert({
          open: true,
          message: "Failed to load irrigation systems. Please try again later.",
          severity: "error",
        });
      }
    };
    fetchIrrigationSystems();
  }, [selectedFarm, user_id]);

  const handleGenerate = async () => {
    if (!date) {
      setAlert({
        open: true,
        message: "Please select a date.",
        severity: "warning",
      });
      return;
    }
    try {
      const geoJsonEndpoint = `http://localhost:8000/geojson/${user_id}/${selectedFarm}/${selectedIrrigationSystem}`;
      const geoJsonRes = await axios.get(geoJsonEndpoint);
      const geojson = geoJsonRes.data.geojson;
      console.log("GeoJSON data:", geojson)
      setOriginalGeoJson(geojson);

      const xmlEndpoint = `http://localhost:8002/generate-prescription-map?user_id=${user_id}&farmname=${selectedFarm}&irrigation_system_name=${selectedIrrigationSystem}&date=${date}`;
      const xmlRes = await axios.get(xmlEndpoint);
      const { encoded_vri, speed, max_irrigation_amount } = xmlRes.data;

      // Save speed (rounded down) and maxIrrigationAmount.
      if (typeof speed === "number") {
        setSpeed(Math.round(speed));
      }
      if (typeof max_irrigation_amount === "number") {
        setMaxIrrigationAmount(parseFloat(max_irrigation_amount.toFixed(2)));
      }

      if (!encoded_vri) {
        throw new Error("No encoded VRI data received.");
      }

      // Decode the base64 encoded VRI data
      const decodedXml = atob(encoded_vri);
      setXmlResponse(decodedXml);

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(decodedXml, "text/xml");

      const mergedGeoJson = mergeGeoJsonWithXML(geojson, xmlDoc);
      setGeoJsonData(mergedGeoJson);

      if (geoJsonRes.data.center) {
        setMapCenter([geoJsonRes.data.center.latitude, geoJsonRes.data.center.longitude]);
      }

      setAlert({
        open: true,
        message: "Prescription map generated successfully.",
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating prescription map:", error);
      setAlert({
        open: true,
        message: "Failed to generate prescription map. Please try again later.",
        severity: "error",
      });
    }
  };

  const geoJsonStyle = (feature) => {
    const rate = feature.properties.wateringratepercent;
    const fillColor = getColorForWateringRate(rate, geoJsonData?.legend);
    return {
      fillColor,
      weight: 2,
      opacity: 0.1,
      fillOpacity: 0.8,
    };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      // Set up a small "Edit" button in the popup (optional).
      const wateringRate = feature.properties.wateringratepercent ?? "N/A";
      const bearingSeq =
        feature.properties.linear_zone_bearing?.BearingSeqNum ||
        feature.properties.linear_zone_bearing?.SeqNum ||
        feature.properties.BearingSeqNum ||
        "N/A";
      const distanceSeq =
        feature.properties.linear_zone_distance?.DistanceSeqNum ||
        feature.properties.linear_zone_distance?.SeqNum ||
        feature.properties.DistanceSeqNum ||
        "N/A";
      const btnId = `edit-btn-${bearingSeq}-${distanceSeq}`;
      const popupContent = `
        <div>
          <p>
            <strong>Watering Rate:</strong> ${wateringRate}% 
            <button id="${btnId}" style="margin-left:10px; cursor:pointer;">Edit</button>
          </p>
          <p><strong>Bearing SeqNum:</strong> ${bearingSeq}</p>
          <p><strong>Distance SeqNum:</strong> ${distanceSeq}</p>
        </div>
      `;
      layer.bindPopup(popupContent);
      layer.on("popupopen", () => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.addEventListener("click", () => handleEdit(feature, layer));
        }
      });
    }
  };

  const handleEdit = (feature, layer) => {
    // Optional single-feature edit.
    const currentRate = feature.properties.wateringratepercent;
    const input = window.prompt("Enter new watering rate:", currentRate);
    if (input === null) return;
    const newRate = parseFloat(input);
    if (isNaN(newRate)) {
      setAlert({
        open: true,
        message: "Invalid number entered.",
        severity: "error",
      });
      return;
    }
    const bearingSeq =
      feature.properties.linear_zone_bearing?.BearingSeqNum ||
      feature.properties.linear_zone_bearing?.SeqNum||
      feature.properties.BearingSeqNum;
    const distanceSeq =
      feature.properties.linear_zone_distance?.DistanceSeqNum ||
      feature.properties.linear_zone_distance?.SeqNum||
      feature.properties.DistanceSeqNum;
    if (!bearingSeq || !distanceSeq) {
      setAlert({
        open: true,
        message: "Unable to determine feature identifiers.",
        severity: "error",
      });
      return;
    }
    // Update in the XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
    const nsList = ["http://tempuri.org/VSSILinearData.xsd", "http://tempuri.org/VSSI.xsd"];
    const ns = nsList.find((namespace) => xmlDoc.getElementsByTagNameNS(namespace, "MapZoneRate").length > 0);
    if (!ns) {
      setAlert({
      open: true,
      message: "No matching namespace found for MapZoneRate in XML.",
      severity: "error",
      });
      return;
    }
    const rateNodes = xmlDoc.getElementsByTagNameNS(ns, "MapZoneRate");
    let found = false;
    for (let i = 0; i < rateNodes.length; i++) {
      const node = rateNodes[i];
      const bSeq = node.getAttribute("BearingSeqNum");
      const dSeq = node.getAttribute("DistanceSeqNum");
      if (bSeq === String(bearingSeq) && dSeq === String(distanceSeq)) {
        node.setAttribute("WateringRatePercent", newRate);
        found = true;
        break;
      }
    }
    if (!found) {
      setAlert({
        open: true,
        message: "Matching watering rate element not found in XML.",
        severity: "error",
      });
      return;
    }
    const serializer = new XMLSerializer();
    const newXmlString = serializer.serializeToString(xmlDoc);
    setXmlResponse(newXmlString);
    if (originalGeoJson) {
      const updatedGeoJson = mergeGeoJsonWithXML(
        JSON.parse(JSON.stringify(originalGeoJson)),
        xmlDoc
      );
      setGeoJsonData(updatedGeoJson);
    }
    feature.properties.wateringratepercent = newRate;
    layer.setStyle(geoJsonStyle(feature));
    setAlert({
      open: true,
      message: "Watering rate updated successfully.",
      severity: "success",
    });
  };

  const handleRectangleCreated = (e) => {
    const rectangleBounds = e.layer.getBounds();
    const selected = [];

    if (geoJsonData && geoJsonData.features) {
      const map = mapRef.current;
      if (map) {
        // Use intersects to handle both horizontal and vertical selections
        map.eachLayer((layer) => {
          if (layer.feature && layer.getBounds) {
            const layerBounds = layer.getBounds();
            if (rectangleBounds.intersects(layerBounds)) {
              selected.push({ feature: layer.feature, layer });
              // Highlight
              layer.setStyle({ fillColor: "blue", fillOpacity: 0.7 });
            }
          }
        });
      }
    }

    setSelectedFeatures(selected);
    // Show modal if polygons are selected
    if (selected.length > 0) {
      setUpdateModalOpen(true);
    }

    setAlert({
      open: true,
      message: `${selected.length} polygon(s) selected.`,
      severity: "info",
    });

    // Remove rectangle after selection
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  const updateSelectedFeatures = () => {
    if (selectedFeatures.length === 0) {
      setAlert({
        open: true,
        message: "No polygons selected.",
        severity: "warning",
      });
      return;
    }

    const newRate = parseFloat(newWateringRate);
    if (isNaN(newRate)) {
      setAlert({
        open: true,
        message: "Invalid number entered.",
        severity: "error",
      });
      return;
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
    const nsList = ["http://tempuri.org/VSSILinearData.xsd", "http://tempuri.org/VSSI.xsd"];
    const ns = nsList.find((namespace) => xmlDoc.getElementsByTagNameNS(namespace, "MapZoneRate").length > 0);
    if (!ns) {
      setAlert({
      open: true,
      message: "No matching namespace found for MapZoneRate in XML.",
      severity: "error",
      });
      return;
    }
    const rateNodes = xmlDoc.getElementsByTagNameNS(ns, "MapZoneRate");
    let updatedCount = 0;

    selectedFeatures.forEach(({ feature, layer }) => {
      const bearingSeq =
        feature.properties.linear_zone_bearing?.BearingSeqNum ||
        feature.properties.linear_zone_bearing?.SeqNum ||
        feature.properties.BearingSeqNum
        ;
      const distanceSeq =
        feature.properties.linear_zone_distance?.DistanceSeqNum ||
        feature.properties.linear_zone_distance?.SeqNum ||
        feature.properties.DistanceSeqNum;

      if (bearingSeq && distanceSeq) {
        for (let i = 0; i < rateNodes.length; i++) {
          const node = rateNodes[i];
          const bSeq = node.getAttribute("BearingSeqNum");
          const dSeq = node.getAttribute("DistanceSeqNum");
          if (bSeq === String(bearingSeq) && dSeq === String(distanceSeq)) {
            node.setAttribute("WateringRatePercent", newRate);
            feature.properties.wateringratepercent = newRate;
            layer.setStyle(geoJsonStyle(feature));
            updatedCount++;
            break;
          }
        }
      }
    });

    const serializer = new XMLSerializer();
    const newXmlString = serializer.serializeToString(xmlDoc);
    setXmlResponse(newXmlString);

    if (originalGeoJson) {
      const updatedGeoJson = mergeGeoJsonWithXML(
        JSON.parse(JSON.stringify(originalGeoJson)),
        xmlDoc
      );
      setGeoJsonData(updatedGeoJson);
    }

    setAlert({
      open: true,
      message: `Updated watering rate for ${updatedCount} polygons.`,
      severity: "success",
    });

    // Close modal and reset
    setSelectedFeatures([]);
    setUpdateModalOpen(false);
    setNewWateringRate("");
  };

  const handleUpdateModalClose = () => {
    setUpdateModalOpen(false);
    // Reset styles if user cancels
    selectedFeatures.forEach(({ feature, layer }) => {
      layer.setStyle(geoJsonStyle(feature));
    });
    setSelectedFeatures([]);
    setNewWateringRate("");
  };

  const handleDownload = () => {
    if (!xmlResponse) {
      setAlert({
        open: true,
        message: "No XML data available to download.",
        severity: "warning",
      });
      return;
    }
    const blob = new Blob([xmlResponse], { type: "text/xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedFarm}_${selectedIrrigationSystem}_${date}.vri`;
    link.click();
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  return (
    <Container style={{ position: "relative", marginBottom: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Generate Prescription Map
      </Typography>
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="farmname-label">Farm Name</InputLabel>
          <Select
            labelId="farmname-label"
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
          >
            {farms.map((farm) => (
              <MenuItem key={farm.farmname} value={farm.farmname}>
                {farm.farmname}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="irrigation-system-label">Irrigation System</InputLabel>
          <Select
            labelId="irrigation-system-label"
            value={selectedIrrigationSystem}
            onChange={(e) => setSelectedIrrigationSystem(e.target.value)}
          >
            {irrigationSystems.map((system) => (
              <MenuItem key={system} value={system}>
                {system}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="date"
          label="Date"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={handleGenerate}>
          Generate Prescription Map
        </Button>
      </Box>
      {(speed !== null || maxIrrigationAmount !== null) && (
  <Box
    display="flex"
    flexWrap="wrap"
    justifyContent="center"
    alignItems="center"
    gap={2}
    mt={2}
  >
    {speed !== null && (
      <Card sx={{ minWidth: 200, justifyContent: 'center' }}>
        <CardContent>
        <Typography variant="h6" sx={{ color: 'blue' }}>Speed</Typography>
        <Typography variant="body1" sx={{ color: 'red' }}>{speed} %</Typography>
        </CardContent>
      </Card>
    )}
    {maxIrrigationAmount !== null && (
      <Card sx={{ minWidth: 200,justifyContent: 'center' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: 'blue' }}>Max Irrigation</Typography>
          <Typography variant="body1" sx={{ color: 'red' }}>{maxIrrigationAmount} cm</Typography>
        </CardContent>
      </Card>
    )}
  </Box>
)}
      {geoJsonData && (
        <Box mt={4} mb={4} position="relative">
          {/* Cards showing speed and max irrigation amount */}
         

          <MapContainer
            center={mapCenter}
            zoom={18}
            maxZoom={22}
            style={{ height: `${window.innerHeight * 0.8}px`, width: "100%" }}
            ref={mapRef}
          >
            <RecenterMap center={mapCenter} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles © Esri"
            />
            <GeoJSON
              data={geoJsonData}
              style={geoJsonStyle}
              onEachFeature={onEachFeature}
              ref={geoJsonLayerRef}
            />
            {geoJsonData.legend && <MapLegend legend={geoJsonData.legend} />}

            <FeatureGroup ref={featureGroupRef}>
              <EditControl
                position="topright"
                onCreated={handleRectangleCreated}
                draw={{
                  rectangle: true,
                  circle: false,
                  polyline: false,
                  polygon: false,
                  marker: false,
                  circlemarker: false,
                }}
                edit={{
                  edit: false,
                  remove: false,
                }}
              />
            </FeatureGroup>
          </MapContainer>

          <Box mt={2} mb={2} display="flex" justifyContent="center">
            <Button variant="contained" color="secondary" onClick={handleDownload}>
              Download XML (.vri)
            </Button>
          </Box>
        </Box>
      )}

      {/* Modal for updating selected polygons */}
      <Dialog open={updateModalOpen} onClose={handleUpdateModalClose}>
        <DialogTitle>Update Selected Polygons</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have selected {selectedFeatures.length} polygon(s). Enter a new watering rate to
            update them.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Watering Rate (%)"
            type="number"
            fullWidth
            variant="outlined"
            value={newWateringRate}
            onChange={(e) => setNewWateringRate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUpdateModalClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={updateSelectedFeatures} color="primary" variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GeneratePrescriptionMap;