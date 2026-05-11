// Initialize the map
mapboxgl.accessToken = 'pk.eyJ1IjoianRzNTEyIiwiYSI6ImNtaHR6ZGhyZzF2eHYya3B3Y3FqbnFpZnMifQ.YYvh9nBukOuxNae4j0-0FA';

const nycBounds = [
    [-74.2591, 40.4774],
    [-73.7004, 40.9176]
];
const mapPanBounds = [
    [-74.35, 40.40],
    [-73.62, 40.98]
];
const nycPlaceNames = ['New York', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

const map = new mapboxgl.Map({
    container: 'map-container',
    style: 'mapbox://styles/mapbox/light-v11',
    projection: 'globe',
    zoom: 9,
    minZoom: 8,
    maxBounds: mapPanBounds,
    center: [-73.97030020004898, 40.67490743292621]
});

map.addControl(new mapboxgl.NavigationControl({
    showCompass: false,
    showZoom: true
}), 'bottom-right');

const plantMarkers = new Map();
const wrrfDetailsBySewershed = new Map();
let lockedSewershedName = null;
let searchedAddressMarker = null;

// WRRF marker color
const markerColor = '#4A90E2';  // Blue

// Sewershed styling - edit these values to customize appearance
const sewershedStyle = {
    defaultFillColor: '#D8E1E6',
    fillOpacity: 0.34,
    inactiveFillOpacity: 0.08,
    outlineColor: '#7A858C',
    outlineWidth: 1.4
};

// Sewershed color map
// Edit the names and colors below to control which sewersheds get which fill color.
const sewershedColorMap = {
    '26 WARD': '#6FA6B5',
    'BOWERY BAY': '#A99AC6',
    'CONEY ISLAND': '#D8A35D',
    'HUNTS POINT': '#7EAAA0',
    'JAMAICA BAY': '#A7B96F',
    'NEWTOWN CREEK': '#C98F86',
    'ROCKAWAY': '#8FAFD2',
    'JAMAICA': '#7BB99A',
    'NORTH RIVER': '#9E9ABF',
    'RED HOOK': '#7FA3B0',
    'OWLS HEAD': '#B6A66E',
    'PORT RICHMOND': '#C9A07B',
    'OAKWOOD BEACH': '#8CB6C4',
    'WARDS ISLAND': '#7BAA89',
    'TALLMAN ISLAND': '#D0B36F',
    'CENTRAL PARK': '#D9DEE2',
    'NA': '#D9DEE2'  // Neutral color for non-WRRF land areas
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
const sewershedFillOpacityExpression = [
    'case',
    ['in', ['get', 'Sewershed'], ['literal', ['CENTRAL PARK', 'NA']]],
    sewershedStyle.inactiveFillOpacity,
    sewershedStyle.fillOpacity
];
const sewershedPolygonFilter = ['any', ['==', ['geometry-type'], 'Polygon'], ['==', ['geometry-type'], 'MultiPolygon']];
const sewershedBaseOutlineFilter = ['all', sewershedPolygonFilter, ['!=', ['get', 'hideOutline'], true]];
const emptySewershedFilter = ['all', sewershedPolygonFilter, ['==', ['get', 'Sewershed'], '']];

const sewershedToWrrfName = {
    '26 WARD': '26th Ward',
    'JAMAICA BAY': 'Jamaica'
};

const sewershedOverrides = [
    {
        name: 'Governors Island',
        sourceSewershed: 'NA',
        targetSewershed: 'RED HOOK',
        coordinate: [-74.0169, 40.6895]
    },
    {
        name: 'Roosevelt Island',
        sourceSewershed: 'NEWTOWN CREEK',
        targetSewershed: 'BOWERY BAY',
        coordinate: [-73.945, 40.768],
        hideOutline: true
    },
    {
        name: 'Roosevelt Island Bowery Bay outline',
        sourceSewershed: 'BOWERY BAY',
        targetSewershed: 'BOWERY BAY',
        coordinate: [-73.9496, 40.7616],
        hideOutline: true
    }
];

const splitSewershedOverrides = [
    {
        name: 'Central Park',
        sourceSewershed: 'CENTRAL PARK',
        coordinate: [-73.9654, 40.7829],
        boundarySourceSewershed: 'NEWTOWN CREEK',
        boundaryEdge: 'north',
        aboveSewershed: 'WARDS ISLAND',
        belowSewershed: 'NEWTOWN CREEK'
    }
];

const inactiveSewersheds = new Set(['CENTRAL PARK', 'NA']);

const wrrfMetricFields = [
    ['Year Built', 'Year'],
    ['Plant Capacity', 'Capacity (MGD)', ' MGD'],
    ['Wet Weather Flow', 'Wet Weather Flow (MGD)', ' MGD'],
    ['Population Served', 'Population Served'],
    ['Drainage Area', 'Drainage Area (acres)', ' acres'],
    ['Borough', 'Borough']
];

const wrrfFunctionGroups = [
    {
        title: 'Wastewater Treatment',
        colorClass: 'treatment',
        fields: [
            'Preliminary Treatment',
            'Secondary Treatment',
            'Biological Nutrient Removal (BNR)',
            'Chlorination',
            'Dechlorination'
        ]
    },
    {
        title: 'Solids Handling',
        colorClass: 'solids',
        fields: [
            'Sludge Dewatering',
            'Sludge Pumping',
            'Docks'
        ]
    },
    {
        title: 'Energy Generation',
        colorClass: 'energy',
        fields: [
            'Gas to Grid / Food Waste',
            'Cogen Engines',
            'Title V Facility'
        ]
    },
    {
        title: 'CSO Facilities',
        colorClass: 'cso',
        fields: ['CSO Facilities']
    }
];

const treatmentFunctionDescriptions = {
    'Preliminary Treatment': 'Screens and settling equipment remove large debris, grit, and heavy solids before wastewater moves deeper into the facility.',
    'Secondary Treatment': 'Microorganisms break down dissolved and suspended organic material, cleaning the water beyond basic solids removal.',
    'Biological Nutrient Removal (BNR)': 'A biological process that reduces nutrients such as nitrogen, helping protect receiving waterways from excess algae growth.',
    'Chlorination': 'Disinfects treated water before discharge by using chlorine to reduce harmful bacteria and pathogens.',
    'Dechlorination': 'Removes or neutralizes chlorine after disinfection so treated water can be released with less impact on aquatic life.',
    'Sludge Dewatering': 'Removes water from processed solids so the remaining material is easier to transport, reuse, or dispose of.',
    'Sludge Pumping': 'Moves sludge between treatment steps or to another facility for further processing.',
    'Docks': 'Supports transport of treatment byproducts, supplies, or materials by water where facilities have waterfront access.',
    'Gas to Grid / Food Waste': 'Captures biogas from digestion, sometimes boosted with food waste, and upgrades it for useful energy.',
    'Cogen Engines': 'Uses biogas or other fuel to generate electricity and useful heat for facility operations.',
    'Title V Facility': 'Indicates the facility has air-emissions equipment or operations regulated under a major air permit.',
    'CSO Facilities': 'Infrastructure that helps manage combined sewer overflows during wet weather, reducing untreated discharges to waterways.'
};

setupIntroOverlay();
setupTreatmentGuide();

// Wait for the map to load before adding markers
map.on('load', async () => {
    addAddressSearch();
    await loadWrrfDetails();
    await loadAndAddSewersheds();
    
    fetchAndAddMarkers();
});

function addAddressSearch() {
    if (typeof MapboxGeocoder === 'undefined') {
        console.warn('Mapbox geocoder plugin is not available.');
        return;
    }

    const searchContainer = document.getElementById('address-search');
    if (!searchContainer) {
        return;
    }

    const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        marker: false,
        placeholder: 'Find your treatment area',
        bbox: nycBounds.flat(),
        countries: 'us',
        types: 'address',
        filter: isNycAddressResult,
        proximity: {
            longitude: -73.9703,
            latitude: 40.6749
        }
    });

    geocoder.on('result', event => {
        const coordinates = event.result?.geometry?.coordinates;
        if (coordinates) {
            setSearchedAddressMarker(coordinates);
            map.once('idle', () => {
                selectTreatmentAreaAtCoordinates(coordinates);
            });
        }
    });

    geocoder.on('clear', () => {
        clearSearchedAddressMarker();
    });

    searchContainer.appendChild(geocoder.onAdd(map));
}

