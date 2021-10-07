import MapboxLayer from '@deck.gl/mapbox/dist/esm/mapbox-layer';
import { AmbientLight } from '@deck.gl/core/dist/esm/effects/lighting/ambient-light';
import { DirectionalLight } from '@deck.gl/core/dist/esm/effects/lighting/directional-light';
import LightingEffect from '@deck.gl/core/dist/esm/effects/lighting/lighting-effect';
import SolidPolygonLayer from '@deck.gl/layers/dist/esm/solid-polygon-layer/solid-polygon-layer';
import SimpleMeshLayer from '@deck.gl/mesh-layers/dist/esm/simple-mesh-layer/simple-mesh-layer';
import { OBJLoader } from '@loaders.gl/obj';
import circle from '@turf/circle';
import debounce from 'just-debounce-it';

import dotPath from '../assets/dot.png';
import crownOBJPath from '../assets/crown.obj';

const ACCESS_TOKEN =
  'pk.eyJ1IjoiY2hlZWF1biIsImEiOiJjanF3azBrMjMwM2w1NDNyN3Yzc21saDUzIn0.jNWlsBO-S3uDKdfT9IKT1A';
mapboxgl.accessToken = ACCESS_TOKEN;
const map = (window._map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/cheeaun/ckpoxzt7o076k17rqq7jrowxg',
  minZoom: 8,
  renderWorldCopies: false,
  hash: true,
  center: [103.84708968044379, 1.2928590602954841],
  pitch: 65,
  zoom: 17.7,
}));
map.addControl(new mapboxgl.NavigationControl());

const coord2Trunk = (position, _girth) => {
  const girth = parseFloat((_girth || '0.5').match(/[\d.]+[^\d.]?$/)[0], 10);
  const steps = 6 + (girth - 0.5) * 2; // girth: from 0.5 to 1.5
  const trunkRadius = (girth / Math.PI) * 2;
  const trunkPolygon = circle(position, trunkRadius / 1000, { steps }).geometry
    .coordinates;
  return trunkPolygon;
};

const treesCache = new Map();
const cleaningData = (d) => {
  const { id, girth, height_est } = d.properties;
  if (treesCache.has(id)) return treesCache.get(id);
  const position = d.geometry.coordinates;
  const scale = height_est * 0.66;
  const newD = {
    id,
    position,
    polygon: coord2Trunk(position, girth),
    elevation: height_est * 0.75,
    translation: [0, 0, height_est * 0.6],
    scale: [scale * 0.1, scale * 0.1, scale * 0.135],
    orientation: [0, (id.slice(-1) / 9) * 180, 0],
  };
  treesCache.set(id, newD);
  return newD;
};

const treesTrunkLayer = new MapboxLayer({
  id: 'trees-trunk',
  type: SolidPolygonLayer,
  // data: cleanData,
  getFillColor: [219, 195, 154],
  extruded: true,
  getElevation: (d) => d.elevation,
});

const treesCrownLayer = new MapboxLayer({
  id: 'trees-crown',
  type: SimpleMeshLayer,
  // data: cleanData,
  mesh: crownOBJPath,
  loaders: [OBJLoader],
  getColor: [175, 216, 142],
  getTranslation: (d) => d.translation,
  getScale: (d) => d.scale,
  getOrientation: (d) => d.orientation,
});

const ambientLight = new AmbientLight({
  intensity: 2.25,
});
const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 0.35,
  direction: [0, 0, -1],
});
const lightingEffect = new LightingEffect({
  ambientLight,
  directionalLight,
});

map.once('load', async () => {
  map.addLayer(treesTrunkLayer, 'building-extrusion-2');
  map.setLayerZoomRange('trees-trunk', 15, 22.1);
  map.addLayer(treesCrownLayer, 'building-extrusion-2');
  map.setLayerZoomRange('trees-crown', 15, 22.1);

  map.addSource('trees-source', {
    type: 'vector',
    url: 'mapbox://cheeaun.bptkspgy',
  });

  map.loadImage(dotPath, (e, image) => {
    map.addImage('dot', image);
  });

  map.addLayer({
    id: 'trees',
    type: 'symbol',
    source: 'trees-source',
    'source-layer': 'trees',
    minzoom: 15,
    layout: {
      'icon-image': 'dot',
      // 'icon-padding': 1,
      'icon-ignore-placement': true,
      'icon-allow-overlap': true,
    },
    paint: {
      'icon-opacity': 0,
    },
  });

  const minZoom = 15;
  const maxZoom = 19;
  const minHeight = 24;
  const maxHeight = 0;
  const renderTrees = () => {
    const zoom = map.getZoom();
    if (zoom < 15) return;

    // Zoom 19: show all (height > 0)
    // Zoom 15: show trees with height > 24
    const height =
      ((zoom - minZoom) / (maxZoom - minZoom)) * (maxHeight - minHeight) +
      minHeight;
    const trees = map.queryRenderedFeatures({
      filter: [
        'all',
        ['has', 'girth_size'],
        ['has', 'height_est'],
        ['>', 'height_est', height],
      ],
      layers: ['trees'],
      validate: false,
    });

    // DEBUGGING
    // console.log(trees.length, trees);
    // const treesHeight = {};
    // trees.forEach((d) => {
    //   const { height_est } = d.properties;
    //   if (!treesHeight[height_est]) {
    //     treesHeight[height_est] = 1;
    //   }
    //   treesHeight[height_est]++;
    // });
    // console.log(treesHeight);

    requestAnimationFrame(() => {
      // Sort trees by height and reduce the amount
      const sortedTrees = trees
        .sort((a, b) => {
          return b.properties.height_est - a.properties.height_est;
        })
        .slice(0, 500);

      const cleanData = sortedTrees.map(cleaningData);

      treesTrunkLayer.setProps({ data: cleanData });
      treesCrownLayer.setProps({ data: cleanData });
    });
  };
  const debouncedRenderTrees = debounce(renderTrees, 500);

  map.on('moveend', debouncedRenderTrees);
  map.once('idle', renderTrees);

  const debouncedResize = debounce(renderTrees, 1000);
  map.on('resize', debouncedResize);

  treesCrownLayer.deck.setProps({
    effects: [lightingEffect],
  });
});
