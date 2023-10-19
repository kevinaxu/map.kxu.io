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

const DEBUG = false;

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
    "all": [
        [
            89.20004011241173, 
            -12.342977303436726
        ],
        [   
            134.5055133573236,  
            21.517103163038342
        ]
    ],
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
const BOUND_BOX_MOBILE = {
    "all": [
        [
            95.37898714168989,
            -17.928112411988835
        ],
        [
            118.42122415521891,
            30.142620141057122
        ]
    ],
    "phuket": [
        [
            98.25700520854429,
            7.7597966960227325
        ],
        [
            98.44581871661205,
            8.164468533165461
        ]
    ],
    "koh_tao": [
        [
            99.8067872380941,
            10.038027352920338
        ],
        [
            99.85593274052593,
            10.14273819607466
        ]
    ],
    "koh_samui": [
        [
            99.94224535787339,
            9.312283169989882
        ],
        [
            100.11190345587522,
            9.674411747420763
        ]
    ],
    "singapore":[
        [
            103.793504757118,
            1.103401776461638
        ],
        [
            104.02827547922914,
            1.6113254662341348
        ]
    ],
    "bali": [
        [
            115.02402650911682,
            -9.279355792538908
        ],
        [
            115.70661479062204,
            -7.818618975760501
        ]
    ]
}
var openPopup = null;


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
        initMarkerCirclesAndEventListeners(data);
        initFitBoundsAllMarkers();
        initializeSwipeEventListeners();
    }
})


/*******************************************************************
 * 
 * Actions
 * 
 * Fit All  
 *  When a user clicks the button, `fitBounds()` zooms and pans
 *  the viewport to contain a bounding box surrounding all Markers.
 *  The [lng, lat] pairs are the southwestern and northeastern
 *  corners of the specified geographical bounds.
 * 
 * - https://docs.mapbox.com/mapbox-gl-js/api/map/#map#fitbounds
 * 
 ********************************************************************/

function initFitBoundsAllMarkers() {
    document.getElementById('fit-all').addEventListener('click', () => {
        map.fitBounds(BOUND_BOX_WEB["all"]);
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


if (DEBUG) {
    // Log zoom level and bounding coordinates when the map moves
    map.on('move', function() {
        var zoom = map.getZoom();
        var bounds = map.getBounds();
        console.log('Zoom Level:', zoom);
        console.log('Bounding Coordinates:', bounds.toArray()); // [southwest, northeast]
    });
}

function generateMap(data) {
    for (const region of data) {
        generateRegion(region);
    }
};

/**
 * Adds a marker to the map using the provided feature object.
 * @param {Object} feature - The feature object containing the marker's properties and coordinates.
 * @param {string} feature.properties.icon - The URL of the marker's icon image.
 * @param {Array<number>} feature.geometry.coordinates - The longitude and latitude coordinates of the marker.
 */
function addMarkerToMap(feature) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = `url(${feature.properties.icon})`;

    var marker = new mapboxgl.Marker(el)
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);
    return marker;
}

var currentOpenPopup = null;
function addPopUpToMarker(feature, marker) {
    var anchor = (isMobileScreenSize()) ? "top"         : "top-left";
    var offset = (isMobileScreenSize()) ? [-60, -700]   : [150, -500];

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
        // don't show popup if we're zooming to region 
        if (shouldZoomToRegion()) {
            popup.remove();
            currentOpenPopup = null;
        } else {
            var carousel = new PopupCarousel(popup);
            currentOpenPopup = carousel;
        }
    });
    popup.on('close', () => {
        currentOpenPopup = null;
    });
    marker.setPopup(popup);
}

class PopupCarousel {

    updatePosition() {
        for (let img of this.imgs) {
            img.classList.remove('visible');
            img.classList.add('hidden');
        }
        this.imgs[this.imagePosition].classList.remove('hidden');
        this.imgs[this.imagePosition].classList.add('visible')

        //   Dots
        for (let dot of this.dots) {
            dot.className = dot.className.replace(" active", "");
        }
        this.dots[this.imagePosition].classList.add('active');
    }

    nextImage() {
        if (this.imagePosition === this.imageCount - 1) {
            this.imagePosition = 0;
        } else {
            this.imagePosition++;
        }
        this.updatePosition();
    }; 
    prevImage() {
        if (this.imagePosition === 0) {
            this.imagePosition = this.imageCount - 1;
        } else {
            this.imagePosition--;
        }
        this.updatePosition();
    }

    initEventListeners() {
        // Event Listeners: Button Click
        this.next.addEventListener('click', this.nextImage.bind(this));
        this.prev.addEventListener('click', this.prevImage.bind(this));

        // Event Listeners: Dot Click
        this.dots.forEach((dot, dotPosition) => {
            dot.addEventListener("click", () => {
                this.imagePosition = dotPosition;
                this.updatePosition(dotPosition);
            })
        })
    }

    constructor(popup) {
        this.popup = popup;
        this.prev = document.querySelector('.prev');
        this.next = document.querySelector('.next');
        this.imgs = document.querySelectorAll('.carousel-img');
        this.dots = document.querySelectorAll('.dot');
        this.imagePosition = 0;
        this.imageCount = this.imgs.length;

        this.initEventListeners();
    }
}

/**
 * Generates markers and a route on a map for a given region.
 * Mobile and Desktop have different values for:
 *  - anchor: popup display relative to marker
 *  - offset: coordinates to move popup
 * @param {Object} region - The region object containing markers and coordinates for the route.
 */