function isNycAddressResult(result) {
    const coordinates = result?.geometry?.coordinates;
    const placeName = result?.place_name || '';

    return Array.isArray(coordinates) &&
        isCoordinateInBounds(coordinates, nycBounds) &&
        nycPlaceNames.some(name => placeName.includes(`${name}, New York`));
}

function isCoordinateInBounds(coordinates, bounds) {
    const [longitude, latitude] = coordinates;
    const [[west, south], [east, north]] = bounds;

    return longitude >= west &&
        longitude <= east &&
        latitude >= south &&
        latitude <= north;
}

async function loadWrrfDetails() {
    try {
        const response = await fetch('merged_wrrf_table.csv');
        const csvText = await response.text();
        const rows = parseCSVRows(csvText);

        rows.forEach(row => {
            const wrrfName = row['WRRF Name'];
            if (!wrrfName) {
                return;
            }

            wrrfDetailsBySewershed.set(normalizeName(wrrfName), row);
        });
    } catch (error) {
        console.error('Error loading WRRF details CSV:', error);
    }
}

// Load and display the sewersheds GeoJSON
async function loadAndAddSewersheds() {
    try {
        const response = await fetch('nyc-sewersheds.geojson');
        const geojson = await response.json();
        applySewershedOverrides(geojson);
        
        // Add the GeoJSON as a source
        map.addSource('sewersheds', {
            type: 'geojson',
            data: geojson
        });

        const firstLabelLayerId = getFirstBasemapLabelLayerId();
        
        // Add a fill layer for the sewersheds (polygons and multipolygons)
        map.addLayer({
            id: 'sewersheds-fill',
            type: 'fill',
            source: 'sewersheds',
            filter: sewershedPolygonFilter,
            paint: {
                'fill-color': sewershedFillColorExpression,
                'fill-opacity': sewershedFillOpacityExpression
            }
        }, firstLabelLayerId);
        
        // Add an outline layer for the sewersheds (polygons and multipolygons)
        map.addLayer({
            id: 'sewersheds-outline',
            type: 'line',
            source: 'sewersheds',
            filter: sewershedBaseOutlineFilter,
            paint: {
                'line-color': sewershedStyle.outlineColor,
                'line-width': sewershedStyle.outlineWidth,
                'line-opacity': 0.8
            }
        }, firstLabelLayerId);

        map.addLayer({
            id: 'sewersheds-hover-outline',
            type: 'line',
            source: 'sewersheds',
            filter: emptySewershedFilter,
            paint: {
                'line-color': '#222',
                'line-width': 4,
                'line-opacity': 0.40
            }
        }, firstLabelLayerId);

        map.addLayer({
            id: 'sewersheds-selected-fill',
            type: 'fill',
            source: 'sewersheds',
            filter: emptySewershedFilter,
            paint: {
                'fill-color': '#FFFFFF',
                'fill-opacity': 0.22
            }
        }, firstLabelLayerId);

        map.addLayer({
            id: 'sewersheds-selected-outline',
            type: 'line',
            source: 'sewersheds',
            filter: emptySewershedFilter,
            paint: {
                'line-color': '#0B1F2A',
                'line-width': 3.6,
                'line-opacity': 0.62
            }
        }, firstLabelLayerId);
        
        
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

        setupSewershedHover();
        
    } catch (error) {
        console.error('Error loading sewersheds GeoJSON:', error);
    }
}

