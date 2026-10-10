import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resolveFile = (file) => {
  const resolved = path.resolve(projectRoot, file);
  const relative = path.relative(projectRoot, resolved);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `Asset path outside project: ${file}`);
  return resolved;
};
const read = (file) => JSON.parse(fs.readFileSync(resolveFile(file), 'utf8').replace(/^\uFEFF/, ''));
const catalog = read('content/concept_catalog.json');
const original = read('content/archive/concept_catalog_v0.8.json');
const scene = read('content/scenes/C01.json');
const manifest = read(path.join('content/scenes', scene.asset_manifest));
const unique = (ids, label) => assert.equal(new Set(ids).size, ids.length, `${label}: duplicate ID`);

assert.equal(catalog.version, '0.8');
assert.equal(catalog.total, 77);
assert.equal(catalog.concepts.length, 77);
const conceptIds = catalog.concepts.map((concept) => concept.concept_id);
unique(conceptIds, 'catalog');
assert.deepEqual([...conceptIds].sort(), original.concepts.map((concept) => concept.concept_id).sort(), 'Stable concept IDs changed');
assert.equal(catalog.core_scene_ids.length + catalog.backlog_count, 77);
unique(catalog.core_scene_ids, 'core scenes');
for (const id of catalog.core_scene_ids) assert.ok(conceptIds.includes(id), `Missing core concept ${id}`);
assert.equal(scene.concept_id, 'C01');
assert.equal(manifest.concept_id, 'C01');

