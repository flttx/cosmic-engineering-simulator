import { readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const parts = ['collector_surface', 'support_truss', 'radiator', 'attitude_module'];
const reports = [];
let referenceNodes;
for (let level = 0; level < 3; level++) {
  const path = resolve(root, `public/assets/C01/collector_lod${level}.glb`);
  const buffer = readFileSync(path);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  const jsonLength = buffer.readUInt32LE(12);
  const data = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  assert(data.meshes.length <= 16, 'Runtime collector mesh budget exceeded; merge export copies by part/material');
  assert(data.images?.length >= 6, 'Real material PNGs must be embedded');
  const silicon = data.materials.find(material => material.name.startsWith('Silicon'));
  const ceramic = data.materials.find(material => material.name.startsWith('Dark radiator'));
  assert(silicon && (silicon.pbrMetallicRoughness.metallicFactor ?? 1) < 0.1, 'Photovoltaic silicon must be nonmetallic');
  assert(ceramic && ceramic.pbrMetallicRoughness.metallicFactor === 0, 'Ceramic must be nonmetallic');
  assert(silicon.normalTexture && silicon.pbrMetallicRoughness.baseColorTexture && silicon.pbrMetallicRoughness.metallicRoughnessTexture);
  for (const name of parts) assert(data.nodes.some(node => node.name === name), `Missing ${name}`);
  const layout = data.nodes.map(({ name, translation, rotation, scale, children }) => ({ name, translation, rotation, scale, children }));
  if (referenceNodes) assert.deepEqual(layout, referenceNodes, 'LOD must preserve part hierarchy and transforms');
  else referenceNodes = layout;
  assert(!data.nodes.some(node => node.name?.startsWith('tripo_part_')), 'Untouched source high-poly must not enter runtime');
  let triangles = 0;
  for (const mesh of data.meshes) {
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, 'Expected triangle mesh');
      assert(primitive.attributes.NORMAL !== undefined, 'Normals required');
      assert(primitive.attributes.TEXCOORD_0 !== undefined, 'UVs required');
      const positions = data.accessors[primitive.attributes.POSITION];
      assert(positions.min.every(Number.isFinite) && positions.max.every(Number.isFinite));
      triangles += data.accessors[primitive.indices].count / 3;
    }
  }
  assert(triangles > 0);
  reports.push({ level, triangles, bytes: statSync(path).size, nodes: data.nodes.length, meshes: data.meshes.length, materials: data.materials.length, images: data.images.length });
}
assert(reports[0].triangles > reports[1].triangles && reports[1].triangles > reports[2].triangles, 'LOD geometry must decrease');
const metadata = JSON.parse(readFileSync(resolve(root, 'public/assets/C01/asset_metadata.json'), 'utf8'));
for (const report of reports) assert.equal(report.triangles, metadata.lods[report.level].triangles);
assert.equal(metadata.qa.nonFiniteVertices, 0);
assert.deepEqual(metadata.qa.missingUV, []);
assert(statSync(resolve(root, metadata.sourceProject)).size > 0);
const craftBytes = readFileSync(resolve(root, 'public/assets/C01/maintenance_craft.glb'));
const craft = JSON.parse(craftBytes.toString('utf8', 20, 20 + craftBytes.readUInt32LE(12)));
const lower = [Infinity, Infinity, Infinity];
const upper = [-Infinity, -Infinity, -Infinity];
for (const node of craft.nodes) {
  if (node.mesh === undefined) continue;
  assert(!node.rotation, 'Craft bounding check expects axis-aligned reference meshes');
  for (const primitive of craft.meshes[node.mesh].primitives) {
    const accessor = craft.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis++) {
      const scale = node.scale?.[axis] ?? 1;
      const translation = node.translation?.[axis] ?? 0;
      lower[axis] = Math.min(lower[axis], accessor.min[axis] * scale + translation);
      upper[axis] = Math.max(upper[axis], accessor.max[axis] * scale + translation);
    }
  }
}
const craftDimensions = upper.map((value, axis) => value - lower[axis]);
assert(Math.max(...craftDimensions) > 0.15 && Math.max(...craftDimensions) < 0.19, 'Fixed conceptual service-craft scale drifted');
process.stdout.write(JSON.stringify({ status: 'passed', reports, craftDimensions }, null, 2) + '\n');

