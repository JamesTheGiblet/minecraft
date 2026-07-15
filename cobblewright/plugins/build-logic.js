/**
 * @file Build intelligence helpers for site assessment and structure-awareness.
 */

module.exports = (bot, sharedState) => {
  const materialHints = [
    'planks', 'stone_bricks', 'bricks', 'glass', 'door', 'stairs', 'slab',
    'fence', 'wall', 'torch', 'lantern', 'trapdoor', 'terracotta', 'concrete',
    'copper', 'deepslate_bricks', 'quartz', 'purpur', 'chiseled'
  ];

  const naturalHints = [
    'dirt', 'grass', 'stone', 'cobblestone', 'sand', 'gravel', 'clay', 'mud',
    'snow', 'ice', 'water', 'lava', 'log', 'leaves', 'moss', 'deepslate', 'tuff'
  ];

  const utilityNames = [
    'chest', 'barrel', 'crafting_table', 'furnace', 'blast_furnace', 'smoker',
    'anvil', 'grindstone', 'stonecutter', 'loom', 'cartography_table', 'smithing_table',
    'enchanting_table', 'shulker_box', 'beacon'
  ];

  const lightNames = ['torch', 'lantern', 'glowstone', 'sea_lantern', 'shroomlight', 'redstone_lamp'];

  const analyzeBuildArea = (pos) => {
    if (!pos) return null;

    const sampleRadius = 6;
    const seenUtility = new Set();
    const uniqueGroundHeights = new Set();
    let walkableCells = 0;
    let blockedCells = 0;
    let manMadeHits = 0;
    let naturalHits = 0;

    for (let x = -sampleRadius; x <= sampleRadius; x++) {
      for (let z = -sampleRadius; z <= sampleRadius; z++) {
        const foot = bot.blockAt(pos.offset(x, -1, z).floored());
        const body = bot.blockAt(pos.offset(x, 0, z).floored());
        const head = bot.blockAt(pos.offset(x, 1, z).floored());

        if (!foot || !body || !head) continue;

        if (foot.name !== 'air') {
          uniqueGroundHeights.add(foot.position.y);
        }

        if (foot.name !== 'air' && body.name === 'air' && head.name === 'air') {
          walkableCells++;
        } else {
          blockedCells++;
        }

        [foot, body, head].forEach((block) => {
          const blockName = block.name || '';
          if (materialHints.some((hint) => blockName.includes(hint))) manMadeHits++;
          if (naturalHints.some((hint) => blockName.includes(hint))) naturalHits++;
          if (utilityNames.some((utility) => blockName.includes(utility))) seenUtility.add(blockName);
        });
      }
    }

    let nearbyLights = 0;
    for (let x = -4; x <= 4; x++) {
      for (let y = -1; y <= 3; y++) {
        for (let z = -4; z <= 4; z++) {
          const block = bot.blockAt(pos.offset(x, y, z).floored());
          if (!block) continue;
          if (lightNames.some((light) => block.name.includes(light))) nearbyLights++;
        }
      }
    }

    const totalSurfaceSignals = manMadeHits + naturalHits;
    const manMadeRatio = totalSurfaceSignals > 0
      ? Math.round((manMadeHits / totalSurfaceSignals) * 100)
      : 0;

    const walkableRatio = (walkableCells + blockedCells) > 0
      ? walkableCells / (walkableCells + blockedCells)
      : 0;

    const verticalVariation = uniqueGroundHeights.size;
    const terrainFlatness = verticalVariation <= 2
      ? 'flat'
      : verticalVariation <= 4
        ? 'mixed'
        : 'rough';

    const roofBlock = bot.blockAt(pos.offset(0, 2, 0).floored());
    const sheltered = roofBlock && roofBlock.name !== 'air';

    const shelterState = sheltered
      ? 'covered'
      : walkableRatio < 0.5
        ? 'tight-enclosed'
        : 'open-air';

    const lightingState = nearbyLights >= 6
      ? 'well-lit'
      : nearbyLights >= 2
        ? 'dim'
        : 'dark';

    const siteReadiness = walkableRatio >= 0.7 && terrainFlatness === 'flat'
      ? 'ready-to-build'
      : walkableRatio >= 0.5
        ? 'minor-clearing-needed'
        : 'major-clearing-needed';

    return {
      manMadeRatio,
      terrainFlatness,
      shelterState,
      lightingState,
      siteReadiness,
      utilityBlocks: [...seenUtility].slice(0, 8)
    };
  };

  sharedState.analyzeBuildArea = analyzeBuildArea;
};