function applySewershedOverrides(geojson) {
    sewershedOverrides.forEach(override => {
        moveContainingPolygonToSewershed(geojson, override);
    });

    splitSewershedOverrides.forEach(override => {
        splitContainingPolygonByLatitude(geojson, override);
    });
}

function moveContainingPolygonToSewershed(geojson, override) {
    const sourceFeature = geojson.features.find(feature =>
        feature.geometry?.type === 'MultiPolygon' &&
        feature.properties?.Sewershed === override.sourceSewershed &&
        feature.geometry.coordinates.some(polygon => isPointInPolygon(override.coordinate, polygon))
    );

    if (!sourceFeature) {
        console.warn(`Could not find ${override.name} sewershed override source polygon.`);
        return;
    }

    const targetPolygons = [];
    sourceFeature.geometry.coordinates = sourceFeature.geometry.coordinates.filter(polygon => {
        if (isPointInPolygon(override.coordinate, polygon)) {
            targetPolygons.push(polygon);
            return false;
        }

        return true;
    });

    if (!targetPolygons.length) {
        return;
    }

    geojson.features.push({
        type: 'Feature',
        properties: {
            ...sourceFeature.properties,
            Sewershed: override.targetSewershed,
            label: null,
            hideOutline: override.hideOutline === true
        },
        geometry: {
            type: 'MultiPolygon',
            coordinates: targetPolygons
        }
    });
}

