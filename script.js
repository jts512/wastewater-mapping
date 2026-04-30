// Initialize the map
mapboxgl.accessToken = 'pk.eyJ1IjoianRzNTEyIiwiYSI6ImNtaHR6ZGhyZzF2eHYya3B3Y3FqbnFpZnMifQ.YYvh9nBukOuxNae4j0-0FA';

const map = new mapboxgl.Map({
    container: 'map-container',
    style: 'mapbox://styles/mapbox/light-v11',
    projection: 'globe',
    zoom: 9,
    center: [-73.97030020004898, 40.67490743292621]
});

const plantMarkers = new Map();

// WRRF marker color
const markerColor = '#4A90E2';  // Blue

// Sewershed styling - edit these values to customize appearance
const sewershedStyle = {
    defaultFillColor: '#B3D9E8',
    fillOpacity: 0.3,
    outlineColor: '#666',
    outlineWidth: 2.0
};

// Sewershed color map
// Edit the names and colors below to control which sewersheds get which fill color.
const sewershedColorMap = {
    '26 WARD': '#2A6F97',
    'BOWERY BAY': '#8338EC',
    'CONEY ISLAND': '#F8961E',
    'HUNTS POINT': '#2A6F97',
    'JAMAICA BAY': '#43AA8B',
    'NEWTOWN CREEK': '#F8961E',
    'ROCKAWAY': '#2A6F97',
    'JAMAICA': '#43AA8B',
    'NORTH RIVER': '#8338EC',
    'CONEY ISLAND': '#8338EC',
    'RED HOOK': '#2A6F97',
    'OWLS HEAD': '#43AA8B',
    'PORT RICHMOND': '#F8961E',
    'OAKWOOD BEACH': '#2A6F97',
    'WARDS ISLAND': '#43AA8B',
    'TALLMAN ISLAND': '#F8961E',
    'CENTRAL PARK': '#6B7280',
    'NA': '#6B7280'  // Default color for sewersheds not listed above
};

// Build a Mapbox "match" expression that colors each sewershed by its Sewershed property.
// If a sewershed name is not listed in sewershedColorMap, Mapbox uses the default color.
function buildSewershedColorExpression(colorMap, defaultColor) {
    const expression = ['match', ['get', 'Sewershed']];

    Object.entries(colorMap).forEach(([name, color]) => {
        expression.push(name, color);
    });

    expression.push(defaultColor);
    return expression;
}

const sewershedFillColorExpression = buildSewershedColorExpression(sewershedColorMap, sewershedStyle.defaultFillColor);

// Wait for the map to load before adding markers
map.on('load', () => {
    // Hide all labels and annotations to have a clean map
    const layersToHide = [
        'road_label',           // Road labels
        'transit_label',        // Transit labels
        'poi_label',            // Point of interest labels
        'settlement_subdivision_label',  // Neighborhood labels
        'settlement_label'      // City/settlement labels
    ];
    layersToHide.forEach(layerId => {
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none');
        }
    });
    
    // Load and add the sewersheds GeoJSON layer
    loadAndAddSewersheds();
    
    fetchAndAddMarkers();
});

// Load and display the sewersheds GeoJSON
async function loadAndAddSewersheds() {
    try {
        const response = await fetch('nyc-sewersheds.geojson');
        const geojson = await response.json();
        
        // Add the GeoJSON as a source
        map.addSource('sewersheds', {
            type: 'geojson',
            data: geojson
        });
        
        // Add a fill layer for the sewersheds (polygons and multipolygons)
        map.addLayer({
            id: 'sewersheds-fill',
            type: 'fill',
            source: 'sewersheds',
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: {
                'fill-color': sewershedFillColorExpression,
                'fill-opacity': sewershedStyle.fillOpacity
            }
        });
        
        // Add an outline layer for the sewersheds (polygons and multipolygons)
        map.addLayer({
            id: 'sewersheds-outline',
            type: 'line',
            source: 'sewersheds',
            filter: ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']],
            paint: {
                'line-color': sewershedStyle.outlineColor,
                'line-width': sewershedStyle.outlineWidth,
                'line-opacity': 0.8
            }
        });
        
        // Add a label layer for sewersheds (excluding null labels)
        map.addLayer({
            id: 'sewersheds-labels',
            type: 'symbol',
            source: 'sewersheds',
            layout: {
                'text-field': ['get', 'label'],
                'text-size': 12,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-allow-overlap': false,
                'text-ignore-placement': false
            },
            paint: {
                'text-color': '#333',
                'text-halo-color': '#fff',
                'text-halo-width': 1
            },
            filter: ['==', ['get', 'isLabel'], true]
        });
        
    } catch (error) {
        console.error('Error loading sewersheds GeoJSON:', error);
    }
}

