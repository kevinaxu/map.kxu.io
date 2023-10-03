

### File Directory

* scripts/processImages.js - this script is used to process a directory of raw images (JPG, HEIC, HEIF) into web-friendly versions. HEIC images are converted to JPG and resized to ~80% of original quality. JPG images are resized only. Input / output directories are currently hard-coded so make sure to update INPUT_DIR and OUTPUT_DIR before re-running

* scripts/etl.js - this script is used to transform route / marker data in `trip_config.json` into format suitable for usage in Mapbox `source`. This script handles both markers and routes, which are calculated using the Mapbox Directions API. 

