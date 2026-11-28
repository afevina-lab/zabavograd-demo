import {readFile,writeFile} from 'node:fs/promises';
const scene=JSON.parse(await readFile(new URL('../scenes/children-room/draft.json',import.meta.url),'utf8'));
await writeFile(new URL('../src/scene-engine/children-room.mjs',import.meta.url),'// Generated from scenes/children-room/draft.json; run node scripts/sync-room-scene.mjs.\nexport default '+JSON.stringify(scene,null,2)+';\n');
