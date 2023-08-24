
/*

// Process Mapbox API Directions response from local file and
// return a list of (sampled) coordinates

const fs = require("fs");

const file = "response_multi.json";
fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
        console.log("Error reading file:", err);
        return
    }
    try {
        const json = JSON.parse(data);
        const coordinates = transformCoordinates(json);
        console.log(JSON.stringify(coordinates, null, 0));
    } catch(Err) {
        console.log("Error parsing JSON", err);
    }
});

function transformCoordinates(response) {
    const coordinates = response.routes[0].geometry.coordinates
    // console.log(coordinates.length);

    const sampledCoordinates = coordinates.filter(function(value, index, Arr) {
        const SAMPLE_RATE = 2;         // sampling rate
        return index % SAMPLE_RATE == 0;
    });
    // console.log(sampledCoordinates.length);

    return sampledCoordinates;
}
*/


/*

// MAIN CONFIG FOR MARKERS AND ROUTE THAT ARE GENERATED
const markers = [
    {
        name: "Phuket",
        coordinates: [98.386793, 7.888931],
        image: "./assets/lol.png",
    },
    {
        name: "Chiang Mai",
        coordinates: [98.9858802, 18.7882778],
        image: "./assets/jetpack.png",
    },
    {
        name: "Bangkok",
        coordinates: [100.4935089, 13.7524938],
        image: "./assets/bandkok.jpg",
    },
];

function generateMarkerFeatureCollection(markers) {
    const transformedFeatures = markers.map(item => {
        return {
            type: "Feature",
            properties: {
                message: item.name,
                imageUrl: item.image,
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

    console.log(JSON.stringify(transformedData, null, 2));

    return transformedData;
}
generateMarkerFeatureCollection(markers);

*/




// API call to Maps Directions API 


