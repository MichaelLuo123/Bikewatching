import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);

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
map.on('load', async () => {
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
        const trips = await d3.csv(trafficUrl);
        console.log('Loaded Trips:', trips.length); 
        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);
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
          
          stations = stations.map((station) => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
          });
        const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8);

    
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
        
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
  });
  