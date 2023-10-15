/*******************************************************************
 * Main Map Client-Side Logic
 * 
 * This file handles: 
 * - Rendering Mapbox map
 * - Adding a pulsing dot to the current location as a separate Layer
 * - Load data.json which contains Route and Marker data
 * - Display each Region's Routes and Markers as separate Layers
 * 
 * Inputs: data.json
 * Output: Mapbox map
 * 
 ********************************************************************/

// TODO: make these dynamic by pulling from trip_config? 
const COORD_PULSING_DOT = [
    115.253722,
    -8.485309
];
const COORD_CENTER = [
    115.257839, 
    -8.471635
];
const BOUND_BOX_WEB = {
    "phuket": [
        [
            98.04800465357789,
            7.752937661996512
        ],
        [
            98.78154160177911,
            8.151493527213887
        ]
    ],
    "koh_tao": [
        [
            99.77328594670786,
            10.057355608026043
        ],
        [
            99.90416289309269,
            10.128045073024353
        ]
    ],
    "koh_samui": [
        [
            99.91289481290858,
            9.460125644081558
        ],
        [
            100.17605827641927,
            9.602506950752613
        ]
    ],
    "singapore": [
        [
            103.81646041963853,
            1.2562628408730916
        ],
        [
            104.00478793236795,
            1.3995564154381697
        ]
    ],
    "bali": [
        [
            114.70468978030357,
            -8.832635626031418
        ],
        [
            115.99704104218546,
            -8.13139681745605
        ]
    ]
}


const fetchData = fetch('data.json')
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
        renderPulsingDot();
        initFlyTo(data);
        initFitTo();
    }
})




/*******************************************************************
 * 
 * Fit All 
 * 
 * When a user clicks the button, `fitBounds()` zooms and pans
 * the viewport to contain a bounding box surrounding all Markers.
 * The [lng, lat] pairs are the southwestern and northeastern
 * corners of the specified geographical bounds.
 * 
 ********************************************************************/


function initFitTo() {
    document.getElementById('fit-all').addEventListener('click', () => {
        map.fitBounds([
            [89.20004011241173, -12.342977303436726],   // SW
            [134.5055133573236, 21.517103163038342]     // NE
        ]);  
    });
}

/*******************************************************************
 * 
 * Map Generation
 * 
 ********************************************************************/

mapboxgl.accessToken = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/navigation-guidance-night-v2',
    center: COORD_CENTER,
    zoom: 9.5
});

// Log zoom level and bounding coordinates when the map moves
map.on('move', function() {
    var zoom = map.getZoom();
    var bounds = map.getBounds();
    console.log('Zoom Level:', zoom);
    console.log('Bounding Coordinates:', bounds.toArray()); // [southwest, northeast]
});

// data {name, markers, coordinates}
function generateMap(data) {
    for (var i = 0; i < data.length; i++) {
        generateRegion(data[i]);
    }
};

function generateRegion(region) {
    const geojson = region.markers;

    // MEDIA QUERY CHECK 
    var anchor = (window.innerWidth < 767) ?
        "top" :             // mobile 
        "top-left";         // desktop
    var offset = (window.innerWidth < 767) ?
        [-60, -700] :       // mobile 
        [150, -500];        // desktop 

    // Markers
    for (const feature of geojson.features) {
        if (feature.properties.ignore === true) {
            continue;
        }

        // Create a DOM element for each marker.
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = `url(${feature.properties.icon})`;

        var marker = new mapboxgl.Marker(el)
            .setLngLat(feature.geometry.coordinates)
            .addTo(map);

        // don't add popup if there are no images
        if (feature.properties.images.length == 0) {
            // console.log("No images for this marker, skipping popup...", feature.properties.message);
            continue;
        }

        const popupHTML = getPopupHTML(feature.properties.images, feature.properties.captions);
        const popup = new mapboxgl
            .Popup({ 
                anchor: anchor,
                offset: offset,
                closeOnClick: true,
                closeButton: false
            })
            .setHTML(popupHTML);

        popup.on('open', () => {
            attachPopupListeners(popup);
        });

        marker.setPopup(popup);
    }

    // Route
    map.on('load', () => {
        var sourceId = "route-" + region.name.toLowerCase().replace(/\s/g, '-');
        map.addSource(sourceId, region.coordinates);
        map.addLayer({
            "id": sourceId,
            "type": "line",
            "source": sourceId,
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-width": 4,
                "line-color": "gray",
                "line-dasharray": [2, 2]        // Set the line to be dotted (alternating 2 units of line followed by 2 units of gap)
            }
        });
    });
}