function generateRegion(region) {
    for (const feature of region.markers.features) {

        // do not display markers that were only used for route building
        if (feature.properties.ignore === true) continue;
        var marker = addMarkerToMap(feature);

        // do not add popup if there are no images
        if (feature.properties.images.length == 0) continue;
        var marker = addPopUpToMarker(feature, marker);
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
 * Helpers
 * 
 ********************************************************************/

function shouldZoomToRegion() {
    const zoomThreshold = 9;
    return map.getZoom() < zoomThreshold;
}

function isMobileScreenSize() {
    return (window.innerWidth < 767);
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

/**
 * Initializes the map with marker circles and event listeners
 * @param {Object} data - The data containing the markers to be added to the map.
 */
function initMarkerCirclesAndEventListeners(data) {
    var features = data.map(item => item.markers.features).flat();
    map.on('load', () => {
        const layerID = 'marker-circles';
        addLayerForMarkerCircles(features, layerID);
        
        map.on('click', layerID, (event) => {
            handleMarkerCircleClickEvent(event);
        });
        
        // Cursor becomes Pointer when cursor enters any Marker 'circle' object
        map.on('mouseenter', layerID, () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerID, () => {
            map.getCanvas().style.cursor = '';
        });
    });
}

/**
 * "Center" the map on the coordinates of any clicked marker circle
 *  - If the zoom level is high enough
 *      clicking on a Marker will instead zoom to region 
 *  - If the zoom level is low
 *      clicking on a Marker will zoom in to that Marker
 * If shouldZoomToRegion() returns true, zooms the map to the region of the clicked marker.
 * Otherwise, calculates the popup open position and flies to it.
 * @param {Object} e - The event object.
 */
function handleMarkerCircleClickEvent(e) {
    if (shouldZoomToRegion()) {
        var region = e
            .features[0].properties.region
            .toLowerCase().replaceAll(" ", "_");
        (isMobileScreenSize()) ? 
            map.fitBounds(BOUND_BOX_MOBILE[region]) :
            map.fitBounds(BOUND_BOX_WEB[region]);
    } else {
        var center = calculatePopupOpenPosition(e.features[0].geometry.coordinates);
        map.flyTo({
            center: center,
            speed: 0.4,
            essential: true
        });
    }
}

/**
 * Adds a layer for marker circles to the map.
 * Markers are separate from Layers in Mapbox
 * Instead of adding individual callbacks to Markers, 
 * create a separate Layer with transparent circles over Marker coordinates
 * @param {Object[]} features - An array of GeoJSON features.
 * @param {string} layerID - The ID of the layer to be added.
 */
function addLayerForMarkerCircles(features, layerID) {
    map.addSource('points', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': features
        }
    });
    map.addLayer({
        'id': layerID,
        'type': 'circle',
        'source': 'points',
        'paint': {
            "circle-opacity": 0,
            'circle-radius': 40,

            // DEBUG: uncomment to see circles
            //'circle-stroke-width': 2,
            //'circle-stroke-color': '#FF0000'
        }
    });
}

/**
 * Calculates the position to open a popup on the map based on the given coordinates.
 *  - mobile: marker position bottom-center, popup position top-center
 *  - desktop: marker position bottom-left, popup position center-right
 * @param {number[]} coordinates - The coordinates to calculate the popup position from.
 * @returns {number[]} - The new center coordinates for the popup.
 */
function calculatePopupOpenPosition(center) {
    const bounds = map.getBounds();
    var heightWindow  = Math.abs(bounds.getNorthEast().lat - bounds.getSouthWest().lat),
        widthWindow   = Math.abs(bounds.getNorthEast().lng - bounds.getSouthWest().lng);

    var newCenter = [];
    if (isMobileScreenSize()) {
        newCenter = [
            center[0] + (widthWindow * 0),
            center[1] + (heightWindow * 0.35)
        ];
    } else {
        newCenter = [
            center[0] + (widthWindow * 0.20),
            center[1] + (heightWindow * 0.25)
        ];
    }
    return newCenter;
}


/*******************************************************************
 * 
 * Popup Static Generation
 * 
 ********************************************************************/

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

// TODO: update this for video support
function generateImageHTML(images) {
    var strings = [];
    for (var i = 0; i < images.length; i++) {

        var status = (i === 0 ? "visible" : "hidden");

        if (images[i].includes("mp4")) {
            console.log(`video: ${images[i]}`);
            strings.push(
                `<video controls class="carousel-img object-cover ${status}">
                    <source src="${images[i]}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
              `
            );
        } else {
            console.log(`image: ${images[i]}`);
            strings.push(`<img src="${images[i]}" class="carousel-img ${status}"/>`);
        }
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

// HERE: When a swipe event is detected
//  - swipe left: next
//  - swipe right: prev
function initializeSwipeEventListeners() {
    let touchstartX = 0
    let touchendX = 0
    
    document.addEventListener('touchstart', (event) => {
        touchstartX = event.changedTouches[0].screenX
    });
    document.addEventListener('touchend', (event) => {
        if (currentOpenPopup === null) return;

        touchendX = event.changedTouches[0].screenX
        if (touchendX < touchstartX) {
            console.log('swiped left!');
            currentOpenPopup.nextImage();
        }
        if (touchendX > touchstartX) {
            console.log('swiped right!')
            currentOpenPopup.prevImage();
        }
    });
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