// Read from client first?


// Initialize Map
mapboxgl.accessToken = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';
const map = new mapboxgl.Map({
    container: 'map',
    // style: 'mapbox://styles/mapbox/streets-v12',
    style: 'mapbox://styles/mapbox/navigation-guidance-night-v2',
    center: [98.9858802, 18.7882778],
    zoom: 10
});

function generateMap(data) {

    const geojson = data.markers;

    // Add markers to the map.
    for (const marker of geojson.features) {

        // Create a DOM element for each marker.
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = `url(${marker.properties.imageUrl})`;

        el.addEventListener('click', () => {
            window.alert(marker.properties.message);
        });

        // Add markers to the map.
        new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .addTo(map);
    }

    var pulsingDot = generatePulsingDot()
    const coordinates = data.coordinates;

    map.on('load', () => {

        // Add Layer for Route 
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': coordinates
                }
            }
        });
        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#888',
                'line-width': 8,
                "line-dasharray":{
                    "stops": [
                        [0, [5, 1]],
                        [8, [3, 2]]
                    ]
                }
            }
        });

        // Pulsing dot
        const chiang_mai = [98.9858802,18.7882778];
        map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
        map.addSource('dot-point', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': chiang_mai
                        }
                    }
                ]
            }
        });
        map.addLayer({
            'id': 'layer-with-pulsing-dot',
            'type': 'symbol',
            'source': 'dot-point',
            'layout': {
                'icon-image': 'pulsing-dot'
            }
        });
    });
};


function generatePulsingDot() {

    const size = 200;
    return {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),

        // When a new layer is added to the map, 
        // get the rendering context for the map canvas
        onAdd: function() {
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.width;
            this.context = canvas.getContext('2d');
        },

        // call once before every frame where the icon will be used
        render: function() {
            const duration = 2000;
            const t = (performance.now() % duration) / duration;

            const radius = (size / 2) * 0.5;
            const outerRadius = (size / 2) * 0.7 * t + radius;
            const context = this.context;

            // Draw outer circle
            context.clearRect(0, 0, this.width, this.height);
            context.beginPath();
            context.arc(
                this.width / 2,
                this.height / 2,
                outerRadius,
                0,
                Math.PI * 2
            );
            context.fillStyle = `rgba(255, 200, 200, ${1 - t}`;
            context.fill();

            // update this image's data with data from the canvas
            this.data = context.getImageData(
                0,
                0,
                this.width, 
                this.height
            ).data;

            // continuously repait the map, resulting in the smooth animation of the dot.
            map.triggerRepaint();

            // return 'true' to let the map know the image was updated
            return true;
        }
    };
}

const fetchData = fetch('mapbox_data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .catch(error => {
        console.error('Error fetching the file:', error);
    });


fetchData.then(data => {
    if (data) {
        generateMap(data);
    }
})