// Fetch and parse CSV file
async function fetchAndAddMarkers() {
    try {
        const response = await fetch('wastewater-treatment-plants.csv');
        const csvText = await response.text();
        const plants = parseCSV(csvText);
        
        // Add a marker for each plant
        plants.forEach(plant => {
            const color = markerColor;
            
            const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '320px' })
                .setHTML(`
                    <style>
                        .plant-popup {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            padding: 0;
                            border-radius: 12px;
                            overflow: hidden;
                        }
                        .plant-popup-header {
                            background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%);
                            color: white;
                            padding: 16px;
                            margin: 0;
                        }
                        .plant-popup-header h3 {
                            margin: 0;
                            font-size: 18px;
                            font-weight: 600;
                            letter-spacing: 0.3px;
                        }
                        .plant-popup-content {
                            padding: 16px;
                            background: #fafafa;
                        }
                        .popup-row {
                            margin: 10px 0;
                            display: flex;
                            flex-direction: column;
                        }
                        .popup-row strong {
                            color: #333;
                            font-size: 12px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 4px;
                            font-weight: 600;
                        }
                        .popup-row p {
                            margin: 0;
                            color: #666;
                            font-size: 14px;
                            line-height: 1.5;
                        }
                    </style>
                    <div class="plant-popup">
                        <div class="plant-popup-header">
                            <h3>${plant.facility}</h3>
                        </div>
                        <div class="plant-popup-content">
                            <div class="popup-row">
                                <strong>📅 Year Built</strong>
                                <p>${plant.yearBuilt}</p>
                            </div>
                            <div class="popup-row">
                                <strong>⚙️ Design Capacity</strong>
                                <p>${plant.capacity}</p>
                            </div>
                            <div class="popup-row">
                                <strong>👥 Population Served</strong>
                                <p>${plant.populationServed}</p>
                            </div>
                            <div class="popup-row">
                                <strong>💧 Receiving Waterbody</strong>
                                <p>${plant.receivingWaterbody}</p>
                            </div>
                        </div>
                    </div>
                `);

            const marker = new mapboxgl.Marker({
                element: createWaterDropletMarker(color)
            })
                .setLngLat([plant.longitude, plant.latitude])
                .setPopup(popup)
                .addTo(map);

            plantMarkers.set(plant.facility, marker);
        });

        // Populate the summary table
        populateSummaryTable(plants);
        
        // Add minimize/expand functionality
        setupTableToggle();
        
    } catch (error) {
        console.error('Error loading CSV file:', error);
    }
}

// Create a custom modern marker
function createWaterDropletMarker(color) {
    const el = document.createElement('div');
    el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
                </filter>
            </defs>
            <circle cx="16" cy="16" r="12" fill="${color}" filter="url(#shadow)"/>
            <circle cx="16" cy="16" r="11.5" stroke="white" stroke-width="1.5" fill="none"/>
            <circle cx="16" cy="16" r="5" fill="white" opacity="0.8"/>
        </svg>
    `;
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.cursor = 'pointer';
    return el;
}

// Simple CSV parser
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const plants = [];
    
    for (let i = 1; i < lines.length; i++) {
        // Handle values that may contain commas (like numbers with commas)
        const values = parseCSVLine(lines[i]);
        plants.push({
            facility: values[0].trim(),
            longitude: parseFloat(values[1]),
            latitude: parseFloat(values[2]),
            yearBuilt: values[3].trim(),
            capacity: values[4].trim(),
            populationServed: values[5].trim(),
            receivingWaterbody: values[6].trim()
        });
    }
    
    return plants;
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Adjust hex color brightness for gradients
function adjustColor(color, percent) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

// Populate the summary table with plant data
function populateSummaryTable(plants) {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    // Sort plants by capacity (smallest to largest)
    const sortedPlants = [...plants].sort((a, b) => {
        const capacityA = parseFloat(a.capacity);
        const capacityB = parseFloat(b.capacity);
        return capacityA - capacityB;
    });
    
    sortedPlants.forEach(plant => {
        const row = document.createElement('tr');
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Zoom to ${plant.facility}`);
        row.innerHTML = `
            <td>${plant.facility}</td>
            <td>${plant.yearBuilt}</td>
            <td>${plant.capacity}</td>
        `;
        row.addEventListener('click', () => zoomToPlant(plant));
        row.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                zoomToPlant(plant);
            }
        });
        tableBody.appendChild(row);
    });
}

function zoomToPlant(plant) {
    map.flyTo({
        center: [plant.longitude, plant.latitude],
        zoom: 13.5,
        essential: true
    });

    const marker = plantMarkers.get(plant.facility);
    if (marker) {
        marker.getPopup().addTo(map);
    }
}

// Setup minimize/expand functionality for the summary table
function setupTableToggle() {
    const toggleBtn = document.getElementById('toggle-table');
    const summaryTable = document.getElementById('summary-table');
    const minimizedBar = document.querySelector('.table-minimized');
    
    toggleBtn.addEventListener('click', () => {
        const isMinimized = summaryTable.classList.contains('minimized');
        
        if (isMinimized) {
            summaryTable.classList.remove('minimized');
            toggleBtn.textContent = '−';
        } else {
            summaryTable.classList.add('minimized');
            toggleBtn.textContent = '+';
        }
    });
    
    // Allow clicking the minimized bar to expand
    minimizedBar.addEventListener('click', () => {
        summaryTable.classList.remove('minimized');
        toggleBtn.textContent = '−';
    });
}
