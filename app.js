
// TODO: make these dynamic by pulling from trip_config
const pulsing_dot   = [98.3013584,7.8311951];
const map_center    = [98.339370,7.964535];

// Initialize Map
mapboxgl.accessToken = 'pk.eyJ1Ijoia3h1MTYiLCJhIjoiY2p5NXh1bzZqMGNrMzNkbzB1bjlsazluaCJ9.LWKf9jAXZmDmKgAWA-IS9g';
const map = new mapboxgl.Map({
    container: 'map',
    // style: 'mapbox://styles/mapbox/streets-v12',
    style: 'mapbox://styles/mapbox/navigation-guidance-night-v2',
    center: map_center,
    zoom: 10.5
});

// ********************************************************************/

// first image and caption is visible, the rest are hidden
function generateImageHTML(images) {
    var strings = [];
    for (var i = 0; i < images.length; i++) {
        var status = (i === 0 ? "visible" : "hidden");
        strings.push(`<img src="${images[i]}" class="carousel-img ${status}"/>`);
    }
    return strings.join("\n");
}

function generateCaptionHTML(captions) {
    var strings = [];
    for (var i = 0; i < captions.length; i++) {
        var status = (i === 0 ? "visible" : "hidden");
        strings.push(`<p class="carousel-caption ${status}">${captions[i]}</p>`);
    }
    return strings.join("\n");
}

function getPopupHTML(images, captions) {
    const popupHTML = `
        <div class="popup">
            <div class="carousel-container">
                <div class="carousel-imgs">
                    ${generateImageHTML(images)}
                </div>
                <a class="prev arrow">&#10094;</a>
                <a class="next arrow">&#10095;</a>
                <div class="slide-numbers">
                    <span class="dot active"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <div class="carousel-captions">
                    ${generateCaptionHTML(captions)}
                </div>
            </div>
        </div>
        `;
    return popupHTML;
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
    let captions = popup.getElement().querySelectorAll('.carousel-caption')

    let totalImgs = imgs.length;
    let imgPosition = 0;

    // Event Listeners
    next.addEventListener('click', nextImg);
    prev.addEventListener('click', prevImg);

    // Update Position
    function updatePosition() {
        //   Images
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
        //   Captions
        for (let caption of captions) {
            caption.classList.remove('visible');
            caption.classList.add('hidden');
        }

        captions[imgPosition].classList.remove('hidden');
        captions[imgPosition].classList.add('visible')
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

function generateMap(data) {

    const geojson = data.markers;

    // Add markers to the map.
    for (const feature of geojson.features) {
        if (feature.properties.ignore === true) {
            continue;
        }

        // Create a DOM element for each marker.
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = `url(${feature.properties.icon})`;

        // Add markers to the map.
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
                'line-width': 4,
                'line-color': 'gray',
                'line-dasharray': [2, 2]        // Set the line to be dotted (alternating 2 units of line followed by 2 units of gap)
            }
        });

        // Pulsing dot
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
                            'coordinates': pulsing_dot
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

