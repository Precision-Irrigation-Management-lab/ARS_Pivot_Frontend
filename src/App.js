// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Use Routes instead of Switch
import TdrCredForm from './JS/TdrCredForm';
import NodeList from './JS/NodeList';
import NodeForm from './JS/NodeForm';
import VWCChart from './JS/VWCChart';
import NodeStatus from './JS/NodeStatus';
import AddCenterPivot from './JS/AddCenterPivot'; // Import the AddFarmPage component
import Navbar from './JS/Navbar'; // Import the Navbar component
import PivotBuilder from './JS/PivotBuilder';
import Register from './JS/Register';
import Login from './JS/Login';
import AddIrrigationSystem from './JS/AddIrrigationSystem';
import AddFarm from './JS/AddFarm';
import AddMZ from './JS/AddMZ';
import HomePage from './JS/HomePage';
import AddLinearMove from './JS/AddLinearMove';
import MapComponent from './JS/LinearTest';
import AddTDRGateway from './JS/AddTDRGateway';
const App = () => {
  return (
    <Router>
      <Navbar /> {/* Add the Navbar component */}
      <Routes> {/* Use Routes instead of Switch */}
        <Route path="/tdrcred" element={<TdrCredForm />} />
        <Route path="/nodelist" element={<NodeList />} />
        <Route path="/node/:nodeId" element={<NodeForm />} />
        <Route path="/vwcchart" element={<VWCChart />} />
        <Route path="/nodestatus" element={<NodeStatus />} />
        <Route path="/addcenterpivot" element={<AddCenterPivot />} /> {/* Add route for AddFarmPage */}
        <Route path="/pivotbuilder" element={<PivotBuilder />} /> 
        <Route path="/addmz" element={<AddMZ />} />
        <Route path="/add-irrigation-system" element={<AddIrrigationSystem />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/addfarm" element={<AddFarm />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/addlinearmove" element={<AddLinearMove />} />
        <Route path="/lineartest" element={<MapComponent />} />
        <Route path="/addtdrgateway" element={<AddTDRGateway />} />
      </Routes>
    </Router>
  );
};

export default App;
