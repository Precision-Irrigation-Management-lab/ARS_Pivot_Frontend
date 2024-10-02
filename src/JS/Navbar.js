import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';
import '../CSS/Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    handleStorageChange(); // Check initial state
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-login', handleStorageChange); // Listen for custom event

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setDropdownVisible(false); // Close the dropdown
    navigate('/login');
    window.dispatchEvent(new Event('user-logout')); // Trigger a custom event
  };

  const handleDropdownClick = () => {
    setDropdownVisible(false); // Close the dropdown
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  return (
    <nav>
      <ul>
        {user ? (
          <>
            <li>
              <Link to="/nodelist">NodeList</Link>
            </li>
            <li>
              <Link to="/lineartest">Linear test</Link>
            </li>
            <li>
              <Link to="/vwcchart">VWCChart</Link>
            </li>
            <li>
              <Link to="/nodestatus">NodeStatus</Link>
            </li>
            <li>
              <Link to="/pivotbuilder">PivotBuilder</Link>
            </li>
            <li>
              <Link to="/addmz">AddMZ</Link>
            </li>
            <li className="dropdown" ref={dropdownRef}>
              <button className="dropbtn" onClick={toggleDropdown}>
                <FontAwesomeIcon icon={faUser} />
              </button>
              <div className={`dropdown-content ${dropdownVisible ? 'show' : ''}`}>
                <Link to="/addfarm" onClick={handleDropdownClick}>Add Farm</Link>
                <Link to="/add-irrigation-system" onClick={handleDropdownClick}>Add Irrigation System</Link>
                <Link to="/addcrop" onClick={handleDropdownClick}>Add Crop</Link>
                <Link to="/addtdrgateway" onClick={handleDropdownClick}>Add TDR's</Link>
                <Link to="/addirt" onClick={handleDropdownClick}>Add IRT</Link>
                <Link to="/settings" onClick={handleDropdownClick}>Settings</Link>
                <button onClick={handleLogout}>Logout</button>
              </div>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
