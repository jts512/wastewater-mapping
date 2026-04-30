#!/usr/bin/env python3
"""Convert GeoJSON from EPSG:2263 (NY State Plane) to EPSG:4326 (WGS84)"""

import json
from pyproj import Transformer

# Initialize transformer from NY State Plane (EPSG:2263) to WGS84 (EPSG:4326)
transformer = Transformer.from_crs(2263, 4326)

# Read the GeoJSON file
with open('nyc-sewersheds.geojson', 'r') as f:
    geojson = json.load(f)

# Function to transform coordinates
def transform_coordinates(coords, depth=0):
    """Recursively transform coordinates based on GeoJSON structure"""
    if depth == 0:  # Point
        x, y = coords
        lat, lon = transformer.transform(x, y)
        return [lon, lat]
    elif depth == 1:  # LineString or Ring
        return [transform_coordinates(c, depth - 1) for c in coords]
    else:  # Polygon or MultiLineString etc
        return [transform_coordinates(c, depth - 1) for c in coords]

# Transform all features
for feature in geojson['features']:
    geometry = feature['geometry']
    geom_type = geometry['type']
    
    if geom_type == 'Point':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 0)
    elif geom_type == 'LineString':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 1)
    elif geom_type == 'Polygon':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 2)
    elif geom_type == 'MultiPoint':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 1)
    elif geom_type == 'MultiLineString':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 2)
    elif geom_type == 'MultiPolygon':
        geometry['coordinates'] = transform_coordinates(geometry['coordinates'], 3)

# Update CRS to WGS84
geojson['crs'] = {
    "type": "name",
    "properties": {"name": "urn:ogc:def:crs:EPSG::4326"}
}

# Write the converted GeoJSON
with open('nyc-sewersheds.geojson', 'w') as f:
    json.dump(geojson, f)

print("✓ GeoJSON successfully converted from EPSG:2263 to EPSG:4326")
