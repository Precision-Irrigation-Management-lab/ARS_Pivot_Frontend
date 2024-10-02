import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import '../CSS/NodeForm.css';

const NodeForm = () => {
  const { nodeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user'));
  const userid = user ? user.user_id : null;
  const [formData, setFormData] = useState({
    lat: '',
    long: '',
    depths: [''],
    fc: [''],
    wp: [''],
    li: ['']
  });
  const [gatewayId, setGatewayId] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [previousPage, setPreviousPage] = useState('');

  useEffect(() => {
    const stateGatewayId = location.state?.gatewayId;
    const statePreviousPage = location.state?.previousPage;

    if (stateGatewayId) {
      setGatewayId(stateGatewayId);
    } else {
      setResponseMessage('Gateway ID not provided.');
    }

    if (statePreviousPage) {
      setPreviousPage(statePreviousPage);
    }
  }, [location.state]);

  const calculateLayerOfInfluence = (depths) => {
    const n = depths.length;
    const li = depths.map((depth, i) => {
      let si;
      if (i === 0) {
        si =  2*(depths[i + 1] - depths[i]) / 2;
      }
     else if (i === n - 1) {
        si = 2*(depths[i - 1] - depths[i] / 2);
      } 
      else {
        si = (depths[i + 1] - depths[i - 1]) / 2;
      }
      return si;
    });
    return li;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const [field, index] = name.split('-');
    setFormData((prevData) => {
      const newArray = [...prevData[field]];
      newArray[index] = value;
      const updatedFormData = { ...prevData, [field]: newArray };

      if (field === 'depths') {
        const depths = newArray.map(Number);
        const li = calculateLayerOfInfluence(depths);
        updatedFormData.li = li.map(String);
      }

      return updatedFormData;
    });
  };

  const handleAddField = (field) => {
    setFormData((prevData) => {
      const updatedFormData = {
        ...prevData,
        [field]: [...prevData[field], '']
      };

      if (field === 'depths') {
        const depths = updatedFormData.depths.map(Number);
        const li = calculateLayerOfInfluence(depths);
        updatedFormData.li = li.map(String);
      }

      return updatedFormData;
    });
  };

  const handleDeleteField = (field, index) => {
    setFormData((prevData) => {
      const newArray = prevData[field].filter((_, i) => i !== index);
      const updatedFormData = { ...prevData, [field]: newArray };

      if (field === 'depths') {
        const depths = newArray.map(Number);
        const li = calculateLayerOfInfluence(depths);
        updatedFormData.li = li.map(String);
      }

      return updatedFormData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = 'http://127.0.0.1:8002/node/';
    const postData = {
      user_id: parseInt(userid, 10),  // Ensure userid is an integer
      nodeid: parseInt(nodeId, 10),  // Ensure nodeid is an integer
      gatewayid: parseInt(gatewayId, 10), // Ensure gatewayid is an integer
      lat: parseFloat(formData.lat),
      long: parseFloat(formData.long),
      sensoraddress: formData.depths.reduce((acc, depth, index) => {
        acc[index + 1] = depth;
        return acc;
      }, { '@': 'node info' }),
      fc: formData.fc.reduce((acc, value, index) => {
        acc[(index + 1).toFixed(1)] = parseFloat(value);
        return acc;
      }, {}),
      wp: formData.wp.reduce((acc, value, index) => {
        acc[(index + 1).toFixed(1)] = parseFloat(value);
        return acc;
      }, {}),
      li: formData.li.reduce((acc, value, index) => {
        acc[(index + 1).toFixed(1)] = parseFloat(value);
        return acc;
      }, {})
    };
    console.log('Post Data:', postData);

    // Ensure gatewayid is valid before making the API call
    if (isNaN(gatewayId)) {
      setResponseMessage('Invalid gatewayid. Please check the nodeId or try again later.');
      return;
    }

    try {
      const response = await axios.post(endpoint, postData);
      console.log('API Response:', response.data);
      setResponseMessage('Data submitted successfully!');
      if (previousPage === '/vwcchart') {
        navigate('/vwcchart');
      } else {
        navigate('/addtdrgateway');
      }
    } catch (error) {
      setResponseMessage('Error submitting data.');
      console.error('Error submitting data:', error);
    }
  };

  return (
    <div className="node-form">
      <h2>Add Data for Node ID: {nodeId}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            Latitude:
            <input
              type="text"
              name="lat"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            Longitude:
            <input
              type="text"
              name="long"
              value={formData.long}
              onChange={(e) => setFormData({ ...formData, long: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-group input-group">
          <label>Depths:</label>
          {formData.depths.map((depth, index) => (
            <div key={index} className="input-with-button">
              <span>Depth {index + 1}:</span>
              <input
                type="text"
                name={`depths-${index}`}
                value={depth}
                onChange={handleChange}
                required
              />
              {index !== 0 && (
                <button type="button" className="delete-button" onClick={() => handleDeleteField('depths', index)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
              {index === formData.depths.length - 1 && (
                <button type="button" onClick={() => handleAddField('depths')}>
                  Add Depth
                </button>
              )}
            </div>
          ))}
        </div>
        {['fc', 'wp', 'li'].map((field) => (
          <div className="form-group input-group" key={field}>
            <label>{field.toUpperCase()}:</label>
            {formData[field].map((value, index) => (
              <div key={`${field}-${index}`} className="input-with-button">
                <span>{field.toUpperCase()} {index + 1}:</span>
                <input
                  type="text"
                  name={`${field}-${index}`}
                  value={value}
                  onChange={handleChange}
                  required
                />
                {index !== 0 && (
                  <button type="button" className="delete-button" onClick={() => handleDeleteField(field, index)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
                {index === formData[field].length - 1 && (
                  <button type="button" onClick={() => handleAddField(field)}>
                    Add {field.toUpperCase()}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
        <button type="submit" className="submit-button">Submit</button>
      </form>
      {responseMessage && <p>{responseMessage}</p>}
    </div>
  );
};

export default NodeForm;