function splitContainingPolygonByLatitude(geojson, override) {
    const sourceFeature = geojson.features.find(feature =>
        feature.geometry?.type === 'MultiPolygon' &&
        feature.properties?.Sewershed === override.sourceSewershed &&
        feature.geometry.coordinates.some(polygon => isPointInPolygon(override.coordinate, polygon))
    );
    const boundaryLatitude = getSewershedBoundaryLatitude(
        geojson,
        override.boundarySourceSewershed,
        override.boundaryEdge
    );

    if (!sourceFeature || boundaryLatitude === null) {
        console.warn(`Could not apply ${override.name} sewershed split override.`);
        return;
    }

    const abovePolygons = [];
    const belowPolygons = [];

    sourceFeature.geometry.coordinates = sourceFeature.geometry.coordinates.filter(polygon => {
        if (!isPointInPolygon(override.coordinate, polygon)) {
            return true;
        }

        const belowPolygon = clipPolygonByLatitude(polygon, boundaryLatitude, false);
        const abovePolygon = clipPolygonByLatitude(polygon, boundaryLatitude, true);

        if (belowPolygon) {
            belowPolygons.push(belowPolygon);
        }

        if (abovePolygon) {
            abovePolygons.push(abovePolygon);
        }

        return false;
    });

    addOverrideFeature(geojson, sourceFeature, override.belowSewershed, belowPolygons, { hideOutline: true });
    addOverrideFeature(geojson, sourceFeature, override.aboveSewershed, abovePolygons, { hideOutline: true });
}

function addOverrideFeature(geojson, sourceFeature, sewershedName, polygons, extraProperties = {}) {
    if (!polygons.length) {
        return;
    }

    geojson.features.push({
        type: 'Feature',
        properties: {
            ...sourceFeature.properties,
            Sewershed: sewershedName,
            label: null,
            ...extraProperties
        },
        geometry: {
            type: 'MultiPolygon',
            coordinates: polygons
        }
    });
}

function getSewershedBoundaryLatitude(geojson, sewershedName, edge) {
    const feature = geojson.features.find(item =>
        item.geometry?.type === 'MultiPolygon' &&
        item.properties?.Sewershed === sewershedName
    );

    if (!feature) {
        return null;
    }

    const bounds = getCoordinateBounds(feature.geometry.coordinates);
    return edge === 'north' ? bounds.maxY : bounds.minY;
}

function getCoordinateBounds(coordinates) {
    const bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
    };

    visitCoordinates(coordinates, ([longitude, latitude]) => {
        bounds.minX = Math.min(bounds.minX, longitude);
        bounds.maxX = Math.max(bounds.maxX, longitude);
        bounds.minY = Math.min(bounds.minY, latitude);
        bounds.maxY = Math.max(bounds.maxY, latitude);
    });

    return bounds;
}

