var imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var map = L.map("map", {
  center: [44.57112961996963, -96.0164010348873],
  zoom: 18,
  minZoom: 18,
  maxZoom: 24,
  layers: imagery
});

var rasterLayers = {};

// Load GeoJSON field boundary
fetch('field_GEOJSON/trial_CPT.geojson')
  .then(res => res.json())
  .then(data => {
    boundaryLayer = L.geoJSON(data, {
      style: {
        color: '#000000',  
        weight: 2,
        opacity: 1,
        fillOpacity: 0,
        fillColor: '#ff6600'
      }
    }).addTo(map);
  })
  .catch(err => console.error('Boundary error:', err));

// Load GeoJSON RM boundary
fetch('field_GEOJSON/trial_CPT_RM.geojson')
  .then(res => res.json())
  .then(data => {
    boundaryLayer = L.geoJSON(data, {
      style: {
        color: '#000000',  
        weight: 2,
        opacity: 1,
        fillOpacity: 0,
        fillColor: '#ff6600'
      },
      onEachFeature: function (feature, layer) {
        const label = feature.properties.CORN_TRIAL_RM; // <-- change this
        if (label !== undefined && label !== null) {
          layer.bindTooltip(String(label), {
            permanent: true,
            direction: 'center',
            className: 'plot-label'
          });
        }
      }
    }).addTo(map);
  })
  .catch(err => console.error('RM Boundary error:', err));

// Home Button //
var homeCenter = map.getCenter();

var homeZoom = map.getZoom();

L.easyButton(('<img src="Home_icon_black.png", height=70%>'), function () {
  map.setView(homeCenter, homeZoom);
}, "Home").addTo(map);

// Locate control //
console.log(L.control.locate);
L.control.locate().addTo(map);

// historical weather?

// Load Greensnap - assigned to a variable
const GreenSnap = fetch('field_rasters/GreenSnap/MN_GreenSnap_NDVI_Compressed.tif')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => parseGeoraster(arrayBuffer))
  .then(georaster => {
    const layer = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.8,
      resolution: 128,
      pixelValuesToColorFn: function(values) {
        const v = values[0];
        if (v === georaster.noDataValue || v === null || v === -9999) return null;
        if (v >= 0.45)  return '#1a9641';
        return '#d7d319';
      }
    });
    rasterLayers['GreenSnap'] = layer;
    layer.addTo(map);   
  })
  .catch(err => console.log('GreenSnap error:', err));






// area of concern?
// in depth about tab - change description box in field1
// soil sample and acres do not load inside of mobile tab

// add DSM for elevation and wet spot detection (need cloud storage and fetch)
// add RGB (need cloud storage and fetch)

// ArcGIS Pro notes
// add GeoJSON to GDB and do JSON to Feature 
// add soil sample data and locations 
// locations created using the fishnet tool (2.5 acres x 2.5 acreas) on the JSON feature and then clipping the dots to the field extent 
// output as GeoJSON so locations can be added to webmap
// add join fishnet locations to soil sample data
// perform a kriging interpolation on soil sample data and locations
// add NDVI from pix4D and clip raster to field extent (might need to resample or figure out cloud storage)
// export rasters inside of clip (both NDVI and pH) (from ArcGIS Pro save it outside of GDB and add .tif at the end)