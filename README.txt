New York City's Wastewater Treatment System
===========================================

Project Overview
----------------
This project is an interactive web map about New York City's wastewater treatment
system. It shows the city's wastewater resource recovery facilities, the
sewershed areas that flow toward those facilities, and a summary table of plant
details such as year built, design capacity, population served, and receiving
waterbody.

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
   - Used to create the map markers, marker popups, and plant summary table.

2. Sewershed GIS data
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
- CSS: layout, sidebar styling, map/table overlays, and responsive design
- JavaScript: map setup, data loading, marker creation, popups, sewershed layer
  styling, table population, and row-click zoom behavior
- Mapbox GL JS: interactive map rendering and map layers
- GeoJSON: sewershed polygon and label data
- CSV: wastewater treatment plant data
- QGIS: used to upload and edit sewershed shapefiles, then export them to
  GeoJSON format
- Python: one-time helper scripts for preparing or modifying GeoJSON data

Main Files
----------
- index.html
  Defines the page structure, including the sidebar, map container, and plant
  summary table.

- styles.css
  Controls the appearance of the page, including the sidebar, summary table,
  table minimize behavior, clickable row styles, and responsive layout.

- script.js
  Initializes the Mapbox map, loads the sewershed GeoJSON, loads the wastewater
  plant CSV, creates plant markers and popups, colors sewersheds, builds the
  summary table, and lets users click table rows to zoom to plant locations.

- wastewater-treatment-plants.csv
  Source data for the 14 wastewater treatment plants shown on the map.

- nyc-sewersheds.geojson
  Sewershed boundary and label data used by the map.

- convert_geojson.py
  Helper script for converting GeoJSON coordinates from EPSG:2263 to EPSG:4326.

- add_label_points.py
  Helper script for creating label point features from sewershed polygons.

- color_sewersheds.py
  Older helper script that modifies sewershed label properties in the GeoJSON.
  It is not used directly by the web page.

How It Works
------------
When the page loads, script.js creates a Mapbox map centered on New York City.
It fetches nyc-sewersheds.geojson and adds the sewersheds as fill, outline, and
label layers. Sewersheds are colored with a JavaScript color map based on each
feature's Sewershed property.

The script also fetches wastewater-treatment-plants.csv, parses the plant data,
and creates a custom marker for each plant. Each marker has a popup with details
about the facility. The same plant data is used to populate the summary table.
Clicking a row in the table zooms the map to that plant and opens its popup.

Notes
-----
This project is designed for education, exploration, and communication. Because
the sewershed layers are not official planning data, the map should not be used
for engineering, regulatory, legal, or planning decisions.