/*******************************************************************
 * 
 * Zoom Region
 * 
 * When the map is very zoomed out, we want to only display a single
 * Marker from the region to prevent Markers from rendering over each
 * other. 
 * 
 * Then, we want to add event listener so that onClick of those Markers,
 * we zoom in to that region and display all Markers.
 *  - map.fitBounds() - hard code
 *  - zoom level - hard code 
 * 
 ********************************************************************/

/*******************************************************************
 * 
 * Markers
 * 
 ********************************************************************/


// this method takes in ALL markers
// map on load: 
//  addSource(all marker coordinates)
//  addLayer using the source
//  create a event listener on map click which will fly to clicked circles
//  test interaction withs with the popup


// iterate over the regions
// checking the cooridnate is in the region 
// if yes, then return the bounding box for that region
function lookupRegionBoundingBoxFromMarker(coordinateToCheck) {
    for (const [region, coordinates] of Object.entries(BOUND_BOX_WEB)) {
        if (isCoordinateInBoundingBox(coordinateToCheck, coordinates[0], coordinates[1])) {
            console.log(`Marker is in ${region}`);
            return coordinates;
        } else {
            return null;
        }
    }
}

function isCoordinateInBoundingBox(coordinate, bbox_sw, bbox_ne) {
    const [minLng, minLat] = bbox_sw;
    const [maxLng, maxLat] = bbox_ne
    const [lng, lat] = coordinate;

    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function initFlyTo(data) {
    var features = [];
    for (var i = 0; i < data.length; i++) {
        features = features.concat(data[i].markers.features);
    }

    map.on('load', () => {
        map.addSource('points', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': features
            }
        });

        // Add a circle layer
        map.addLayer({
            'id': 'fly-to-points',
            'type': 'circle',
            'source': 'points',
            'paint': {
                "circle-opacity": 0,
                'circle-radius': 40,
                //'circle-stroke-width': 2,
                //'circle-stroke-color': '#FF0000'
            }
        });
        
        // "Center"" the map on the coordinates of any clicked circle from the 'circle' layer.
        map.on('click', 'fly-to-points', (e) => {
            var center = e.features[0].geometry.coordinates;
        
            const zoomThreshold = 9;
            if (map.getZoom() < zoomThreshold) {
                console.log("Marker click while map is zoomed out, fitting to Region");
                console.log("Center:", center);

                var bb = lookupRegionBoundingBoxFromMarker(center);
                console.log("boudning box", bb);
                if (bb == null) return;

                map.fitBounds(
                    lookupRegionBoundingBoxFromMarker(center)
                );
            } else {
                // if mobile view, then offset Marker to bottom center of Map
                // otherwise, offset to bottom left
                const bounds = map.getBounds();
                var height  = Math.abs(bounds.getNorthEast().lat - bounds.getSouthWest().lat);
                var width   = Math.abs(bounds.getNorthEast().lng - bounds.getSouthWest().lng);

                var newCenter = [];
                if (window.innerWidth < 767) {
                    // console.log('Mobile!');
                    const OFFSET_PERCENTAGE = 0.35;
                    var h_offset = height * OFFSET_PERCENTAGE;
                    newCenter = [
                        center[0],
                        center[1] + h_offset
                    ];
                } else {
                    // console.log('Desktop!');
                    var h_offset = height * 0.25;
                    var w_offset = width * 0.20;
                    newCenter = [
                        center[0] + w_offset,
                        center[1] + h_offset
                    ];
                }
        
                map.flyTo({
                    center: newCenter,
                    speed: 0.4,
                    essential: true // This animation is considered essential with
                });
            }


        });
        
        // Change the cursor to a pointer when the it enters a feature in the 'circle' layer.
        map.on('mouseenter', 'fly-to-points', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'fly-to-points', () => {
            map.getCanvas().style.cursor = '';
        });
    });
}

