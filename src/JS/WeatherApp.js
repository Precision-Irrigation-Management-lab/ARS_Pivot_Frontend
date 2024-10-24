import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Tabs, Tab } from '@mui/material';
import { Card, CardContent } from '@mui/material';
import WbSunnyIcon from '@mui/icons-material/WbSunny'; // Icon for temperature/sun
import AirIcon from '@mui/icons-material/Air'; // Icon for wind
import OpacityIcon from '@mui/icons-material/Opacity'; // Icon for humidity
import CloudIcon from '@mui/icons-material/Cloud'; // Icon for cloud cover
import ShowerIcon from '@mui/icons-material/Shower'; // Icon for rain
import PressureIcon from '@mui/icons-material/Compress'; // Icon for pressure

const WeatherApp = ({ center }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [hourlyUnits, setHourlyUnits] = useState({});
  const [dailyUnits, setDailyUnits] = useState({});
  const [variables, setVariables] = useState([]);
  const [selectedVariable, setSelectedVariable] = useState('');
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState('current'); // Default to Current tab
  const [maxValue, setMaxValue] = useState(null);
  const [minValue, setMinValue] = useState(null);

  const hourly_variables = [
    'temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 'precipitation_probability', 'precipitation', 
    'rain', 'showers', 'snowfall', 'snow_depth', 'pressure_msl', 'cloud_cover', 'evapotranspiration', 
    'et0_fao_evapotranspiration', 'vapour_pressure_deficit', 'soil_temperature_0cm', 'soil_temperature_6cm', 
    'soil_temperature_18cm', 'soil_temperature_54cm', 'soil_moisture_0_to_1cm', 'soil_moisture_1_to_3cm',
    'soil_moisture_3_to_9cm', 'soil_moisture_9_to_27cm', 'soil_moisture_27_to_81cm'
  ];
  const current = ['temperature_2m','relative_humidity_2m','apparent_temperature','precipitation','rain','cloud_cover','surface_pressure','wind_speed_10m','wind_direction_10m','wind_gusts_10m'];
  const daily = ['temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max', 'apparent_temperature_min', 'precipitation_sum', 'rain_sum', 'snowfall_sum', 'precipitation_probability_max', 'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant', 'shortwave_radiation_sum', 'et0_fao_evapotranspiration'];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    // The useEffect will handle updating the first variable selection when switching tabs
  };

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if needed
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // This gives the date in YYYY-MM-DD format
  };
  
  
  useEffect(() => {
    if (!center || isNaN(center[0]) || isNaN(center[1])) {
      setError('Invalid center coordinates for weather data.');
      return;
    }

    const fetchWeather = async () => {
      const params = {
        latitude: center[0],
        longitude: center[1],
        current_weather: current.join(','),
        hourly: hourly_variables.join(','),
        daily: daily.join(','),
        forecast_day: '16',
        timezone: 'auto',
      };
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${params.latitude}&longitude=${params.longitude}&current=${params.current_weather}&hourly=${params.hourly}&daily=${params.daily}&timezone=${params.timezone}&forecast_days=${params.forecast_day}`;

      try {
        const response = await fetch(url);
        const data = await response.json();
        setWeatherData(data);

        // Prepare hourly data
        const times = data.hourly.time;
        const variablesData = Object.keys(data.hourly).filter((key) => key !== 'time');
        const hourly = times.map((time, index) => {
          const entry = { time };
          variablesData.forEach((variable) => {
            entry[variable] = data.hourly[variable][index];
          });
          return entry;
        });

        setHourlyData(hourly);
        setVariables(variablesData);
        setSelectedVariable(variablesData[0]);
        setHourlyUnits(data.hourly_units);

        // Prepare daily data
        const dailyTimes = data.daily.time;
        const dailyVariablesData = Object.keys(data.daily).filter((key) => key !== 'time');
        const daily = dailyTimes.map((time, index) => {
          const entry = { time };
          dailyVariablesData.forEach((variable) => {
            entry[variable] = data.daily[variable][index];
          });
          return entry;
        });

        setDailyData(daily);
        setDailyUnits(data.daily_units);

        // Extract unique dates
        const uniqueDates = [...new Set(times.map((time) => time.split('T')[0]))];
        const today = getTodayDate();
        //console.log(today)
        
        // Check if today's date exists in the uniqueDates array
        if (uniqueDates.includes(today)) {
          setDates(uniqueDates);
          setSelectedDate(today);  // Set today's date if available
          //console.log(selectedDate)
        } 
        else {
          setDates(uniqueDates);
          setSelectedDate(uniqueDates[0]);  // Fallback to the first available date if today is not in uniqueDates
        }
        

        setLoading(false);
      } catch (error) {
        setError('Failed to fetch weather data');
        setLoading(false);
      }
    };

    fetchWeather();
  }, [center]);

  useEffect(() => {
    if (weatherData) {
      if (selectedTab === 'hourly') {
        const hourlyVars = Object.keys(weatherData.hourly).filter(key => key !== 'time');
        setVariables(hourlyVars);
        setSelectedVariable(hourlyVars[0]); // Automatically select the first variable for hourly
      } else if (selectedTab === 'daily') {
        const dailyVars = Object.keys(weatherData.daily).filter(key => key !== 'time');
        setVariables(dailyVars);
        setSelectedVariable(dailyVars[0]); // Automatically select the first variable for daily
      }
    }
  }, [selectedTab, weatherData]);

  useEffect(() => {
    if (
      chartRef.current &&
      ((selectedTab === 'hourly' && hourlyData.length) ||
        (selectedTab === 'daily' && dailyData.length)) &&
      selectedVariable &&
      selectedDate
      
    ) {
      const chart = echarts.init(chartRef.current);
      console.log(selectedDate)
      // Helper function to get day of the week

  
      // Filter data based on the selected tab
      const filteredData =
        selectedTab === 'hourly'
          ? hourlyData.filter((entry) => entry.time.startsWith(selectedDate))
          : dailyData; // For daily data, no time filtering is needed
  
      const variableUnit = selectedTab === 'hourly' ? hourlyUnits[selectedVariable] : dailyUnits[selectedVariable];
  
      // Calculate max and min values safely
      const variableData = filteredData.map((entry) => entry[selectedVariable]);
      const maxIndex = variableData.indexOf(Math.max(...variableData));
      const minIndex = variableData.indexOf(Math.min(...variableData));
  
      // Ensure maxIndex and minIndex are valid before accessing time
      if (filteredData[maxIndex]) {
        setMaxValue({
          value: variableData[maxIndex],
          units: variableUnit,
          time: filteredData[maxIndex].time,
        });
      }
  
      if (filteredData[minIndex]) {
        setMinValue({
          value: variableData[minIndex],
          units: variableUnit,
          time: filteredData[minIndex].time,
        });
      }
  
      const option = {
        title: {
          text: `Weather Data`,
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const time = params[0].axisValue;
            const value = params[0].data;
  
            // Determine if we're in hourly or daily mode and get the correct day of the week
            const dateForDay = selectedTab === 'hourly' ? selectedDate : time.split('T')[0];
            const formattedDate = formatDate(dateForDay);
            const dayOfWeek = getDayOfWeek(dateForDay); 
      
            const dateLabel = selectedTab === 'hourly'
              ? `Day: <span style="color: blue;">${dayOfWeek}</span><br/>Date: <span style="color: blue;">${formattedDate}</span><br/>Time: <span style="color: blue;">${time.split('T')[1]}</span>`
              : `Day: <span style="color: blue;">${dayOfWeek}</span><br/>Date: <span style="color: blue;">${formattedDate}</span>`;
      
            // Display the value in blue
            return `
              ${dateLabel}<br/>
              ${selectedVariable}: <span style="color: blue;">${value} ${variableUnit}</span>
            `;
          },
        },
  
        xAxis: {
          type: 'category',
          axisLabel: {
            formatter: (value) => {
                const formattedDate = formatDate(value.split('T')[0]);
                return selectedTab === 'hourly'
                  ? `${formattedDate}\n${getDayOfWeek(selectedDate)}\n${value.split('T')[1]}` 
                  : `${getDayOfWeek(formattedDate)}\n${formattedDate}`;
            },
          },
          data: filteredData.map((entry) =>
            selectedTab === 'hourly'
              ? entry.time // Use time for hourly data
              : entry.time // Use full date for daily data
          ),
        },
        yAxis: {
          type: 'value',
          name: selectedVariable,
          nameLocation: 'center',
          nameTextStyle: {
            padding: [0, 0, 38, 0],
            overflow: 'break',
          },
          axisLabel: {
            formatter: `{value} ${variableUnit}`, // Display units here
          },
        },
        grid: {
          left: '17%', // Add padding to prevent cutting off the y-axis text
          right: '10%',
          bottom: '15%',
          top: '15%',
        },
        series: [
          {
            data: filteredData.map((entry) => entry[selectedVariable]),
            type: 'line',
            smooth: true,
          },
        ],
      };
  
      chart.setOption(option);
      const handleResize = () => {
        chart.resize(); // Resize the chart when the window is resized
      };
  
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.dispose(); // Clean up the chart instance
      };
    }
  }, [hourlyData, dailyData, selectedVariable, selectedDate, hourlyUnits, dailyUnits, selectedTab]);
  

  if (loading) return <Typography>Loading weather data...</Typography>;
  if (error) return <Typography>{error}</Typography>;

  return (
<Box className="weather-data" p={2} bgcolor="#f9fafb" borderRadius={0.5} boxShadow={"inset 0 0 15px rgba(0, 0, 0, 0.1)"} padding={"15px"} minHeight ={"500px"} borderLeft= {"2px solid #007bff"}>
  
  {/* Tabs should be placed at the top and fixed */}
  <Tabs
    value={selectedTab}
    onChange={handleTabChange}
    variant="fullWidth"  // Ensure the tabs cover the full width
    sx={{
      '& .MuiTabs-flexContainer': {
        borderBottom: '2px solid #ddd',  // Border under tabs to separate them from the content below
      },
      '& .MuiTabs-indicator': { display: 'none' },  // Hide the default underline indicator
      '& .MuiTab-root': {
        backgroundColor: '#f0f0f0',  // Default background for non-selected tabs
        color: '#000',  // Default text color for non-selected tabs
        borderRadius: '8px 8px 0 0',  // Rounded top corners for tabs
        padding: '10px 20px',  // Padding inside each tab
        transition: 'background-color 0.3s, box-shadow 0.3s',
        zIndex: 1,  // Default z-index for non-selected tabs
      },
      '& .MuiTab-root.Mui-selected': {
        backgroundColor: '#007bff',  // Blue background for selected tab
        color: '#fff',  // White text for selected tab
        borderRadius: '8px 8px 0 0',  // Keep rounded corners
        borderBottom: 'none',  // No bottom border to make it seamless
        zIndex: 2,  // Make the selected tab appear on top of the others
      },
      // This ensures there's no gap between tabs and content
      marginBottom: '-2px',  // Overlap the bottom border of the tab with the content to make it continuous
    }}
  >
    <Tab label="Current" value="current" />
    <Tab label="Hourly" value="hourly" />
    <Tab label="Daily" value="daily" />
  </Tabs>

  {/* Ensure this content below doesn't move the tabs */}
  <Box mt={2}> 
    {selectedTab === 'current' && weatherData && (
    <Box className="weather-data" p={2} bgcolor="#f9fafb" borderRadius={0.5} boxShadow={"inset 0 0 15px rgba(0, 0, 0, 0.1)"} padding={"15px"} minHeight={"500px"} borderLeft={"2px solid #007bff"}>
    <Typography variant="h6" textAlign="center">Weather Information</Typography>

    {/* Display Current Weather in Cards */}
    {selectedTab === 'current' && weatherData && (
      <Box 
        display="flex" 
        flexWrap="wrap" 
        justifyContent="center" 
        alignItems="center" 
        gap={2} 
        mt={2}
      >
        {/* Create a consistent card size and center content */}
        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WbSunnyIcon fontSize="large" color="primary" />
              <Typography variant="h6">Temperature</Typography>
              <Typography>{weatherData.current.temperature_2m}°C</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AirIcon fontSize="large" color="primary" />
              <Typography variant="h6">Wind Speed</Typography>
              <Typography>{weatherData.current.wind_speed_10m} m/s</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AirIcon fontSize="large" color="primary" />
              <Typography variant="h6">Wind Direction</Typography>
              <Typography>{weatherData.current.wind_direction_10m}°</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <OpacityIcon fontSize="large" color="primary" />
              <Typography variant="h6">Humidity</Typography>
              <Typography>{weatherData.current.relative_humidity_2m}%</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CloudIcon fontSize="large" color="primary" />
              <Typography variant="h6">Cloud Cover</Typography>
              <Typography>{weatherData.current.cloud_cover}%</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ShowerIcon fontSize="large" color="primary" />
              <Typography variant="h6">Rain</Typography>
              <Typography>{weatherData.current.rain} mm/h</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box flexBasis="calc(33.33% - 16px)">
          <Card sx={{ height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PressureIcon fontSize="large" color="primary" />
              <Typography variant="h6">Pressure</Typography>
              <Typography>{weatherData.current.surface_pressure} hPa</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    )}
  </Box>
    )}

    {selectedTab !== 'current' && (
      <>
        {/* Dropdown for variable selection (only for hourly and daily) */}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Select Variable</InputLabel>
          <Select
            value={selectedVariable}
            label="Select Variable"
            onChange={(e) => setSelectedVariable(e.target.value)}
          >
            {variables.map((variable) => (
              <MenuItem key={variable} value={variable}>
                {variable}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Dropdown for date selection (only show in hourly mode) */}
        {selectedTab === 'hourly' && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Date</InputLabel>
            <Select
              value={selectedDate}
              label="Select Date"
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {dates.map((date) => (
                <MenuItem key={date} value={date}>
                  {formatDate(date)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={4}>
            {maxValue && (
              <Card sx={{ width: '45%', textAlign: 'center', boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                <CardContent  sx={{ whiteSpace: 'pre-line' }} >
                  <Typography variant="h6" color="textSecondary" sx={{ fontWeight: 'bold' }}>Maximum</Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{maxValue.value} {maxValue.units}</Typography>
                  <Typography variant="caption" >{`Date: ${formatDate(maxValue.time.split('T')[0])}\n`}</Typography>
                  <Typography variant="caption">{`Day: ${getDayOfWeek(maxValue.time.split('T')[0])}\n`}</Typography>
                  {selectedTab === 'hourly' && (
                    <Typography variant="caption">{`Time: ${maxValue.time.split('T')[1]}`}</Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {minValue && (
              <Card sx={{ width: '45%', textAlign: 'center', boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                <CardContent sx={{ whiteSpace: 'pre-line' }}>
                  <Typography variant='h6' color="textSecondary" sx={{ fontWeight: 'bold' }}>Minimum</Typography>
                  <Typography variant='h6' color="primary" sx={{ fontWeight: 'bold' }}>{minValue.value} {minValue.units}</Typography>
                  <Typography variant='caption'>{`Date: ${formatDate(minValue.time.split('T')[0])}\n`}</Typography>
                  <Typography variant='caption'>{`Day: ${getDayOfWeek(minValue.time.split('T')[0])}\n`}</Typography>
                  {selectedTab === 'hourly' && (
                    <Typography variant="caption">{`Time: ${minValue.time.split('T')[1]}`}</Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
      
        {/* Chart Container */}
        <Box
          sx={{
            mt: 4,
            width: '100%',
            height: '400px',
            paddingRight: '0px',
            paddingLeft: '0px',
          }}
        >
          <div
            ref={chartRef}
            style={{
              width: '100%',
              height: '100%',
              padding: '0px',
              boxSizing: 'border-box',
            }}
          ></div>
        </Box>
      </>
    )}
  </Box>
</Box>

  );
};

export default WeatherApp;
