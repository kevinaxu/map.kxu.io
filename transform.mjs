
// MAIN CONFIG FOR MARKERS AND ROUTE THAT ARE GENERATED
import fetch from 'node-fetch';

const markers = [
    {
        name: "Phuket",
        coordinates: [98.386793, 7.888931],
        icon: "./assets/lol.png",
        images: [
            "https://i.imgur.com/3rCW1xj.png",
            "https://i.imgur.com/AsXzjqX.png",
            "https://i.imgur.com/aJndu7X.png"
        ],
        captions: [
            "Caption 1",
            "Caption 2",
            "Caption 3"
        ]
    },
    {
        name: "Chiang Mai",
        coordinates: [98.9858802, 18.7882778],
        icon: "./assets/jetpack.png",
        images: [
            "https://i.imgur.com/3rCW1xj.png",
            "https://i.imgur.com/AsXzjqX.png",
            "https://i.imgur.com/aJndu7X.png"
        ],
        captions: [
            "Caption 1",
            "Caption 2",
            "Caption 3"
        ]
    },
    {
        name: "Bangkok",
        coordinates: [100.4935089, 13.7524938],
        icon: "./assets/bangkok.jpg",
        images: [
            "https://i.imgur.com/3rCW1xj.png",
            "https://i.imgur.com/AsXzjqX.png",
            "https://i.imgur.com/aJndu7X.png"
        ],
        captions: [
            "Caption 1",
            "Caption 2",
            "Caption 3"
        ]
    },
    {
        name: "Chiang Dao",
        coordinates: [98.953466, 19.550373],
        icon: "./assets/lol.png",
        images: [
            "https://i.imgur.com/3rCW1xj.png",
            "https://i.imgur.com/AsXzjqX.png",
            "https://i.imgur.com/aJndu7X.png"
        ],
        captions: [
            "Caption 1",
            "Caption 2",
            "Caption 3"
        ]
    },
];

/*******************************************************************
 * Transform list of Markers into Mapbox-consumable geoJSON
 * 
 * Input:   markers []
 * Output:  geoJSON {}
 * 
 ********************************************************************/

function generateMarkerFeatureCollection(markers) {
    const transformedFeatures = markers.map(item => {
        return {
            type: "Feature",
            properties: {
                message: item.name,
                icon: item.icon,
                images: item.images,
                captions: item.captions,
            },
            geometry: {
                type: "Point",
                coordinates: item.coordinates,
            },
        };
    });

    const transformedData = {
        type: "FeatureCollection",
        features: transformedFeatures,
    };

    return transformedData;
}


/*******************************************************************
 * Generate Route Coordinates using Mapbox Directions
 * API and list of Markers
 * 
 * Apply sampling rate to coordinates to reduce payload size
 * 
 * Input:   markers []
 * Output:  coordinates {}
 * 
 ********************************************************************/

async function getRouteCoordinates() {
    const accessToken = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';
    const apiUrl = 'https://api.mapbox.com/directions/v5/mapbox/driving/';

    const coordinatesString = markers.map(marker => marker.coordinates.join(',')).join(';');
    console.log(coordinatesString);

    try {
        const apiParameters = `${apiUrl}${coordinatesString}?alternatives=true&steps=true&geometries=geojson&overview=full&access_token=${accessToken}`;
        const response = await fetch(apiParameters);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        // console.log(JSON.stringify(data, null, 0));

        const coordinates = transformCoordinates(data);
        // console.log(JSON.stringify(coordinates, null, 0));

        return coordinates;
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


(async () => {
    const geoJSON = generateMarkerFeatureCollection(markers);
    // console.log("geoJSON", JSON.stringify(transformedData, null, 2));

    const coordinates = await getRouteCoordinates();

    const payload = {
        "coordinates": coordinates,
        "markers": geoJSON,
    }
    console.log(JSON.stringify(payload, null, 0));
})();