/**
 * @fileoverview Manages loading and processing of game data (items, recipes).
 */

// Module-level state for game data
export let itemsData = {};
export let recipesData = [];
export let upgradePaths = {};
export let buildingsWanted = [];
export let spriteLayoutData = [];
export let craftableRecipesByBuildingType = {};
export let buildingTypeMap = {};
export let CraftingIdMap = {};
export let recipeIdToResultItemIdMap = {};
export let alternateRecipesMap = {};

/**
 * Fetches items.json and recipes.json, then processes the data to populate
 * application-specific data structures.
 */
export async function loadGameData() {
  const [itemsResponse, recipesResponse] =
      await Promise.all([fetch('json/items.min.json'), fetch('json/recipes.min.json')]);

  if (!itemsResponse.ok)
    throw new Error(`Failed to fetch items.json: ${itemsResponse.statusText}`);
  if (!recipesResponse.ok)
    throw new Error(`Failed to fetch recipes.json: ${recipesResponse.statusText}`);

  const itemsArray = await itemsResponse.json();
  recipesData = await recipesResponse.json();

  // Convert items array to an object keyed by ID for easy lookup
  itemsArray.forEach(item => {
    itemsData[item.id] = item;
  });

  // Process recipes and group them by crafting building type
  recipesData.forEach(recipe => {
    let buildingType;
    switch (recipe.type) {
      case 'SMELT':
        buildingType = 'Smelter';
        break;
      case 'ASSEMBLE':
        buildingType = 'Assembler';
        break;
      case 'REFINE':
        buildingType = 'Oil Refinery';
        break;
      case 'CHEMICAL':
        buildingType = 'Chemical Plant';
        break;
      case 'RESEARCH':
        buildingType = 'Matrix Lab';
        break;
      case 'EXCHANGE':
        buildingType = 'Energy Exchanger';
        break;
      case 'PHOTON_STORE':
        buildingType = 'Ray Receiver';
        break;
      case 'FRACTIONATE':
        buildingType = 'Fractionator';
        break;
      case 'COLLIDE':
        buildingType = 'Miniature Particle Collider';
        break;
      default:
        return;
    }

    if (!craftableRecipesByBuildingType[buildingType]) {
      craftableRecipesByBuildingType[buildingType] = [];
    }
    craftableRecipesByBuildingType[buildingType].push(recipe);
  });

  // Sort recipes alphabetically by result name
  for (const type in craftableRecipesByBuildingType) {
    craftableRecipesByBuildingType[type].sort((a, b) => {
      const nameA = itemsData[a.results[0]]?.name || '';
      const nameB = itemsData[b.results[0]]?.name || '';
      return nameA.localeCompare(nameB);
    });
  }

  // Map recipe IDs to their primary result item ID and group alternate recipes
  recipesData.forEach(recipe => {
    if (recipe.results && recipe.results.length > 0) {
      const resultItemId = recipe.results[0];
      recipeIdToResultItemIdMap[recipe.id] = resultItemId;

      if (!alternateRecipesMap[resultItemId]) {
        alternateRecipesMap[resultItemId] = [];
      }
      alternateRecipesMap[resultItemId].push(recipe);
    }
  });

  // Sort alternate recipes for consistency
  for (const resultItemId in alternateRecipesMap) {
    alternateRecipesMap[resultItemId].sort((a, b) => a.id - b.id);
  }

  // Create a map from recipe ID to the name of its crafted item
  recipesData.forEach(recipe => {
    const resultItemId = recipe.results[0];
    if (resultItemId && itemsData[resultItemId]) {
      CraftingIdMap[recipe.id] = itemsData[resultItemId].name;
    }
  });

  // Generate dynamic data structures from the loaded JSON
  _generateDynamicData(itemsArray);
}

/**
 * Populates upgrade paths, building groups, sprite layout, and building type maps.
 * This is an internal helper function.
 * @param {Array<Object>} itemsArray - The array of item objects from items.json.
 */
function _generateDynamicData(itemsArray) {
  const tempUpgradeGroups = {};

  itemsArray.forEach(item => {
    if (item.upgrades && item.upgrades.length > 0) {
      const key = JSON.stringify([...item.upgrades].sort((a, b) => a - b));
      if (!tempUpgradeGroups[key]) {
        tempUpgradeGroups[key] = item.upgrades;
      }
    }

    const itemName = item.name.toLowerCase();
    if (itemName.includes('assembl'))
      buildingTypeMap[item.id] = 'Assembler';
    else if (itemName.includes('smelter'))
      buildingTypeMap[item.id] = 'Smelter';
    else if (itemName.includes('refinery'))
      buildingTypeMap[item.id] = 'Oil Refinery';
    else if (itemName.includes('chemical plant'))
      buildingTypeMap[item.id] = 'Chemical Plant';
    else if (itemName.includes('matrix lab'))
      buildingTypeMap[item.id] = 'Matrix Lab';
    else if (itemName.includes('energy exchanger'))
      buildingTypeMap[item.id] = 'Energy Exchanger';
    else if (itemName.includes('ray receiver'))
      buildingTypeMap[item.id] = 'Ray Receiver';
    else if (itemName.includes('fractionator'))
      buildingTypeMap[item.id] = 'Fractionator';
    else if (itemName.includes('particle collider'))
      buildingTypeMap[item.id] = 'Miniature Particle Collider';
  });

  buildingsWanted =
      Object.values(tempUpgradeGroups).sort((a, b) => a[0] - b[0]);

  spriteLayoutData = buildingsWanted.map(upgradeGroup => {
    return upgradeGroup.map(itemId => {
      const item = itemsData[itemId];
      if (!item || typeof item.gridIndex === 'undefined') {
        console.warn(`Item ${itemId} or its gridIndex is missing.`);
        return {dataX: 0, dataY: 0};
      }
      const gridIndex = item.gridIndex;
      const dataY = Math.floor(gridIndex / 100) - 1;
      const dataX = (gridIndex % 100) - 1;
      return {dataX, dataY};
    });
  });

  itemsArray.forEach(item => {
    if (item.upgrades && item.upgrades.length > 0) {
      const titleItem = itemsData[item.upgrades[0]];
      const groupTitle = titleItem ?
          titleItem.name.replace(/ MK\..*| Mk\..*/, '') :
          'Upgrades';
      upgradePaths[item.id] = {
        title: groupTitle,
        upgrades: item.upgrades,
      };
    }
  });
}