function getPopupHTML(images, caption) {
    const popupHTML = `
        <div class="carousel-container">
            <div class="carousel-imgs">
                ${generateImageHTML(images)}
            </div>
            <a class="prev arrow">&#10094;</a>
            <a class="next arrow">&#10095;</a>
            <div class="slide-numbers">
                ${generateDotHTML(images.length)}
            </div>
        </div>
        <p class="carousel-caption">${caption}</p>
    `;
    return popupHTML;
}

function generateImageHTML(images) {
    var strings = [];
    for (var i = 0; i < images.length; i++) {
        var status = (i === 0 ? "visible" : "hidden");
        strings.push(`<img src="${images[i]}" class="carousel-img ${status}"/>`);
    }
    return strings.join("\n");
}

function generateDotHTML(count) {
    var strings = [];
    for (var i = 0; i < count; i++) {
        if (i === 0) {
            strings.push(`<span class="dot active"></span>`);
        } else {
            strings.push(`<span class="dot"></span>`);
        }
    }
    return strings.join("\n");
}

// For each marker, a popup is created with a button
// The event listener for the button is now set inside the popup's 'open' event, 
// ensuring that each button is correctly associated with its respective marker's message.
function attachPopupListeners(popup) {

    // Variables
    let prev = popup.getElement().querySelector('.prev');
    let next = popup.getElement().querySelector('.next');
    let imgs = popup.getElement().querySelectorAll('.carousel-img');
    let dots = popup.getElement().querySelectorAll('.dot');

    let totalImgs = imgs.length;
    let imgPosition = 0;

    // Event Listeners
    next.addEventListener('click', nextImg);
    prev.addEventListener('click', prevImg);

    // Update Image / Dot position 
    function updatePosition() {
        for (let img of imgs) {
            img.classList.remove('visible');
            img.classList.add('hidden');
        }
        imgs[imgPosition].classList.remove('hidden');
        imgs[imgPosition].classList.add('visible')

        //   Dots
        for (let dot of dots) {
            dot.className = dot.className.replace(" active", "");
        }
        dots[imgPosition].classList.add('active');
    }

    // Next Img
    function nextImg() {
        if (imgPosition === totalImgs - 1) {
            imgPosition = 0;
        } else {
            imgPosition++;
        }
        updatePosition();
    }
    //Previous Image
    function prevImg() {
        if (imgPosition === 0) {
            imgPosition = totalImgs - 1;
        } else {
            imgPosition--;
        }
        updatePosition();
    }
    // Dot Position
    dots.forEach((dot, dotPosition) => {
        dot.addEventListener("click", () => {
            imgPosition = dotPosition
            updatePosition(dotPosition)
        })
    })
}


/*******************************************************************
 * 
 * Pulsing Dot
 * 
 ********************************************************************/

function renderPulsingDot() {
    var pulsingDot = generatePulsingDot();
    map.on("load", () => {
        map.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });
        map.addSource("dot-point", {
            "type": "geojson",
            "data": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": COORD_PULSING_DOT
                        }
                    }
                ]
            }
        });
        map.addLayer({
            "id": "layer-with-pulsing-dot",
            "type": "symbol",
            "source": "dot-point",
            "layout": {
                "icon-image": "pulsing-dot"
            }
        });
    });
}

function generatePulsingDot() {

    const size = 220;
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

            const radius = (size / 2) * 0.3;
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