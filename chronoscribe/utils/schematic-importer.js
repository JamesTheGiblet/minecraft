/**
 * @file This is a utility script to convert Minecraft .schem files into the JSON format
 * used by the structures.json knowledge base.
 *
 * HOW TO USE:
 * 1. Download a schematic file (e.g., from Planet Minecraft) and place it in this project.
 * 2. Run this script from your terminal: `node utils/schematic-importer.js path/to/your/schematic.schem`
 * 3. Copy the JSON output from the console.
 * 4. Paste it into `data/structures.json` with a new key.
 */

const fs = require('fs').promises;
const path = require('path');
const { Schematic } = require('prismarine-schematic');

async function main() {
  const schemPath = process.argv[2];
  if (!schemPath) {
    console.error('Usage: node schematic-importer.js <path-to-schematic-file>');
    process.exit(1);
  }

  try {
    console.log(`Reading schematic from: ${schemPath}`);
    const data = await fs.readFile(schemPath);
    const schem = await Schematic.parse(data);

    const blueprint = {
      name: path.basename(schemPath, '.schem').replace(/_/g, ' '),
      description: "A structure imported from a schematic file.",
      blocks: []
    };

    // The origin of a schematic is often its center, but we want 0,0,0 to be the corner.
    // We find the minimum coordinates to use as an offset.
    const offset = schem.offset;

    for (const block of schem.blocks) {
      blueprint.blocks.push({
        x: block.pos.x - offset.x,
        y: block.pos.y - offset.y,
        z: block.pos.z - offset.z,
        type: block.name
      });
    }

    console.log('\n--- COPY THE JSON BELOW ---\n');
    console.log(JSON.stringify(blueprint, null, 2));
    console.log('\n--- END OF JSON ---\n');

  } catch (e) {
    console.error('Failed to process schematic:', e);
  }
}

main();
