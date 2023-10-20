/**
 * Represents a PopupCarousel object that displays a carousel of images with navigation buttons and dots.
 */
class PopupCarousel {

    /**
     * Creates a new PopupCarousel object.
     * @param {HTMLElement} popup - The popup element that contains the carousel.
     */
    constructor(feature) {
        this.feature = feature;
        this.popup = new mapboxgl
            .Popup({ 
                anchor: "top-left",
                closeOnClick: true,
                closeButton: false
            })
    }

    initializeCarouselControls() {
        this.prev = document.querySelector('.prev');
        this.next = document.querySelector('.next');
        this.imgs = document.querySelectorAll('.carousel-img');
        this.dots = document.querySelectorAll('.dot');
        this.imagePosition = 0;
        this.imageCount = this.imgs.length;
        this.handleClickEvents();
    }

    buildPopupElement() {
        const popupHTML = this.getPopupHTML(this.feature.properties.images, this.feature.properties.captions);
        this.popup.setHTML(popupHTML);
    }
    getMapboxPopup() {
        return this.popup;
    }
    remove() {
        this.popup.remove();
    }

    /*******************************************************************
     * 
     * UI - Popup Positioning 
     * 
     ********************************************************************/

    isPortrait() {
        return (window.innerWidth < window.innerHeight);
    }
    isMobile() {
        return (window.innerWidth <= 640);
    }
    isTablet() {
        return (window.innerWidth <= 768 && window.innerWidth > 640);
    }
    isDesktop() {
        return (window.innerWidth > 768);
    }

    setPopupPositioning() {
        var popupContent = document.querySelector('.mapboxgl-popup-content');

        var popupOffset = [];
        if (this.isMobile()) {
            if (this.isPortrait()) {
                console.log("mobile portrait");
                this.popup.addClassName("popup-content-mobile");

                // popup width based on screen width (up to 340px)
                var maxPopupWidth =  340
                var popupWidth = Math.min(
                    (window.innerWidth - (padding * 2)),
                    maxPopupWidth
                );

                // update CSS
                var padding = 8;
                popupContent.style.width = `${popupWidth}px`;
                popupContent.style.padding = `${padding}px`;

                const popupContentWidth = popupContent.clientWidth;
                const popupContentHeight = popupContent.clientHeight;
                console.log(`popup content width: ${popupContentWidth}, height ${popupContentHeight}`);

                popupOffset = [
                    -(popupContentWidth / 2),           // x
                    -(popupContentHeight + 50)          // y
                ]

                console.log("popupOffset:", popupOffset)

            } else {
                console.log("mobile landscape");
                this.popup.addClassName("popup-content-mobile-landscape");

                const popupContentWidth = document.querySelector('.mapboxgl-popup-content').clientWidth;
                const popupContentHeight = document.querySelector('.mapboxgl-popup-content').clientHeight;
                console.log(`popup content width: ${popupContentWidth}, height ${popupContentHeight}`);

                const offsetX = popupContentWidth;
                const offsetY = popupContentHeight - 100;       // fixed padding? 

                popupOffset = [
                    100,       // x to the right of the Marker, width + fixed spacing
                    -offsetY        // y
                ];
            } 
        } else if (isTablet()) {
            console.log("tablet landscape");
            var padding = 10;
            popupContent.style.width = `${popupWidth}px`;
            popupContent.style.padding = `${padding}px`;
            this.popup.addClassName("popup-content-tablet");

            const popupContentWidth = document.querySelector('.mapboxgl-popup-content').clientWidth;
            const popupContentHeight = document.querySelector('.mapboxgl-popup-content').clientHeight;
            console.log(`popup content width: ${popupContentWidth}, height ${popupContentHeight}`);

            const offsetX = popupContentWidth;
            const offsetY = popupContentHeight - 30;       // fixed padding? 

            popupOffset = [
                100,       // x to the right of the Marker, width + fixed spacing
                -offsetY        // y
            ];

        } else {
            console.log("desktop");
            var padding = 16;
            popupContent.style.width = `${popupWidth}px`;
            popupContent.style.padding = `${padding}px`;

            this.popup.addClassName("popup-content-desktop");

            const popupContentWidth = document.querySelector('.mapboxgl-popup-content').clientWidth;
            const popupContentHeight = document.querySelector('.mapboxgl-popup-content').clientHeight;
            console.log(`popup content width: ${popupContentWidth}, height ${popupContentHeight}`);

            const offsetX = popupContentWidth;
            const offsetY = popupContentHeight;       // fixed padding? 

            popupOffset = [
                50,       // x to the right of the Marker, width + fixed spacing
                -offsetY        // y
            ];
        }

        this.popup.setOffset(popupOffset);
    }


    /*******************************************************************
     * 
     * UI - Popup Static Generation
     * 
     ********************************************************************/

    getPopupHTML(images, caption) {
        const popupHTML = `
            <div class="carousel-container">
                <div class="carousel-imgs">
                    ${this.generateImageHTML(images)}
                </div>
                <a class="prev arrow">&#10094;</a>
                <a class="next arrow">&#10095;</a>
                <div class="slide-numbers">
                    ${this.generateDotHTML(images.length)}
                </div>
            </div>
            <p class="carousel-caption">${caption}</p>
        `;
        return popupHTML;
    }

    // TODO: update this for video support
    generateImageHTML(images) {
        var strings = [];
        for (var i = 0; i < images.length; i++) {

            var status = (i === 0 ? "visible" : "hidden");

            if (images[i].includes("mp4")) {
                //console.log(`video: ${images[i]}`);
                strings.push(
                    `<video controls class="carousel-img object-cover ${status}">
                        <source src="${images[i]}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `
                );
            } else {
                //console.log(`image: ${images[i]}`);
                strings.push(`<img src="${images[i]}" class="carousel-img ${status}"/>`);
            }
        }
        return strings.join("\n");
    }

    generateDotHTML(count) {
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

    isMobileScreenSize() {
        return (window.innerWidth < 767);
    }

    /*******************************************************************
     * 
     * Controls - Image Carousel Dots/Arrows
     * 
     ********************************************************************/

    /**
     * Image / Dots
     * Updates the position of the carousel images and dots based on the current image position.
     */
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

    /**
     * Moves to the next image in the carousel and updates the position.
     */
    nextImage() {
        if (this.imagePosition === this.imageCount - 1) {
            this.imagePosition = 0;
        } else {
            this.imagePosition++;
        }
        this.updatePosition();
    }; 

    /**
     * Moves to the previous image in the carousel and updates the position.
     */
    prevImage() {
        if (this.imagePosition === 0) {
            this.imagePosition = this.imageCount - 1;
        } else {
            this.imagePosition--;
        }
        this.updatePosition();
    }

    /**
     * Image / Dot onClick should update image position
     */
    handleClickEvents() {
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

}