if (process.argv.includes('--scene=C15')) {
  const habitatMetadata = JSON.parse(readFileSync(resolve(root, 'public/assets/C15/asset_metadata.json'), 'utf8'));
  const habitatManifest = JSON.parse(readFileSync(resolve(root, 'content/scenes/C15_asset_manifest.json'), 'utf8'));
  const habitatReports = [];
  for (const asset of habitatManifest.runtime_assets.filter(item => item.status === 'ready' && item.file.endsWith('.glb'))) {
    const file = asset.file.split('/').at(-1);
    const bytes = readFileSync(resolve(root, 'public/assets/C15', file));
    assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    let triangles = 0;
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, `Triangle topology required: ${file}`);
      assert(primitive.attributes.NORMAL !== undefined, `Normals missing: ${file}`);
      assert(primitive.attributes.TEXCOORD_0 !== undefined, `UVs missing: ${file}`);
      const position = gltf.accessors[primitive.attributes.POSITION];
      assert(position.min.every(Number.isFinite) && position.max.every(Number.isFinite), `Invalid bounds: ${file}`);
      triangles += gltf.accessors[primitive.indices].count / 3;
    }
    assert(triangles > 0);
    assert.equal(triangles, asset.triangles, `Manifest triangle count drift: ${file}`);
    assert.equal(bytes.length, asset.bytes, `Manifest bytes drift: ${file}`);
    if (file === 'habitat.glb') {
      for (const prefix of ['shell_land', 'shell_window', 'endcap', 'docking', 'mirror', 'radiator', 'ecology']) {
        assert(gltf.nodes.some(node => node.name?.startsWith(prefix)), `Missing C15 structure ${prefix}`);
      }
      assert.equal(triangles, habitatMetadata.habitat.triangles);
      assert.equal(bytes.length, habitatMetadata.habitat.bytes);
      assert(triangles < 180000, 'C15 macro structure exceeds agreed geometry budget');
    } else {
      assert(gltf.images?.length > 0, `Generated asset texture required: ${file}`);
      assert(gltf.materials.some(material => material.pbrMetallicRoughness?.baseColorTexture), `Asset PBR missing: ${file}`);
    }
    if (file === 'tree_lod3.glb') assert(gltf.materials.every(material => material.alphaMode === 'MASK'), 'Far tree cards must use alpha testing');
    habitatReports.push({ file, triangles, bytes: bytes.length, meshes: gltf.meshes.length, images: gltf.images?.length ?? 0 });
  }
  for (const asset of ['district', 'life_support', 'tree', 'riverfront_pavilion', 'riverfront_tower', 'riverfront_boat', 'riverfront_bench']) {
    const lods = habitatReports.filter(report => report.file.startsWith(`${asset}_`)).sort((a, b) => a.file.localeCompare(b.file));
    assert(lods.length >= 3);
    for (let level = 1; level < lods.length; level++) assert(lods[level - 1].triangles > lods[level].triangles, `C15 ${asset} LOD geometry must decrease`);
    for (const lod of lods) {
      const expected = habitatMetadata[asset].find(item => item.file === lod.file);
      assert(expected, `Missing metadata ${lod.file}`);
      assert.equal(lod.triangles, expected.triangles);
      assert.equal(lod.bytes, expected.bytes);
    }
  }
  const environment = habitatReports.find(report => report.file === 'riverfront_environment.glb');
  assert(environment && environment.triangles < 250000, 'Continuous environment geometry budget exceeded');
  for (const asset of habitatManifest.source_assets.filter(item => item.status === 'ready')) assert(statSync(resolve(root, asset.file)).size > 0, `Missing source ${asset.asset_id}`);
  assert(statSync(resolve(root, 'assets/source/blender/C15/habitat_master.blend')).size > 0, 'Editable C15 source required');
  assert.equal(habitatMetadata.qa.nonFiniteVertices, 0);
  assert.deepEqual(habitatMetadata.qa.missingUV, []);
  for (const file of [habitatMetadata.districtSource, habitatMetadata.districtSourceProject, habitatMetadata.life_supportSource, habitatMetadata.life_supportSourceProject, habitatMetadata.treeSource, habitatMetadata.treeSourceProject]) {
    assert.equal(typeof file, 'string', 'Source path required');
    assert(statSync(resolve(root, file)).size > 0, `Missing C15 source ${file}`);
  }
  process.stdout.write(JSON.stringify({ scene: 'C15', status: 'passed', reports: habitatReports }, null, 2) + '\n');
}
