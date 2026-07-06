var imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var map = L.map("map", {
  center: [44.89110073562602, -96.99927634362393], 
  zoom: 18,
    minZoom: 18,
   maxZoom: 24,
  layers: imagery
});

var rasterLayers = {};
var fieldBounds = null; // store bounds here

fetch('../field_GEOJSON/Watertown.geojson')
  .then(res => res.json())
  .then(data => {
    const fieldLayer = L.geoJSON(data, {
      style: {
        color: '#0066ff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0
      }
    }).addTo(map);

    fieldBounds = fieldLayer.getBounds(); // save the bounds

    // Display acreage in legend
    const acres = data.properties?.acres || 'N/A';
    document.getElementById('acreage-value').innerHTML = `<b>${acres} acres</b>`;
  })
  .catch(err => console.log('No field boundary found'));

// Home Button //
var homeCenter = map.getCenter();

var homeZoom = map.getZoom();

L.easyButton(('<img src="Home_icon_black.png", height=70%>'), function () {
  map.setView(homeCenter, homeZoom);
}, "Home").addTo(map);

// Locate control //
console.log(L.control.locate);
L.control.locate().addTo(map);

// Fetch soil moisture and update legend //                   // !!will need to figure out how to make it so lat and long changes to new polygon //
async function getSoilMoisture() {
  const url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=44.89110073562602' +
    '&longitude=-96.99927634362393' +
    '&hourly=soil_moisture_3_to_9cm' +
    '&timezone=America%2FChicago';

  const response = await fetch(url);
  const data = await response.json();

  const latest = data.hourly.soil_moisture_3_to_9cm[0];
  const time = data.hourly.time[0];

  document.getElementById('moisture-value').innerHTML = `
    <b>${(latest * 100).toFixed(1)}%</b><br>
    <small>As of ${time}</small>
  `;
}
getSoilMoisture();

var rasterLayers = {};

// fetch NDVI
const ndviPromise = fetch('../field_rasters/Watertown/Watertown_NDVI.tif')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => parseGeoraster(arrayBuffer))
  .then(georaster => {
    rasterLayers['NDVI'] = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.8,
      resolution: 128,
      pixelValuesToColorFn: function(values) {
        const v = values[0];
        if (v === georaster.noDataValue || v === null || v === -9999) return null;
        if (v >= 0.7) return '#1a9641';
        if (v >= 0.5) return '#74c476';
        if (v >= 0.3) return '#f1ffa4';
        if (v >= 0.1) return '#ffff2d';
        if (v >= 0.0) return '#fdae61';
        return '#d7191c';
      }
    });

    rasterLayers['NDVI'].addTo(map);

    // fit map to GeoJSON bounds if available, otherwise fall back to raster bounds
    if (fieldBounds) {
      map.fitBounds(fieldBounds);
    } else {
      map.fitBounds(rasterLayers['NDVI'].getBounds());
    }
  })
  .catch(err => console.error('NDVI error:', err));

//Load RGB - later
//const rgbPromise = fetch('field_maps/South_field_RGB.tif')
//  .then(response => response.arrayBuffer())
//  .then(arrayBuffer => parseGeoraster(arrayBuffer))
//  .then(georaster => {
//   rasterLayers['RGB'] = new GeoRasterLayer({
//      georaster: georaster,
//      opacity: 0.8,
//      resolution: 256
//    });
//  })
//  .catch(err => console.log('RGB error:', err));

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

