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
        initializeWelcomeOverlay();
        handleMapEventListeners();
    }
})


/*******************************************************************
* 
* Controls - Fit All 
*  When a user clicks the button, `fitBounds()` zooms and pans
*  the viewport to contain a bounding box surrounding all Markers.
*  The [lng, lat] pairs are the southwestern and northeastern
*  corners of the specified geographical bounds.
* 
* - https://docs.mapbox.com/mapbox-gl-js/api/map/#map#fitbounds
* 
********************************************************************/

function initFitBoundsAllMarkers() {
    document.getElementById('fitAllButton').addEventListener('click', () => {
        if (currentOpenPopup) {
            currentOpenPopup.remove();
            currentOpenPopup = null;
        }
        map.fitBounds(BOUND_BOX_WEB["all"], { padding: 36 });
    });
}

/*******************************************************************
* 
* Map Generation
* 
********************************************************************/


// TODO: make these dynamic by pulling from trip_config? 
const COORD_PULSING_DOT = [
    100.7502555,
    13.68970625
];
const ZOOM_LEVEL = {
    desktop:    4.098763897292316,
    mobile:     3.692289371775777
}
const COORD_CENTER = {
    desktop: [
        106.94335249999995,
        5.900714423198394
    ],
    mobile: [
        106.94335249999995,
        5.900714423198394
    ]
}

mapboxgl.accessToken = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/navigation-guidance-night-v2',
    center: isMobile()  ? COORD_CENTER.mobile   : COORD_CENTER.desktop,
    zoom:   isMobile()  ? ZOOM_LEVEL.mobile     : ZOOM_LEVEL.desktop
});

if (DEBUG) {
    // Log zoom level and bounding coordinates when the map moves
    map.on('move', function() {
        var zoom = map.getZoom();
        var bounds = map.getBounds();
        var center = map.getCenter();
        console.log('Zoom Level:', zoom);
        console.log('Bounding Coordinates:', bounds.toArray()); // [southwest, northeast]
        console.log('Center Coordinates:', center); // [southwest, northeast]
    });
}

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

/**
* Generates markers and a route on a map for a given region.
* Mobile and Desktop have different values for:
*  - anchor: popup display relative to marker
*  - offset: coordinates to move popup
* @param {Object} region - The region object containing markers and coordinates for the route.
*/
function generateMap(data) {
    for (const region of data) {
        generateRegion(region);
    }
};
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
        // console.log(`sourceID: ${sourceId}`);
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
* Bind Popups <--> Markers  
* 
********************************************************************/

var currentOpenPopup = null;
function addPopUpToMarker(feature, marker) {
    // console.log("addPopUpToMarker()", feature.properties.message);
    
    var popupCarousel = new PopupCarousel(feature);
    var popup = popupCarousel.getMapboxPopup();
    
    popup.on('open', () => {
        // don't show popup if we're zooming to region 
        if (shouldZoomToRegion()) {
            popupCarousel.remove();
            currentOpenPopup = null;
        } else {
            popupCarousel.buildPopupElement();
            popupCarousel.initializeCarouselControls();
            popupCarousel.setPopupPositioning();
            currentOpenPopup = popupCarousel;
        }
    });
    popup.on('close', () => {
        currentOpenPopup = null;
    });
    marker.setPopup(popup);
}

