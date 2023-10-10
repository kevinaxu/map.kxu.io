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
    98.3013584,
    7.8311951
];
const COORD_CENTER = [
    98.339370,
    7.964535
];

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
    }
})

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


// data {name, markers, coordinates}
function generateMap(data) {
    for (var i = 0; i < data.length; i++) {
        generateRegion(data[i]);
    }
    renderPulsingDot();
};

function generateRegion(region) {
    const geojson = region.markers;

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

        const popupHTML = getPopupHTML(feature.properties.images, feature.properties.captions);
        const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: true, closeButton: false })
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
 * Markers
 * 
 ********************************************************************/

function getPopupHTML(images, caption) {
    const popupHTML = `
        <div class="popup">
            <div class="carousel-container">
                <div class="carousel-imgs">
                    ${generateImageHTML(images)}
                </div>
                <a class="prev arrow">&#10094;</a>
                <a class="next arrow">&#10095;</a>
                <div class="slide-numbers">
                    ${generateDotHTML(images.length)}
                </div>
                <p class="carousel-caption">${caption}</p>
            </div>
        </div>
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