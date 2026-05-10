#!/usr/bin/env python3
"""Add sewershed labels to GeoJSON"""

import json

# Load the GeoJSON
with open('nyc-sewersheds.geojson', 'r') as f:
    geojson = json.load(f)

features = geojson['features']

# Add labels to features
for feature in features:
    sewershed_name = feature['properties'].get('Sewershed')
    
    # Grey out Central Park, no label for NA or null
    if sewershed_name and 'CENTRAL' in sewershed_name.upper():
        feature['properties']['label'] = None
    elif sewershed_name and sewershed_name == 'NA':
        feature['properties']['label'] = None
    else:
        feature['properties']['label'] = sewershed_name

# Write the updated GeoJSON
with open('nyc-sewersheds.geojson', 'w') as f:
    json.dump(geojson, f)

print("✓ Sewershed labels added")
print(f"  - {sum(1 for f in features if f['properties'].get('label'))} sewersheds labeled")