function visitCoordinates(coordinates, callback) {
    if (typeof coordinates[0] === 'number') {
        callback(coordinates);
        return;
    }

    coordinates.forEach(item => visitCoordinates(item, callback));
}

function clipPolygonByLatitude(polygon, latitude, keepAbove) {
    const clippedOuterRing = clipRingByLatitude(polygon[0], latitude, keepAbove);

    if (clippedOuterRing.length < 4) {
        return null;
    }

    return [clippedOuterRing];
}

function clipRingByLatitude(ring, latitude, keepAbove) {
    const openRing = coordinatesEqual(ring[0], ring[ring.length - 1])
        ? ring.slice(0, -1)
        : ring;
    const clippedRing = [];

    openRing.forEach((currentPoint, index) => {
        const previousPoint = openRing[(index + openRing.length - 1) % openRing.length];
        const currentInside = isPointOnLatitudeSide(currentPoint, latitude, keepAbove);
        const previousInside = isPointOnLatitudeSide(previousPoint, latitude, keepAbove);

        if (currentInside !== previousInside) {
            clippedRing.push(intersectSegmentWithLatitude(previousPoint, currentPoint, latitude));
        }

        if (currentInside) {
            clippedRing.push(currentPoint);
        }
    });

    return closeRing(removeDuplicateCoordinates(clippedRing));
}

function isPointOnLatitudeSide(point, latitude, keepAbove) {
    return keepAbove ? point[1] >= latitude : point[1] <= latitude;
}

function intersectSegmentWithLatitude(startPoint, endPoint, latitude) {
    const [startLongitude, startLatitude] = startPoint;
    const [endLongitude, endLatitude] = endPoint;
    const ratio = (latitude - startLatitude) / (endLatitude - startLatitude);

    return [
        startLongitude + (endLongitude - startLongitude) * ratio,
        latitude
    ];
}

function closeRing(ring) {
    if (!ring.length || coordinatesEqual(ring[0], ring[ring.length - 1])) {
        return ring;
    }

    return [...ring, ring[0]];
}

function removeDuplicateCoordinates(coordinates) {
    return coordinates.filter((coordinate, index) =>
        index === 0 || !coordinatesEqual(coordinate, coordinates[index - 1])
    );
}

function coordinatesEqual(firstCoordinate, secondCoordinate) {
    return firstCoordinate[0] === secondCoordinate[0] &&
        firstCoordinate[1] === secondCoordinate[1];
}

function isPointInPolygon(point, polygon) {
    const [outerRing, ...holes] = polygon;
    return isPointInRing(point, outerRing) &&
        !holes.some(ring => isPointInRing(point, ring));
}

function isPointInRing(point, ring) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersects = ((yi > y) !== (yj > y)) &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

function getFirstBasemapLabelLayerId() {
    const layers = map.getStyle().layers;
    const labelLayer = layers.find(layer =>
        layer.type === 'symbol' &&
        layer.layout &&
        layer.layout['text-field'] &&
        !layer.id.startsWith('sewersheds')
    );

    return labelLayer?.id;
}

function setupSewershedHover() {
    const closePanelButton = document.getElementById('close-wrrf-panel');
    if (closePanelButton) {
        closePanelButton.addEventListener('click', unlockSewershedPanel);
    }

    map.on('mousemove', 'sewersheds-fill', event => {
        if (lockedSewershedName) {
            return;
        }

        const hoveredFeature = event.features[0];
        if (!hoveredFeature) {
            clearSewershedHover();
            resetWrrfPanel();
            return;
        }

        const sewershedName = hoveredFeature.properties.Sewershed;
        const hasDetails = hasWrrfDetails(sewershedName);

        map.getCanvas().style.cursor = hasDetails ? 'pointer' : '';

        if (!hasDetails) {
            clearSewershedHover();
            return;
        }

        setSewershedHover(sewershedName);
    });

    map.on('mouseleave', 'sewersheds-fill', () => {
        if (lockedSewershedName) {
            return;
        }

        map.getCanvas().style.cursor = '';
        clearSewershedHover();
    });

    map.on('click', 'sewersheds-fill', event => {
        selectSewershedFeature(event.features[0]);
    });

    map.on('touchstart', 'sewersheds-fill', event => {
        if (event.points && event.points.length > 1) {
            return;
        }

        selectSewershedFeature(event.features[0]);
    });

    map.on('click', event => {
        const features = map.queryRenderedFeatures(event.point, { layers: ['sewersheds-fill'] });
        const clickedValidSewershed = features.some(feature => hasWrrfDetails(feature.properties.Sewershed));

        if (!clickedValidSewershed) {
            unlockSewershedPanel();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            unlockSewershedPanel();
        }
    });
}