function shouldZoomToRegion() {
    const zoomThreshold = 9;
    return map.getZoom() < zoomThreshold;
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
        (isMobile()) ? 
            map.fitBounds(BOUND_BOX_MOBILE[region]) :
            map.fitBounds(BOUND_BOX_WEB[region]);
    } else {
        
        // input: coordinates of the marker circle that was clicked (eg Marker center location) 
        var center = calculatePopupOpenPosition(e.features[0].geometry.coordinates);
        map.flyTo({
            center: center,
            speed: 0.4,
            essential: true
        });
    }
}
function isPortrait() {
    return (window.innerWidth < window.innerHeight);
}
function isMobile() {
    return (window.innerWidth <= 640);
}
function isTablet() {
    return (window.innerWidth <= 768 && window.innerWidth > 640);
}
function isDesktop() {
    return (window.innerWidth > 768);
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



function calculatePopupOpenPosition(center) {
    const bounds = map.getBounds();
    var heightWindow  = Math.abs(bounds.getNorthEast().lat - bounds.getSouthWest().lat),
        widthWindow   = Math.abs(bounds.getNorthEast().lng - bounds.getSouthWest().lng);

    var newCenter = [];
    if (isMobile() && isPortrait()) {
        //console.log("mobile portrait");
        newCenter = [
            center[0],
            center[1] + (heightWindow * 0.4)
        ];
    } else {
        if (isDesktop()) {
            //console.log("desktop");
            newCenter = [
                center[0] + (widthWindow * .25),
                center[1] + (heightWindow * 0.4)
            ];
        } else {
            //console.log("mobile landscape / tablet");
            newCenter = [
                center[0] + (widthWindow * 0.25),
                center[1] + (heightWindow * 0.4)
            ];
        }
    }
    return newCenter;
}


/*******************************************************************
* 
* Controls - Swipe Events 
* 
********************************************************************/

function handleMapEventListeners() {
    map.on('drag', () => {
        if (currentOpenPopup) {
            currentOpenPopup.remove();
            currentOpenPopup = null;
        }
    });
}

function initializeSwipeEventListeners() {
    let touchstartX = 0
    let touchendX = 0
    
    document.addEventListener('touchstart', (event) => {
        touchstartX = event.changedTouches[0].screenX
    });
    document.addEventListener('touchend', (event) => {
        if (currentOpenPopup === null) return;
        touchendX = event.changedTouches[0].screenX
        if (touchendX < touchstartX) {      // swipe left 
            currentOpenPopup.nextImage();
        }
        if (touchendX > touchstartX) {      // swipe right
            currentOpenPopup.prevImage();
        }
    });
}


/*******************************************************************
* 
* UI - Pulsing Dot 
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

/*******************************************************************
* 
* Controls - Welcome Overlay
* 
********************************************************************/

const WELCOME_OVERLAY_STATE_KEY = "shouldShowWelcomeOverlay";
function initializeWelcomeOverlay() {
    const welcomeCheckboxState = localStorage.getItem(WELCOME_OVERLAY_STATE_KEY);
    console.log(`localStorage[${WELCOME_OVERLAY_STATE_KEY}]: ${welcomeCheckboxState}`);
    (shouldShowWelcomeOverlay()) ? showOverlay() : hideOverlay();
}
function showOverlay() {
    document.querySelector("#overlay").style.display = "flex";
    if (!shouldShowWelcomeOverlay()) {
        document.getElementById('welcomeOverlayCheckbox').checked = true;
    }
}
function hideOverlay() {
    document.querySelector("#overlay").style.display = "none";
}
function shouldShowWelcomeOverlay() {
    var state = localStorage[WELCOME_OVERLAY_STATE_KEY];
    if (state === null || state === "false") return false;
    else return true;
}

// Event Listener - update "Don't Show Again" Checkbox state in Local Storage
function toggleWelcomeOverlay() {
    const welcomeCheckbox = document.getElementById('welcomeOverlayCheckbox');
    if (welcomeCheckbox.checked) {
        localStorage[WELCOME_OVERLAY_STATE_KEY] = "false";
    } else {
        localStorage[WELCOME_OVERLAY_STATE_KEY] = "true";
    }
}

// Event Listener - Hide Overlay if clicked outside container
document.querySelector("#overlay").addEventListener('click', function(e) {
    if (!document.getElementById('welcome-message-container').contains(e.target)) {
        hideOverlay();
    }
});

/*******************************************************************
* 
* Bounding Boxes for Zoom In  
* 
********************************************************************/

const BOUND_BOX_WEB = {
    "all": [
        [
            98.294872,
            -8.7461124
        ],
        [
            115.591833,     
            20.17247
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
    ],
    "bangkok": [
        [
            100.37863256730907,
            13.668280871426248
        ],
        [
            100.790091975817,
            13.940404867380153
        ]
    ],
    "chiang_mai": [
        [
            98.93966590620647,
            18.76023028594645
        ],
        [
            99.03126271046528,
            18.81928640722313
        ]
    ],
    "chiang_rai": [ 
        [
            99.28395137849958,
            19.72147992995886
        ],
        [
            100.4266006663247,
            20.30899367851228
        ]
    ]
}
const BOUND_BOX_MOBILE = {
    "all": [
        [
            96.06902162715028,
            -19.144605873381607
        ],
        [
            118.14786248838402,
            27.187959268243034
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
            103.82616842430167,
            1.2347071267121095
        ],
        [
            103.8714950288894,
            1.3327739157118117
        ]
    ],
    "bali": [
        [
            115.04882397695417,
            -9.251644503810567
        ],
        [
            115.66627411336361,
            -7.930442480391477
        ]
    ],
    "bangkok": [
        [
            100.49901228923403,
            13.691014324894738
        ],
        [
            100.55837851949411,
            13.81580527444136
        ]
    ],
    "chiang_mai": [
        [
            98.95974266018857,
            18.730448067683895
        ],
        [
            99.00879550484177,
            18.830951488375703
        ]
    ],
    "chiang_rai": [
        [
            99.69773606165899,
            19.763452995237756
        ],
        [
            99.94202094374464,
            20.260189300571128
        ]
    ]
}