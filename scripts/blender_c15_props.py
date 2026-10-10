"""Riverbank scale references; reuse the measured official-source asset pipeline."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_c15_heroes import process, ROOT

requested = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['boat', 'bench']
manifest_path = ROOT / 'content/scenes/C15_riverfront_assets.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for kind in requested:
    assert kind in ['boat', 'bench']
    record = process('riverfront_' + kind, 'c15-riverfront-' + kind,
                     .10 if kind == 'boat' else .02, .026 if kind == 'boat' else .009,
                     [(60000,4096),(10000,2048),(1000,1024)] if kind == 'boat'
                     else [(25000,4096),(3000,2048),(500,1024)])
    record['placement'] = {
        'pivot': 'Bottom center; GLB +Y up, long axis +X',
        'surface_radius_ru': 39.47 if kind == 'boat' else 39.43,
        'surface_height_y_ru_at_cylinder_bottom': -39.47 if kind == 'boat' else -39.43,
        'recommended_waterline_offset_ru': -.002 if kind == 'boat' else None,
        'human_scale_reference': '10m electric passenger ferry' if kind == 'boat' else '2m public bench; 0.9m back height',
        'scientific_boundary': 'Concept architecture at 1 RU=100m; dimensions chosen for human-scale comparison',
        'placement_note': 'Final world position follows curved landscape surface; +Y local bottom pivot remains zero'
    }
    record['repairs'] = [note for note in record['repairs'] if not note.startswith('LOD3')]
    manifest['assets'] = [r for r in manifest['assets'] if r['asset_id'] != record['asset_id']] + [record]
    manifest_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False) + '\n',encoding='utf-8')
    print('RIVERFRONT_PROP_COMPLETE',json.dumps(record))