function selectSewershedFeature(feature) {
    if (!feature) {
        return;
    }

    const sewershedName = feature.properties.Sewershed;
    if (!hasWrrfDetails(sewershedName)) {
        return;
    }

    lockedSewershedName = sewershedName;
    map.getCanvas().style.cursor = 'pointer';
    clearSewershedHover();
    setSelectedSewershed(sewershedName);
    showWrrfDetails(sewershedName);
}

function clearSewershedHover() {
    if (map.getLayer('sewersheds-hover-outline')) {
        map.setFilter('sewersheds-hover-outline', emptySewershedFilter);
    }
}

function setSewershedHover(sewershedName) {
    if (!map.getLayer('sewersheds-hover-outline')) {
        return;
    }

    const hoverFilter = ['all', sewershedBaseOutlineFilter, ['==', ['get', 'Sewershed'], sewershedName]];
    map.setFilter('sewersheds-hover-outline', hoverFilter);
}

function clearSelectedSewershed() {
    if (map.getLayer('sewersheds-selected-fill')) {
        map.setFilter('sewersheds-selected-fill', emptySewershedFilter);
    }

    if (map.getLayer('sewersheds-selected-outline')) {
        map.setFilter('sewersheds-selected-outline', emptySewershedFilter);
    }
}

function setSelectedSewershed(sewershedName) {
    if (!map.getLayer('sewersheds-selected-fill') || !map.getLayer('sewersheds-selected-outline')) {
        return;
    }

    const selectedFillFilter = ['all', sewershedPolygonFilter, ['==', ['get', 'Sewershed'], sewershedName]];
    const selectedOutlineFilter = ['all', sewershedBaseOutlineFilter, ['==', ['get', 'Sewershed'], sewershedName]];
    map.setFilter('sewersheds-selected-fill', selectedFillFilter);
    map.setFilter('sewersheds-selected-outline', selectedOutlineFilter);
}

function selectTreatmentAreaAtCoordinates(coordinates) {
    if (!map.getLayer('sewersheds-fill')) {
        return;
    }

    const point = map.project(coordinates);
    const features = map.queryRenderedFeatures(point, { layers: ['sewersheds-fill'] });
    const sewershedFeature = features.find(feature => hasWrrfDetails(feature.properties.Sewershed));

    if (!sewershedFeature) {
        unlockSewershedPanel();
        return;
    }

    const sewershedName = sewershedFeature.properties.Sewershed;
    lockedSewershedName = sewershedName;
    clearSewershedHover();
    setSelectedSewershed(sewershedName);
    showWrrfDetails(sewershedName);
}

function unlockSewershedPanel() {
    lockedSewershedName = null;
    map.getCanvas().style.cursor = '';
    clearSewershedHover();
    clearSelectedSewershed();
    resetWrrfPanel();
}

