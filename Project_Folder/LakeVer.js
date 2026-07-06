var imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var map = L.map("map", {
  center: [43.57070617955723, -97.18688749440282],
  zoom: 18,
  minZoom: 18,
  maxZoom: 24,
  layers: imagery
});

// Load GeoJSON field boundary
fetch('field_GEOJSON/demo_Enlis.geojson')
  .then(res => res.json())
  .then(data => {
    boundaryLayer = L.geoJSON(data, {
      style: {
        color: '#000000',   // 👈 change color as needed
        weight: 2,
        opacity: 1,
        fillOpacity: 0,
        fillColor: '#ff6600'
      }
    }).addTo(map);
  })
  .catch(err => console.error('Boundary error:', err));

// Wire up toggle
document.getElementById('toggle-boundary').addEventListener('change', function() {
  if (this.checked) {
    if (boundaryLayer) boundaryLayer.addTo(map);
  } else {
    if (boundaryLayer) map.removeLayer(boundaryLayer);
  }
});

// Home Button
var homeCenter = map.getCenter();
var homeZoom = map.getZoom();
L.easyButton(('<img src="Home_icon_black.png" height="70%">'), function () {
  map.setView(homeCenter, homeZoom);
}, "Home").addTo(map);

// Locate control
L.control.locate().addTo(map);

// Raster storage
// Keys: 'date1-NDVI', 'date1-RGB', 'date2-NDVI', 'date2-RGB'
var rasterLayers = {};
var currentDate = 'date1';   // tracks selected date
var currentType = 'NDVI';    // tracks selected layer type

// Show the correct layer based on current date + type
function showLayer() {
  const key = `${currentDate}-${currentType}`;

  // Remove all raster layers
  Object.values(rasterLayers).forEach(layer => {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  });

  // Add the selected one
  if (rasterLayers[key]) {
    rasterLayers[key].addTo(map);
  } else {
    console.warn('Layer not ready yet:', key);
  }

  // Show/hide NDVI legend
  document.getElementById('ndvi-legend-section').style.display =
    currentType === 'NDVI' ? 'block' : 'none';
}

// NDVI color function (shared)
function ndviColor(georaster) {
  return function(values) {
    const v = values[0];
    if (v === georaster.noDataValue || v === null || v === -9999) return null;
    if (v >= 0.7) return '#1a9641';
    if (v >= 0.5) return '#74c476';
    if (v >= 0.3) return '#f1ffa4';
    if (v >= 0.1) return '#ffff2d';
    if (v >= 0.0) return '#fdae61';
    return '#d7191c';
  };
}

// RGB color function (shared)
function rgbColor(georaster) {
  return function(values) {
    const [r, g, b] = values;
    if (r === georaster.noDataValue) return null;
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  };
}

// Load all rasters
const NDVI1Promise = fetch('field_rasters/LakeVer/622026/Demo/Enlist/62226LV_Enlis.TIF')
  .then(r => r.arrayBuffer()).then(b => parseGeoraster(b))
  .then(georaster => {
    rasterLayers['date1-NDVI'] = new GeoRasterLayer({
      georaster, opacity: 0.8, resolution: 128,
      pixelValuesToColorFn: ndviColor(georaster)
    });
  }).catch(err => console.error('NDVI1 error:', err));

const NDVI2Promise = fetch('field_rasters/LakeVer/6152026/Demo/Enlist/61526_Enlis.tif')
  .then(r => r.arrayBuffer()).then(b => parseGeoraster(b))
  .then(georaster => {
    rasterLayers['date2-NDVI'] = new GeoRasterLayer({
      georaster, opacity: 0.8, resolution: 128,
      pixelValuesToColorFn: ndviColor(georaster)
    });
  }).catch(err => console.error('NDVI2 error:', err));

// Once all loaded — wire up controls and show default
Promise.all([NDVI1Promise, NDVI2Promise]).then(() => {
  console.log('All rasters loaded');

  // Set defaults
  document.getElementById('date-btn-1').classList.add('active', 'btn-primary');
  document.getElementById('date-btn-1').classList.remove('btn-outline-primary');
  document.getElementById('type-NDVI').checked = true;

  showLayer();

  // Date buttons
  document.querySelectorAll('.date-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.date-btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline-primary');
      });
      this.classList.add('active', 'btn-primary');
      this.classList.remove('btn-outline-primary');
      currentDate = this.dataset.date;
      showLayer();
    });
  });

  // Layer type toggle
  document.querySelectorAll('.type-toggle').forEach(radio => {
    radio.addEventListener('change', function() {
      currentType = this.value;
      showLayer();
    });
  });
});



//AnswerPlot stuff
// have RBG and NDVI - have a slider for multiple dates to compare to - also add plot map shapefile
// change color of NDVI to something more understandable

// area of concern?
// in depth about tab - change description box in field1
// soil sample and acres do not load inside of mobile tab

// THINGS TO ADD LATER
// add DSM for elevation and wet spot detection (need cloud storage and fetch)
// add RGB (need cloud storage and fetch)
// add other soil properties 

// ArcGIS Pro notes
// add GeoJSON to GDB and do JSON to Feature 
// add soil sample data and locations 
// locations created using the fishnet tool (2.5 acres x 2.5 acreas) on the JSON feature and then clipping the dots to the field extent 
// output as GeoJSON so locations can be added to webmap
// add join fishnet locations to soil sample data
// perform a kriging interpolation on soil sample data and locations
// add NDVI from pix4D and clip raster to field extent (might need to resample or figure out cloud storage)
// export rasters inside of clip (both NDVI and pH) (from ArcGIS Pro save it outside of GDB and add .tif at the end)
// check maintain clipping extentand use input features for clipping geometry

