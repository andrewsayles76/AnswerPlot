var imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var map = L.map("map", {
  center: [43.568591915416704, -97.1869485880235],
  zoom: 18,
  minZoom: 18,
  maxZoom: 24,
  layers: imagery
});

var rasterLayers = {};

// ============================================================
// CUSTOM PLOT CHARACTERISTICS — EDIT THIS SECTION
// Key each entry by the plot's PLOT number from the GeoJSON.
// Add/remove any fields you want (variety, status, notes,
// treatment, yield, etc.) — they'll show up automatically in
// that plot's popup. Add a "color" field (hex or CSS color
// name) to have that square shaded on the map; leave it out
// and the plot just keeps the default outline styling.
// ============================================================
const plotCharacteristics = {
  801: { Treatment: "Section Three",
        "Section Three Rate": "3 oz/ac",
         ChangeDetection: "..." },

  802: { Treatment: "Section Three + Enlist One",
         "Section Three Rate": "3 oz/ac", "Enlist One Rate": "2 pt/ac",
         ChangeDetection: "..." },

  803: { Treatment: "Section Three + Enlist One",
         "Section Three Rate": "9 oz/ac", "Enlist One Rate": "2 pt/ac",
         ChangeDetection: "..." },

  804: { Treatment: "Check",
          },
  
  805: { Treatment: "Section Three, Enlist One, + Class Act NG",
         "Section Three Rate": "3 oz/ac", "Enlist One Rate": "2 pt/ac", "Class Act NG Rate": "1.25% ",
         ChangeDetection: "..." },

  806: { Treatment: "Section Three, Enlist One, + Charger Basic",
         "Section Three Rate": "3 oz/ac", "Enlist One Rate": "2 pt/ac", "Charger Basic Rate": "1 pt/ac",
         ChangeDetection: "..." },

  807: { Treatment: "Section Three, Enlist One, + Superlock",
         "Section Three Rate": "3 oz/ac", "Enlist One Rate": "2 pt/ac", "Superlock": "12 oz/ac",
         ChangeDetection: "..." },

  808: { Treatment: "Section Three, Enlist One, + Strikelock",
         "Section Three Rate": "3 oz/ac", "Enlist One Rate": "2 pt/ac", "Strikelock": "10 oz/ac",
         ChangeDetection: "..." },
  
  809: { Treatment: "Liberty Ultra, Amsol, + Strikelock",
         "Liberty Ultra": "29 oz/ac", "Amsol": "113 oz/ac", "Strikelock": "10 oz/ac",
         ChangeDetection: "..." },

  810: { Treatment: "Liberty Ultra, Section Three, Class Act NG, Amsol, + Strikelock",
         "Liberty Ultra": "29 oz/ac", "Section Three": "3 oz/ac", "Class Act NG": "1.25%v/v", "Amsol": "75 oz/ac", "Strikelock": "10 oz/ac",
         ChangeDetection: "..." },

  811: { Treatment: "Check",
         },
};

// Which GeoJSON property links a feature to plotCharacteristics above
const PLOT_LINK_FIELD = "PLOT";

function labelizeField(key) {
  return key.replace(/_/g, ' ');
}

function buildPlotPopup(props, custom) {
  let html = `<div class="popup-title">Range ${props.PLOT ?? props.PageName}</div>`;

  if (custom) {
    let customRows = "";
    Object.keys(custom).forEach(k => {
      if (k === "color") return; // drives styling, not shown as text
      const val = custom[k];
      if (val === undefined || val === "") return;
      customRows += `<tr><td class="k">${labelizeField(k)}</td><td class="v">${val}</td></tr>`;
    });
    if (customRows) {
      html += `<table class="popup-table">${customRows}</table>`;
    }
  }
  return html;
}

