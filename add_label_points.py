#!/usr/bin/env python3
"""Add centroid points to sewersheds for label placement"""

import json
from shapely.geometry import shape

# Load the GeoJSON
with open('nyc-sewersheds.geojson', 'r') as f:
    geojson = json.load(f)

features = geojson['features']

# Create a new FeatureCollection with polygon features and separate point features for labels
label_features = []

for feature in features:
    geom = shape(feature['geometry'])
    centroid = geom.centroid
    
    # Create a point feature for the label
    if feature['properties'].get('label'):  # Only create points for labeled sewersheds
        label_feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [centroid.x, centroid.y]
            },
            'properties': {
                'label': feature['properties']['label'],
                'isLabel': True
            }
        }
        label_features.append(label_feature)

# Add label point features to the GeoJSON
geojson['features'].extend(label_features)

# Write the updated GeoJSON
with open('nyc-sewersheds.geojson', 'w') as f:
    json.dump(geojson, f)

print(f"✓ Added {len(label_features)} label points at polygon centroids")
