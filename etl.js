/*******************************************************************
 * Transform list of Markers into Mapbox-consumable geoJSON
 ********************************************************************/

const fs = require('fs');
const fetch = require('node-fetch');

const TRIP_CONFIG_PATH = "./trip_config.json";
const MAPBOX_API_KEY    = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';
const MAPBOX_ENDPOINT   = 'https://api.mapbox.com/directions/v5/mapbox/walking/';

// read in the trip_config.json file
async function readTripConfig() {
    
    const data = fs.readFileSync(TRIP_CONFIG_PATH);
    const regions = JSON.parse(data);

    const markerLayers  = generateMarkerLayers(regions);
    const routeLayers   = await generateRouteLayers(regions);
}


/*******************************************************************
 * ROUTE: Transform user-input Markers into Mapbox route
 * Requires the use of Mapbox Directions API
 * 
 * Input:  [] markers for each region (trip_config.json)
 * Output: [] geoJSON that can be used directly as Mapbox 'source'
 ********************************************************************/


async function generateRouteLayers(regions) {
    var routeLayers = [];
    for (var i = 0; i < regions.length; i++) {
        const region = regions[i];

        console.log(`Generating Route layer for ${region.name}...`);
        const routeLayer = await getRouteCoordinates(region.markers);
        routeLayers.push(
            routeLayer
        );
        // break;
    }
    // console.log(JSON.stringify(routeLayers, null, 2));
    return routeLayers;
}


async function getRouteCoordinates(markers) {

    const coordinatesString = markers
        .map(marker => marker.coordinates.join(','))
        .join(';');

    try {

        /* 
        const params = {
            "alternatives": "true",
            "steps": "true",
            "geometries": "geojson",
            "overview": "full",
            "access_token": MAPBOX_API_KEY
        };
        */

        const apiParameters = `${MAPBOX_ENDPOINT}${coordinatesString}?alternatives=true&steps=true&geometries=geojson&overview=full&access_token=${MAPBOX_API_KEY}`;

        const response = await fetch(apiParameters);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        // console.log(JSON.stringify(data, null, 0));

        const coordinates = transformCoordinates(data);
        // console.log(JSON.stringify(coordinates, null, 0));


        // Add Layer for Route 
        return {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }
        };

    } catch (error) {
        console.error(`Error getting directions: ${error.message}`);
    }
}
function transformCoordinates(response) {
    const coordinates = response.routes[0].geometry.coordinates
    // console.log(coordinates.length);

    const sampledCoordinates = coordinates.filter(function(value, index, Arr) {
        const SAMPLE_RATE = 1;         // sampling rate
        return index % SAMPLE_RATE == 0;
    });
    // console.log(sampledCoordinates.length);

    return sampledCoordinates;
}


/*******************************************************************
 * MARKERS: Transform user-input Markers into Mapbox consumable geoJSON
 * 
 * Each region creates a separate layer for Mapbox
 * 
 * Input:  [] markers for each region (trip_config.json)
 * Output: [] geoJSON that can be used directly as Mapbox 'source'
 * 
 ********************************************************************/

function generateMarkerLayers(regions) {
    var markerLayers = [];
    for (var i = 0; i < regions.length; i++) {
        const region = regions[i];

        console.log(`Generating Marker layer for ${region.name}...`);
        markerLayers.push(
            generateMarkerFeatureCollection(region.markers)
        );
        // break;
    }
    console.log(JSON.stringify(markerLayers, null, 2));
    return markerLayers;
}


function generateMarkerFeatureCollection(markers) {
    const transformedFeatures = markers.map(item => {
        return {
            type: "Feature",
            properties: {
                message: item.name,
                icon: item.icon,
                images: item.images,
                captions: item.captions,
                ignore: item.ignore,
            },
            geometry: {
                type: "Point",
                coordinates: item.coordinates,
            },
        };
    });
    return {
        type: "FeatureCollection",
        features: transformedFeatures,
    };
}


readTripConfig();