// Load GeoJSON field boundary
fetch('field_GEOJSON/demo_Grass.geojson')
  .then(res => res.json())
  .then(data => {
    boundaryLayer = L.geoJSON(data, {
      style: function (feature) {
        const key = feature.properties[PLOT_LINK_FIELD];
        const custom = plotCharacteristics[key];
        return {
          color: '#000000',
          weight: 2,
          opacity: 1,
          fillOpacity: (custom && custom.color) ? 0.45 : 0,
          fillColor: (custom && custom.color) ? custom.color : 'rgba(255, 102, 0, 0)'
        };
      },
      onEachFeature: function (feature, layer) {
        const key = feature.properties[PLOT_LINK_FIELD];
        const custom = plotCharacteristics[key];
        layer.bindPopup(buildPlotPopup(feature.properties, custom));

        // Permanent label anchored to the top edge of the square
        const topCenter = L.latLng(
          layer.getBounds().getNorth(),
          (layer.getBounds().getWest() + layer.getBounds().getEast()) / 2
        );
        L.tooltip({
          permanent: true,
          direction: 'top',
          className: 'plot-label',
          offset: [0, 0]
        })
          .setLatLng(topCenter)
          .setContent(String(key ?? feature.properties.PageName))
          .addTo(map);
        
        layer.on('mouseover', function () {
          this.setStyle({ weight: 3, fillOpacity: (this.options.fillOpacity || 0) + 0.15 });
        });
        layer.on('mouseout', function () {
          boundaryLayer.resetStyle(this);
        });
      }
    }).addTo(map);
  })
  .catch(err => console.error('Boundary error:', err));

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

// Load GrassDate1 - assigned to a variable
const GrassDate1 = fetch('field_rasters/LakeVer/622026/Demo/Grass/6226_Grass.tif') //when saveing from ArcGIS Pro save it outside of GDB and add .tif at the end
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => parseGeoraster(arrayBuffer))
  .then(georaster => {
    rasterLayers['GrassDate1'] = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.8,
      resolution: 128,
      pixelValuesToColorFn: function(values) {
        const v = values[0];
        if (v === georaster.noDataValue || v === null || v === -9999) return null;
        if (v >= 0.7)  return '#1a9641';
        if (v >= 0.5)  return '#74c476';
        if (v >= 0.3)  return '#f1ffa4';
        if (v >= 0.1)  return '#ffff2d';
        if (v >= 0.0)  return '#fdae61';
        return '#d7191c';
      }
    });
  })
  .catch(err => console.log('GrassDate1 error:', err));

// Load GrassDate2 - assigned to a variable
const GrassDate2 = fetch('field_rasters/LakeVer/6152026/Demo/Grass/61526_Grass.tif') //when saveing from ArcGIS Pro save it outside of GDB and add .tif at the end
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => parseGeoraster(arrayBuffer))
  .then(georaster => {
    rasterLayers['GrassDate2'] = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.8,
      resolution: 128,
      pixelValuesToColorFn: function(values) {
        const v = values[0];
        if (v === georaster.noDataValue || v === null || v === -9999) return null;
        if (v >= 0.7)  return '#1a9641';
        if (v >= 0.5)  return '#74c476';
        if (v >= 0.3)  return '#f1ffa4';
        if (v >= 0.1)  return '#ffff2d';
        if (v >= 0.0)  return '#fdae61';
        return '#d7191c';
      }
    });
  })
  .catch(err => console.log('GrassDate2 error:', err));

Promise.all([GrassDate1, GrassDate2]).then(() => {
  rasterLayers['GrassDate1'].addTo(map);
  rasterLayers['GrassDate2'].addTo(map);

  rasterLayers['GrassDate2'].getContainer().style.display = 'none';

 

  document.getElementById('toggleGrassDate1-desktop').checked = true;
  document.getElementById('toggleGrassDate1-mobile').checked = true;

  document.querySelectorAll('.layer-toggle').forEach(radio => {
    radio.addEventListener('change', function() {
      const selected = this.dataset.layer;

      Object.keys(rasterLayers).forEach(key => {
        const layer = rasterLayers[key];
        if (key === selected) {
          // Show selected layer
          if (layer.getContainer) {
            layer.getContainer().style.display = 'block';
          } else {
            layer.addTo(map);
          }
        } else {
          // Hide other layers
          if (layer.getContainer) {
            layer.getContainer().style.display = 'none';
          } else {
            map.removeLayer(layer);
          }
        }
      });

      // Sync other sidebar
      const otherName = this.name === 'mapLayerDesktop' ? 'mapLayerMobile' : 'mapLayerDesktop';
      const otherRadio = document.querySelector(`input[name="${otherName}"][data-layer="${selected}"]`);
      if (otherRadio) otherRadio.checked = true;
    });
  });
});


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
