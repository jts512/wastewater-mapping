New York City's Wastewater Treatment System
===========================================

Project Overview
----------------
This project is an interactive web map about New York City's wastewater treatment
system. It shows the city's wastewater resource recovery facilities, the
sewershed areas that flow toward those facilities, and a hover panel with WRRF
details such as year built, design capacity, population served, drainage area,
and facility functions.

The project exists as an educational and illustrative tool. It is meant to help
people understand where wastewater goes after it enters the sewer system, how
New York City's treatment plants are distributed across the city, and how those
plants relate spatially to sewershed boundaries and local waterways.

Data Used
---------
1. Wastewater treatment plant data
   - File: wastewater-treatment-plants.csv
   - Contains facility names, longitude, latitude, year built, design capacity,
     population served, and receiving waterbody.
   - Wastewater treatment plant coordinates were pulled from Google Maps.
   - All information about the plants is courtesy of the NYC Department of
     Environmental Protection.
   - Used to place the WRRF location markers.

2. WRRF details and functions
   - File: merged_wrrf_table.csv
   - Contains WRRF names, years, capacities, boroughs, populations served,
     drainage areas, wet weather flows, and facility function flags.
   - Used to populate the sewershed hover information panel.

3. Sewershed GIS data
   - File: nyc-sewersheds.geojson
   - Sewershed GIS data was pulled from Open Sewer Atlas NYC.
   - Used to draw the sewershed polygons, outlines, and labels on the map.

Important Open Sewer Atlas NYC Disclaimer
-----------------------------------------
An important note!! These GIS files were created through a combination of
outdated NYC DEP shapefiles, publicly available documents like the
Waterbody/Watershed Facility Plans, Long Term Control Plans, and Environmental
Impact Statements. They have been updated manually to reflect the most current
publicly available pdf documents. These layers are NOT OFFICIAL and should not
be used for planning purposes - they are intended for illustrative and
educational purposes only!

Technology Used
---------------
The project is built as a static web map using:

- HTML: page structure and content
- CSS: layout, intro card styling, map/panel overlays, and responsive design
- JavaScript: map setup, data loading, marker creation, sewershed layer
  styling, address search, searched-address markers, and sewershed hover/click
  panel behavior
- Mapbox GL JS: interactive map rendering and map layers
- Mapbox GL Geocoder: address and place search
- GeoJSON: sewershed polygon and label data
- CSV: wastewater treatment plant data
- QGIS: used to upload and edit sewershed shapefiles, then export them to
  GeoJSON format
- Python: one-time helper scripts for preparing or modifying GeoJSON data

Main Files
----------
- index.html
  Defines the page structure, including the intro card, map container, and WRRF
  information panel.

- styles.css
  Controls the appearance of the page, including the intro card, legend,
  treatment guide, hover panel, WRRF markers, metric cards, grouped function
  chips, and responsive layout.

- script.js
  Initializes the Mapbox map, loads the sewershed GeoJSON, loads the wastewater
  plant CSV, creates plant markers, loads WRRF details, colors
  sewersheds below basemap labels, adds address search, marks searched
  locations, builds the treatment guide, and updates the information panel as
  users hover over or click sewersheds.

- wastewater-treatment-plants.csv
  Source data for the 14 wastewater treatment plants shown on the map.

- merged_wrrf_table.csv
  Source data for WRRF details and function flags shown in the sewershed hover
  panel.

- nyc-sewersheds.geojson
  Sewershed boundary and label data used by the map.

- scripts/convert_geojson.py
  Archived data-prep helper for converting GeoJSON coordinates from EPSG:2263
  to EPSG:4326. It is not used by the live web page.

- scripts/add_label_points.py
  Archived data-prep helper for creating label point features from sewershed
  polygons. It is not used by the live web page.

- scripts/color_sewersheds.py
  Archived data-prep helper that modifies sewershed label properties in the
  GeoJSON. It is not used by the live web page.

How It Works
------------
When the page loads, script.js creates a Mapbox map centered on New York City.
It fetches nyc-sewersheds.geojson and adds the sewersheds as fill, outline, and
label layers. Sewersheds are colored with a JavaScript color map based on each
feature's Sewershed property, and the polygon layers are drawn below basemap
labels so users can zoom in and orient themselves by streets, places, and
neighborhoods.

The script also fetches wastewater-treatment-plants.csv, parses the plant data,
and creates a custom label marker for each plant. The script fetches
merged_wrrf_table.csv, matches hovered or clicked sewershed names to WRRF rows,
and displays the matched details in the information panel.

Notes
-----
This project is designed for education, exploration, and communication. Because
the sewershed layers are not official planning data, the map should not be used
for engineering, regulatory, legal, or planning decisions.
