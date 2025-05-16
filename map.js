import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);
let timeFilter = -1;
// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoibWljaGFlbGx1byIsImEiOiJjbWFvdjN5NDgwOW5jMmtvOGM2dmZ0ZDc2In0.nmNhVoEtWCuHBMyQtYcCDw';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});
const svg = d3.select('#map').select('svg');

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Match your JSON key names
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}
function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes); // hour, minute
    return date.toLocaleString('en-US', { timeStyle: 'short' });
}
function computeStationTraffic(stations, trips) {
    const departures = d3.rollup(
      trips,
      v => v.length,
      d => d.start_station_id
    );
  
    const arrivals = d3.rollup(
      trips,
      v => v.length,
      d => d.end_station_id
    );
  
    return stations.map((station) => {
      const id = station.short_name;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });
}
function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}
function filterTripsByTime(trips, timeFilter) {
    return timeFilter === -1
      ? trips
      : trips.filter((trip) => {
          const start = minutesSinceMidnight(trip.started_at);
          const end = minutesSinceMidnight(trip.ended_at);
          return Math.abs(start - timeFilter) <= 60 || Math.abs(end - timeFilter) <= 60;
        });
}
map.on('load', async () => {
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('time-display');
    const anyTimeLabel = document.getElementById('any-time');
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });
  
    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route', 
      paint: {
        'line-color': '#32D400',  
        'line-width': 5,        
        'line-opacity': 0.6       
      }
    });
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
          'line-color': '#0074D9', 
          'line-width': 4,
          'line-opacity': 0.6,
        }
    });
    let jsonData;
    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

    // Await JSON fetch
        const jsonData = await d3.json(jsonurl);
        const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
        const trips = await d3.csv(
            'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
            (trip) => {
              trip.started_at = new Date(trip.started_at);
              trip.ended_at = new Date(trip.ended_at);
              return trip;
            }
        );
        console.log('Loaded Trips:', trips.length); 
       
        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
        const departures = d3.rollup(
            trips,
            v => v.length,
            d => d.start_station_id
          );
          
          const arrivals = d3.rollup(
            trips,
            v => v.length,
            d => d.end_station_id
          );
        
        const stations = computeStationTraffic(jsonData.data.stations, trips);
        console.log('Stations Array:', stations);
          const radiusScale = d3
          .scaleSqrt()
          .domain([0, d3.max(stations, d => d.totalTraffic)])
          .range([0, 25]);
        const circles = svg
        .selectAll('circle')
        .data(stations,  d => d.short_name)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('fill-opacity', 0.6)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .each(function (d) {
            d3.select(this)
              .append('title')
              .text(
                `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`
              );
        });
        function updateScatterPlot(timeFilter) {
            const filteredTrips = filterTripsByTime(trips, timeFilter);
            const filteredStations = computeStationTraffic(stations, filteredTrips);
          
            // Adjust size scale depending on whether filter is active
            timeFilter === -1
              ? radiusScale.range([0, 25])
              : radiusScale.range([3, 50]);
          
            // Update circle sizes and tooltips
            svg.selectAll('circle')
              .data(filteredStations, d => d.short_name) // key function
              .join('circle')
              .attr('r', d => radiusScale(d.totalTraffic))
              .attr('fill', 'steelblue')
              .attr('fill-opacity', 0.6)
              .attr('stroke', 'white')
              .attr('stroke-width', 1)
              .append('title')
              .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            
            updatePositions();
           
        }
        function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value);
          
            if (timeFilter === -1) {
              selectedTime.textContent = '';
              anyTimeLabel.style.display = 'block';
            } else {
              selectedTime.textContent = formatTime(timeFilter);
              anyTimeLabel.style.display = 'none';
              
            }
            updateScatterPlot(timeFilter);
            // Later: trigger filtering here
        }
    
        function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy);
        }

    
        updatePositions();

  
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);
    
        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();
        
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
   
  });
  