function showWrrfDetails(sewershedName) {
    const panel = document.getElementById('wrrf-info-panel');
    const title = document.getElementById('wrrf-panel-title');
    const code = document.getElementById('wrrf-panel-code');
    const metricsContainer = document.getElementById('wrrf-metrics');
    const functionsContainer = document.getElementById('wrrf-functions');
    const wrrfLookupName = sewershedToWrrfName[sewershedName] || titleCaseName(sewershedName);
    const details = wrrfDetailsBySewershed.get(normalizeName(wrrfLookupName));

    panel.classList.remove('empty');
    panel.classList.add('has-data');
    title.textContent = wrrfLookupName;

    if (!details) {
        code.textContent = 'N/A';
        metricsContainer.innerHTML = `<p class="missing-data">No WRRF details found for ${escapeHTML(sewershedName)}.</p>`;
        functionsContainer.innerHTML = '';
        return;
    }

    title.textContent = getPanelTreatmentAreaTitle(sewershedName, details);
    code.textContent = details.WRRF || 'WRRF';
    metricsContainer.innerHTML = wrrfMetricFields
        .map(([label, field, suffix = '']) => createMetricCard(label, details[field], suffix))
        .join('');

    const functionGroupsHTML = createFunctionGroups(details);
    functionsContainer.innerHTML = functionGroupsHTML
        ? functionGroupsHTML
        : '<span class="no-functions">No listed functions marked Yes.</span>';
}

function getPanelTreatmentAreaTitle(sewershedName, details) {
    if (sewershedName === 'JAMAICA BAY') {
        return 'Jamaica Bay';
    }

    return details['WRRF Name'];
}

function createFunctionGroups(details) {
    return wrrfFunctionGroups
        .map(group => {
            const activeFields = group.fields.filter(field => isYes(details[field]));
            if (!activeFields.length) {
                return '';
            }

            return `
                <div class="function-group ${escapeHTML(group.colorClass)}">
                    <h5>${escapeHTML(group.title)}</h5>
                    <div class="function-chip-row">
                        ${activeFields.map(field => `<span class="function-chip">${escapeHTML(field)}</span>`).join('')}
                    </div>
                </div>
            `;
        })
        .join('');
}

function hasWrrfDetails(sewershedName) {
    if (!sewershedName || inactiveSewersheds.has(sewershedName)) {
        return false;
    }

    const wrrfLookupName = sewershedToWrrfName[sewershedName] || titleCaseName(sewershedName);
    return wrrfDetailsBySewershed.has(normalizeName(wrrfLookupName));
}

function resetWrrfPanel() {
    const panel = document.getElementById('wrrf-info-panel');
    document.getElementById('wrrf-panel-title').textContent = 'Click a sewershed';
    document.getElementById('wrrf-panel-code').textContent = 'WRRF';
    document.getElementById('wrrf-metrics').innerHTML = '';
    document.getElementById('wrrf-functions').innerHTML = '';
    panel.classList.add('empty');
    panel.classList.remove('has-data');
}

function createMetricCard(label, value, suffix = '') {
    const displayValue = value ? `${value}${suffix}` : 'N/A';
    return `
        <div class="metric-card">
            <span class="metric-label">${escapeHTML(label)}</span>
            <span class="metric-value">${escapeHTML(displayValue)}</span>
        </div>
    `;
}

function setupIntroOverlay() {
    const overlay = document.getElementById('intro-overlay');
    const enterButton = document.getElementById('enter-map');

    if (!overlay || !enterButton) {
        return;
    }

    const dismissIntro = () => {
        overlay.classList.add('hidden');
        enterButton.blur();
    };

    enterButton.addEventListener('click', dismissIntro);
    document.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !overlay.classList.contains('hidden')) {
            dismissIntro();
        }
    });
    enterButton.focus();
}

