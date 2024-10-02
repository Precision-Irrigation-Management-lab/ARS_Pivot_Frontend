import React, { useState } from 'react';
import '../CSS/PivotBuilder.css';

const PivotBuilder = () => {
  const [formData, setFormData] = useState({
    pivotLabel: '',
    addToYear: '2024',
    typeOfVriSystem: 'VRI Zone Control',
    typeOfControlPanel: 'Pro2 panel',
    rtuId: '',
    comPortNumber: '',
    units: 'Imperial',
    centerPivotIrrigatesFullCircle: true,
    pivotRadius: 0,
    numberOfSprinklerZones: 0,
    spacingBetweenNozzles: 0,
    angleOfSectors: 2,
    initialAngleReverse: 360,
    finalAngleReverse: 0,
    maxSpeed: 0,
    waterApplicationAtMaxSpeed: 0,
    pivotPointAboveSeaLevel: 0,
    pivotPointLongitude: {
      degrees: 0,
      minutes: 0,
      seconds: 0,
      direction: 'W'
    },
    pivotPointLatitude: {
      degrees: 0,
      minutes: 0,
      seconds: 0,
      direction: 'N'
    },
    climate: '',
    propertiesOfSprinklerZones: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleNestedChange = (e, field) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [field]: { ...formData[field], [name]: value }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form data submitted:', formData);
  };

  return (
    <div className="pivot-builder">
      <h2>Pivot Builder</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Select action to be performed
            <div>
              <input type="radio" name="action" value="addNew" defaultChecked /> Add new pivot
              <input type="radio" name="action" value="modifyExisting" /> Modify existing pivot
            </div>
          </label>
        </div>
        <div className="form-group">
          <label>
            Pivot's label
            <input type="text" name="pivotLabel" value={formData.pivotLabel} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Add pivot to year
            <select name="addToYear" value={formData.addToYear} onChange={handleChange}>
              <option value="2024">2024</option>
              {/* Add more years as needed */}
            </select>
          </label>
        </div>
        <div className="form-group">
          <label>
            Import data from existing pivot
            <div>
              <input type="text" name="importData" onChange={handleChange} />
              <button type="button">Import data</button>
            </div>
          </label>
        </div>
        <div className="form-group">
          <label>
            Type of Variable Rate Irrigation (VRI) System
            <select name="typeOfVriSystem" value={formData.typeOfVriSystem} onChange={handleChange}>
              <option value="VRI Zone Control">VRI Zone Control</option>
              {/* Add more options as needed */}
            </select>
          </label>
        </div>
        <div className="form-group">
          <label>
            Type of Control Panel
            <select name="typeOfControlPanel" value={formData.typeOfControlPanel} onChange={handleChange}>
              <option value="Pro2 panel">Pro2 panel</option>
              {/* Add more options as needed */}
            </select>
          </label>
        </div>
        <div className="form-group">
          <label>
            RTU ID
            <input type="text" name="rtuId" value={formData.rtuId} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            COM Port Number
            <input type="text" name="comPortNumber" value={formData.comPortNumber} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Units
            <select name="units" value={formData.units} onChange={handleChange}>
              <option value="Imperial">Imperial</option>
              <option value="Metric">Metric</option>
            </select>
          </label>
        </div>
        <div className="form-group">
          <label>
            Center pivot irrigates a full circle
            <input type="checkbox" name="centerPivotIrrigatesFullCircle" checked={formData.centerPivotIrrigatesFullCircle} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Pivot's radius (ft)
            <input type="number" name="pivotRadius" value={formData.pivotRadius} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Number of sprinkler zones
            <input type="number" name="numberOfSprinklerZones" value={formData.numberOfSprinklerZones} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Spacing between nozzles (ft)
            <input type="number" name="spacingBetweenNozzles" value={formData.spacingBetweenNozzles} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Angle of sectors (deg)
            <input type="number" name="angleOfSectors" value={formData.angleOfSectors} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Initial angle in reverse (counter-clockwise)
            <input type="number" name="initialAngleReverse" value={formData.initialAngleReverse} onChange={handleChange} disabled />
          </label>
        </div>
        <div className="form-group">
          <label>
            Final angle in reverse (counter-clockwise)
            <input type="number" name="finalAngleReverse" value={formData.finalAngleReverse} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Max. Speed (ft/min)
            <input type="number" name="maxSpeed" value={formData.maxSpeed} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Water Application at max. speed (in)
            <input type="number" name="waterApplicationAtMaxSpeed" value={formData.waterApplicationAtMaxSpeed} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Pivot's point above sea level (ft)
            <input type="number" name="pivotPointAboveSeaLevel" value={formData.pivotPointAboveSeaLevel} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Pivot's point longitude
            <div>
              <input type="number" name="degrees" value={formData.pivotPointLongitude.degrees} onChange={(e) => handleNestedChange(e, 'pivotPointLongitude')} /> deg
              <input type="number" name="minutes" value={formData.pivotPointLongitude.minutes} onChange={(e) => handleNestedChange(e, 'pivotPointLongitude')} /> min
              <input type="number" name="seconds" value={formData.pivotPointLongitude.seconds} onChange={(e) => handleNestedChange(e, 'pivotPointLongitude')} /> sec
              <select name="direction" value={formData.pivotPointLongitude.direction} onChange={(e) => handleNestedChange(e, 'pivotPointLongitude')}>
                <option value="W">W</option>
                <option value="E">E</option>
              </select>
            </div>
          </label>
        </div>
        <div className="form-group">
          <label>
            Pivot's point latitude
            <div>
              <input type="number" name="degrees" value={formData.pivotPointLatitude.degrees} onChange={(e) => handleNestedChange(e, 'pivotPointLatitude')} /> deg
              <input type="number" name="minutes" value={formData.pivotPointLatitude.minutes} onChange={(e) => handleNestedChange(e, 'pivotPointLatitude')} /> min
              <input type="number" name="seconds" value={formData.pivotPointLatitude.seconds} onChange={(e) => handleNestedChange(e, 'pivotPointLatitude')} /> sec
              <select name="direction" value={formData.pivotPointLatitude.direction} onChange={(e) => handleNestedChange(e, 'pivotPointLatitude')}>
                <option value="N">N</option>
                <option value="S">S</option>
              </select>
            </div>
          </label>
        </div>
        <div className="form-group">
          <label>
            Climate
            <input type="text" name="climate" value={formData.climate} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Properties of Sprinkler Zones
            <textarea name="propertiesOfSprinklerZones" value={formData.propertiesOfSprinklerZones} onChange={handleChange}></textarea>
          </label>
        </div>
        <button type="submit">Save pivot's properties</button>
      </form>
    </div>
  );
};

export default PivotBuilder;