const objectIds = scene.object_hierarchy.map((object) => object.object_id);
const spotIds = scene.hotspots.map((spot) => spot.id);
unique(objectIds, 'hierarchy');
unique(spotIds, 'hotspots');
assert.deepEqual([...objectIds].sort(), [...spotIds].sort());
const spots = new Map(scene.hotspots.map((spot) => [spot.id, spot]));
for (const spot of scene.hotspots) {
  assert.ok(['system', 'group', 'entity', 'component'].includes(spot.level), `Invalid level ${spot.id}`);
  assert.ok(spot.name && spot.explanation && spot.science, `Missing content ${spot.id}`);
  const visited = new Set();
  let current = spot;
  while (current.parent) {
    assert.ok(!visited.has(current.id), `Hierarchy cycle at ${current.id}`);
    visited.add(current.id);
    assert.ok(spots.has(current.parent), `Missing parent ${current.parent}`);
    current = spots.get(current.parent);
  }
  assert.equal(current.id, 'sun');
  for (const link of spot.links) assert.equal(new URL(link.url).protocol, 'https:');
}
for (const object of scene.object_hierarchy) assert.equal(object.parent, spots.get(object.object_id).parent);
unique(scene.camera_contract.presets.map((preset) => preset.id), 'camera presets');
for (const preset of scene.camera_contract.presets) assert.ok(spots.has(preset.focus), `Invalid camera focus ${preset.focus}`);
assert.equal(scene.narration.length, 5);
assert.deepEqual(scene.narration.map((topic) => topic.id), scene.narration_topics);
for (const topic of scene.narration) {
  assert.ok(spots.has(topic.focusId), `Invalid narration focus ${topic.focusId}`);
  assert.ok(topic.title && topic.text, `Missing narration ${topic.id}`);
  for (const overlay of topic.overlays) assert.ok(['orbits', 'energy', 'heat', 'light', 'labels'].includes(overlay), `Invalid overlay ${overlay}`);
}
for (const item of manifest.interactive_hierarchy.filter((part) => part.required)) {
  assert.ok(spots.has(item.object_id), `Missing required asset object ${item.object_id}`);
  if (item.part_of) assert.equal(spots.get(item.object_id).parent, item.part_of);
}
const assets = [...manifest.source_assets, ...manifest.runtime_assets];
unique(assets.map((asset) => asset.asset_id), 'assets');
for (const asset of assets) {
  assert.ok(['planned', 'ready', 'processing', 'failed'].includes(asset.status), `Invalid asset status ${asset.asset_id}`);
  if (asset.status === 'ready') {
    assert.ok(typeof asset.file === 'string' && asset.file.length > 0, `Missing ready asset path ${asset.asset_id}`);
    assert.ok(fs.existsSync(resolveFile(asset.file)), `Missing ready asset file ${asset.file}`);
    assert.ok(fs.statSync(resolveFile(asset.file)).size > 0, `Empty ready asset ${asset.file}`);
  }
}
if (manifest.metadata_file) {
  const metadata = read(manifest.metadata_file);
  const parts = ['collector_surface', 'support_truss', 'radiator', 'attitude_module'];
  assert.deepEqual(Object.keys(manifest.node_mapping).sort(), [...parts].sort(), 'Four component node mappings required');
  assert.deepEqual(Object.keys(manifest.focus_anchors).sort(), [...parts].sort(), 'Four component focus anchors required');
  for (const part of parts) {
    assert.ok(metadata.nodes.includes(manifest.node_mapping[part]), `Unknown model node ${part}`);
    const anchor = manifest.focus_anchors[part];
    assert.ok(Array.isArray(anchor) && anchor.length === 3 && anchor.every(Number.isFinite), `Invalid focus anchor ${part}`);
    assert.deepEqual(anchor, metadata.anchors[part], `Anchor metadata mismatch ${part}`);
  }
  for (const asset of manifest.runtime_assets.filter((item) => item.status === 'ready')) {
    const buffer = fs.readFileSync(resolveFile(asset.file));
    assert.ok(buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67 && buffer.readUInt32LE(4) === 2, `Invalid GLB ${asset.file}`);
    assert.equal(buffer.readUInt32LE(8), buffer.length, `Invalid GLB length ${asset.file}`);
    assert.equal(buffer.readUInt32LE(16), 0x4e4f534a, `GLB JSON chunk missing ${asset.file}`);
    const jsonLength = buffer.readUInt32LE(12);
    assert.ok(20 + jsonLength <= buffer.length, `Truncated GLB ${asset.file}`);
    const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
    const nodes = gltf.nodes.map((node) => node.name);
    for (const part of parts) assert.ok(nodes.includes(manifest.node_mapping[part]), `Missing ${part} in ${asset.file}`);
    const lod = metadata.lods.find((item) => item.path === asset.url);
    assert.ok(lod, `Missing LOD metadata ${asset.asset_id}`);
    assert.equal(buffer.length, lod.bytes, `LOD byte metadata mismatch ${asset.asset_id}`);
    assert.equal(asset.bytes, lod.bytes, `Manifest byte metadata mismatch ${asset.asset_id}`);
    assert.equal(asset.triangles, lod.triangles, `LOD triangle metadata mismatch ${asset.asset_id}`);
  }
}
const solarSources = read(resolveFile('public/assets/solar/sources.json'));
const habitat = read('content/scenes/C15.json');
const habitatManifest = read(path.join('content/scenes', habitat.asset_manifest));
assert.equal(habitat.concept_id, 'C15');
assert.equal(habitatManifest.concept_id, 'C15');
unique(habitat.hotspots.map(spot => spot.id), 'C15 hotspots');
unique(habitat.object_hierarchy.map(object => object.object_id), 'C15 hierarchy');
assert.deepEqual(habitat.hotspots.map(spot => spot.id).sort(), habitat.object_hierarchy.map(object => object.object_id).sort());
const habitatSpots = new Map(habitat.hotspots.map(spot => [spot.id, spot]));
for (const spot of habitat.hotspots) {
  assert.ok(['system', 'group', 'entity', 'component'].includes(spot.level));
  assert.ok(spot.name && spot.explanation && spot.science);
  const visited = new Set();
  let current = spot;
  while (current.parent) {
    assert.ok(!visited.has(current.id), `C15 hierarchy cycle ${current.id}`);
    visited.add(current.id);
    assert.ok(habitatSpots.has(current.parent), `Missing C15 parent ${current.parent}`);
    current = habitatSpots.get(current.parent);
  }
  assert.equal(current.id, 'habitat');
  for (const link of spot.links) assert.equal(new URL(link.url).protocol, 'https:');
}
for (const object of habitat.object_hierarchy) assert.equal(object.parent, habitatSpots.get(object.object_id).parent);
for (const preset of habitat.camera_contract.presets) assert.ok(habitatSpots.has(preset.focus));
assert.deepEqual(habitat.narration.map(topic => topic.id), habitat.narration_topics);
for (const topic of habitat.narration) {
  assert.ok(habitatSpots.has(topic.focusId) && topic.title && topic.text);
  for (const overlay of topic.overlays) assert.ok(['cutaway', 'gravity', 'light', 'heat', 'labels'].includes(overlay));
}
const habitatAssets = [...habitatManifest.source_assets, ...habitatManifest.runtime_assets];
unique(habitatAssets.map(asset => asset.asset_id), 'C15 assets');
for (const asset of habitatAssets) {
  assert.ok(['planned', 'ready', 'processing', 'failed'].includes(asset.status));
  if (asset.status !== 'ready') continue;
  assert.ok(typeof asset.file === 'string' && fs.statSync(resolveFile(asset.file)).size > 0, `Missing C15 asset ${asset.asset_id}`);
  if (asset.file.endsWith('.glb')) {
    const buffer = fs.readFileSync(resolveFile(asset.file));
    assert.ok(buffer.length >= 20 && buffer.readUInt32LE(0) === 0x46546c67 && buffer.readUInt32LE(4) === 2, `Invalid C15 GLB ${asset.file}`);
    assert.equal(buffer.readUInt32LE(8), buffer.length);
    if (asset.bytes) assert.equal(buffer.length, asset.bytes);
  }
}
for (const item of habitatManifest.interactive_hierarchy ?? []) {
  if (item.required) assert.ok(habitatSpots.has(item.object_id));
  if (item.part_of) assert.equal(habitatSpots.get(item.object_id)?.parent, item.part_of);
}
assert.equal(solarSources.isLive, false, 'Saved solar imagery must not claim a live feed');
assert.deepEqual(solarSources.images.map(image => image.id), ['euv']);
for (const image of solarSources.images) {
  assert.equal(new URL(image.url).hostname, 'sdo.gsfc.nasa.gov');
  const runtime = fs.readFileSync(resolveFile(`public/assets/solar/${image.file}`));
  const originalImage = fs.readFileSync(resolveFile(`assets/source/solar/${image.file}`));
  assert.equal(runtime.readUInt16BE(0), 0xffd8, 'Solar source must be a JPEG');
  assert.deepEqual(runtime, originalImage, 'Solar source must remain unchanged');
  assert.equal(runtime.length, image.bytes);
  assert.equal(createHash('sha256').update(runtime).digest('hex'), image.sha256);
}
process.stdout.write(`Content valid: ${conceptIds.length} stable concepts, C01 ${spotIds.length} objects, C15 ${habitat.hotspots.length} objects, ${assets.length + habitatAssets.length} asset records, ${solarSources.images.length} verified solar snapshots.\n`);