function setupTreatmentGuide() {
    const guide = document.getElementById('treatment-guide');
    const toggleButton = document.getElementById('toggle-guide');
    const tabsContainer = document.getElementById('guide-tabs');
    const pillsContainer = document.getElementById('guide-pills');
    const descriptionContainer = document.getElementById('guide-description');

    if (!guide || !toggleButton || !tabsContainer || !pillsContainer || !descriptionContainer) {
        return;
    }

    let activeGroupIndex = 0;
    let activeField = wrrfFunctionGroups[activeGroupIndex].fields[0];

    function renderGuide() {
        const activeGroup = wrrfFunctionGroups[activeGroupIndex];

        tabsContainer.innerHTML = wrrfFunctionGroups
            .map((group, index) => `
                <button class="guide-tab ${index === activeGroupIndex ? 'active' : ''}" type="button" data-group-index="${index}">
                    <span class="guide-tab-dot ${escapeHTML(group.colorClass)}"></span>
                    ${escapeHTML(group.title)}
                </button>
            `)
            .join('');

        pillsContainer.className = `guide-pills ${activeGroup.colorClass}`;
        pillsContainer.innerHTML = activeGroup.fields
            .map(field => `
                <button class="guide-pill ${field === activeField ? 'active' : ''}" type="button" data-field="${escapeHTML(field)}">
                    ${escapeHTML(field)}
                </button>
            `)
            .join('');

        descriptionContainer.innerHTML = `
            <h4>${escapeHTML(activeField)}</h4>
            <p>${escapeHTML(treatmentFunctionDescriptions[activeField] || 'Description coming soon.')}</p>
        `;
    }

    toggleButton.addEventListener('click', () => {
        const isMinimized = guide.classList.toggle('minimized');
        toggleButton.textContent = isMinimized ? '+' : '-';
        toggleButton.setAttribute('aria-label', isMinimized ? 'Expand treatment guide' : 'Minimize treatment guide');
    });

    tabsContainer.addEventListener('click', event => {
        const tab = event.target.closest('.guide-tab');
        if (!tab) {
            return;
        }

        activeGroupIndex = Number(tab.dataset.groupIndex);
        activeField = wrrfFunctionGroups[activeGroupIndex].fields[0];
        renderGuide();
    });

    pillsContainer.addEventListener('click', event => {
        const pill = event.target.closest('.guide-pill');
        if (!pill) {
            return;
        }

        activeField = pill.dataset.field;
        renderGuide();
    });

    renderGuide();
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
            const abbreviation = getWrrfAbbreviation(plant.facility);

            const marker = new mapboxgl.Marker({
                element: createPlantMarker(color, abbreviation, plant.facility),
                anchor: 'bottom',
                offset: [0, -8]
            })
                .setLngLat([plant.longitude, plant.latitude])
                .addTo(map);

            plantMarkers.set(plant.facility, marker);
        });
        
    } catch (error) {
        console.error('Error loading CSV file:', error);
    }
}

function getWrrfAbbreviation(facilityName) {
    const details = wrrfDetailsBySewershed.get(normalizeName(facilityName));
    return details?.WRRF || facilityName.slice(0, 2).toUpperCase();
}

// Create a labeled WRRF marker
function createPlantMarker(color, abbreviation, facilityName) {
    const el = document.createElement('div');
    el.className = 'plant-marker';
    el.style.setProperty('--marker-color', color);
    el.setAttribute('aria-label', `${facilityName} WRRF`);
    el.innerHTML = `
        <span class="plant-marker-label">${escapeHTML(abbreviation)}</span>
    `;
    return el;
}

function setSearchedAddressMarker(coordinates) {
    clearSearchedAddressMarker();
    searchedAddressMarker = new mapboxgl.Marker({
        element: createSearchedAddressMarker(),
        anchor: 'center'
    })
        .setLngLat(coordinates)
        .addTo(map);
}

function clearSearchedAddressMarker() {
    if (searchedAddressMarker) {
        searchedAddressMarker.remove();
        searchedAddressMarker = null;
    }
}

function createSearchedAddressMarker() {
    const el = document.createElement('div');
    el.className = 'searched-address-marker';
    return el;
}

// Simple CSV parser
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
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

function parseCSVRows(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    const headers = parseCSVLine(lines[0]).map(header => header.trim());

    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        return headers.reduce((row, header, index) => {
            row[header] = (values[index] || '').trim();
            return row;
        }, {});
    });
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

function normalizeName(name) {
    return String(name || '')
        .toUpperCase()
        .replace(/\b(\d+)(ST|ND|RD|TH)\b/g, '$1')
        .replace(/[^A-Z0-9]/g, '');
}

function titleCaseName(name) {
    return String(name || '')
        .toLowerCase()
        .split(' ')
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
        .join(' ');
}

function isYes(value) {
    return String(value || '').trim().toLowerCase() === 'yes';
}

function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}
