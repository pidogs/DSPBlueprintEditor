const spriteWidth = 70;
const spriteHeight = spriteWidth;
const delimiterArray = [155, 255, 255, 255];  // 0x9bffffff

const optionsGrid = document.querySelector('.options-grid');

const blueprintInput = document.getElementById('blueprintInput');
const pasteButton = document.getElementById('pasteButton');
const decodeButton = document.getElementById('decodeButton');
const blueprintOutput = document.getElementById('blueprintOutput');
const copyButton = document.getElementById('copyButton');
const errorMessageDiv = document.getElementById('error-message');
const recipeModal = document.getElementById('recipe-modal');
const modalCloseButton = document.getElementById('modal-close-button');
const modalRecipeGrid = document.getElementById('modal-recipe-grid');
let currentModalGroupKey = null;

let itemsData = {};
let recipesData = [];
let upgradePaths = {};
let spriteLayoutData = [];
let buildingsWanted = [];
let tempCompare = '';
let base64data = '';
let lastDecodedState = {};
// New global variables for recipe selection
let craftableRecipesByBuildingType = {};
let buildingTypeMap = {};
let CraftingIdMap = {};
// New global variables for recipe selection UI
let recipeIdToResultItemIdMap = {};
let activeRecipeSelectors = {};
let alternateRecipesMap = {};
let modalSelectionHandler = null;
let modalSelectedElement = null;


/**
 * Loads game data from JSON files, processes it, and initializes the page.
 */
async function main() {
  await loadGameData();
  initializePage();
}
/**
 * Fetches items.json and recipes.json, then processes the data to populate
 * application-specific data structures, including new recipe groupings.
 */
async function loadGameData() {
  try {
    const [itemsResponse, recipesResponse] =
        await Promise.all([fetch('items.json'), fetch('recipes.json')]);

    if (!itemsResponse.ok)
      throw new Error(
          `Failed to fetch items.json: ${itemsResponse.statusText}`);
    if (!recipesResponse.ok)
      throw new Error(
          `Failed to fetch recipes.json: ${recipesResponse.statusText}`);

    const itemsArray = await itemsResponse.json();
    recipesData = await recipesResponse.json();

    // Convert items array to an object keyed by ID for easy lookup
    itemsArray.forEach(item => {
      itemsData[item.id] = item;
    });

    // Process recipes and group them by crafting building type
    recipesData.forEach(recipe => {
      let buildingType;
      // Map recipe type to a building category
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
          return;  // Skip recipes we don't handle
      }

      if (!craftableRecipesByBuildingType[buildingType]) {
        craftableRecipesByBuildingType[buildingType] = [];
      }
      craftableRecipesByBuildingType[buildingType].push(recipe);
    });

    // Sort recipes alphabetically by result name for cleaner display
    for (const type in craftableRecipesByBuildingType) {
      craftableRecipesByBuildingType[type].sort((a, b) => {
        const nameA = itemsData[a.results[0]]?.name || '';
        const nameB = itemsData[b.results[0]]?.name || '';
        return nameA.localeCompare(nameB);
      });
    }

    // NEW: Map recipe IDs to their primary result item ID for easy lookup
    // AND Group alternate recipes by their result item
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

    // Sort the alternate recipes for consistency (e.g., base recipe first)
    for (const resultItemId in alternateRecipesMap) {
      alternateRecipesMap[resultItemId].sort((a, b) => a.id - b.id);
    }


    recipesData.forEach(recipe => {
      // Get the ID of the first result item (the primary product)
      const resultItemId = recipe.results[0];

      if (resultItemId && itemsData[resultItemId]) {
        CraftingIdMap[recipe.id] = itemsData[resultItemId].name;
      }
    });


    // Generate dynamic data structures from the loaded JSON
    generateDynamicData(itemsArray);

  } catch (error) {
    console.error('Could not load game data:', error);
    showError(
        'Failed to load essential game data. Please check the console and refresh.');
  }
}


/**
 * Populates upgrade paths, building groups, sprite layout data, and a
 * map of building IDs to their functional type from the items array.
 * @param {Array<Object>} itemsArray - The array of item objects from
 *     items.json.
 */
function generateDynamicData(itemsArray) {
  const tempUpgradeGroups = {};

  // Find all unique upgrade paths and map building types
  itemsArray.forEach(item => {
    if (item.upgrades && item.upgrades.length > 0) {
      // Use a sorted string as a key to group identical upgrade paths
      const key = JSON.stringify([...item.upgrades].sort((a, b) => a - b));
      if (!tempUpgradeGroups[key]) {
        tempUpgradeGroups[key] = item.upgrades;
      }
    }
    // Populate buildingTypeMap for recipe selectors
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

  // Create buildingsWanted and sort it by the first item ID for a consistent UI
  // order
  buildingsWanted =
      Object.values(tempUpgradeGroups).sort((a, b) => a[0] - b[0]);

  // Generate spriteLayoutData from buildingsWanted and itemsData
  spriteLayoutData = buildingsWanted.map(upgradeGroup => {
    return upgradeGroup.map(itemId => {
      const item = itemsData[itemId];
      if (!item || typeof item.gridIndex === 'undefined') {
        console.warn(`Item ${itemId} or its gridIndex is missing.`);
        return {dataX: 0, dataY: 0};  // Default/error coordinate
      }
      const gridIndex = item.gridIndex;
      // gridIndex is RRCC (1-based), so convert to 0-based x, y
      const dataY = Math.floor(gridIndex / 100) - 1;
      const dataX = (gridIndex % 100) - 1;
      return {dataX, dataY};
    });
  });

  // Generate upgradePaths for quick lookup
  itemsArray.forEach(item => {
    if (item.upgrades && item.upgrades.length > 0) {
      const titleItem = itemsData[item.upgrades[0]];
      // Generate a generic title by removing " MK.x" from the first item name
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

/**
 * Generates HTML for a recipe selector group for a specific building instance.
 * @param {object} segmentData - The decoded data for the building segment.
 * @param {number} segmentIndex - The index of this segment in the blueprint.
 * @returns {HTMLElement} The root HTML element of the recipe selector group.
 */
function generateRecipeSelectorGroupHTML(segmentData, segmentIndex) {
  const buildingId = segmentData.BuildingID;
  const buildingInfo = itemsData[buildingId];
  const buildingType = buildingTypeMap[buildingId];
  const recipes = craftableRecipesByBuildingType[buildingType] || [];

  const title = `${buildingInfo.name} (Index: ${segmentData.Index})`;
  const uniqueId = `recipe-${segmentIndex}`;

  let optionsHtml = '<option value="0">-- No Recipe --</option>';
  recipes.forEach(recipe => {
    const resultItem = itemsData[recipe.results[0]];
    if (resultItem) {
      const isSelected =
          resultItem.id === segmentData.CraftedItem ? 'selected' : '';
      optionsHtml += `<option value="${resultItem.id}" ${isSelected}>${
          resultItem.name}</option>`;
    }
  });

  const groupHtml = `
    <div class="sprite-selector-group" id="group-${
      uniqueId}" data-building-type="${buildingType}">
      <p>${title}</p>
      <div class="recipe-selector-container">
        <label for="select-${uniqueId}">Recipe:</label>
        <select id="select-${uniqueId}" data-segment-index="${segmentIndex}">
          ${optionsHtml}
        </select>
      </div>
    </div>
  `;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = groupHtml.trim();
  const groupElement = tempDiv.firstChild;

  // Attach event listener immediately
  const selectElement = groupElement.querySelector('select');
  if (selectElement) {
    selectElement.addEventListener('change', () => {
      if (typeof encode === 'function') encode();
    });
  }

  return groupElement;
}


/**
 * Attaches event listeners to the UI elements.
 */
function initializePage() {
  pasteButton.addEventListener('click', getClip);
  decodeButton.addEventListener('click', Decode);
  copyButton.addEventListener('click', Copy);

  // New modal listeners
  modalCloseButton.addEventListener('click', closeRecipeModal);
  recipeModal.addEventListener('click', (event) => {
    // Close if the background overlay is clicked, but not the content
    if (event.target === recipeModal) {
      closeRecipeModal();
    }
  });

  // Add listener for Escape key to close the modal
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && recipeModal.classList.contains('visible')) {
      closeRecipeModal();
    }
  });

  // NEW: Add a debounced resize listener to update selection borders
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateAllSelectorBorders, 150);
  });
}


/**
 * Displays an error message to the user and highlights the blueprint input
 * field.
 *
 * @param {string} message - The error message to display.
 */
function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';
  blueprintInput.style.borderColor = 'var(--error-border-color)';  // Visual cue
}

/**
 * Hides the error message and resets the input border color to its default
 * value. Clears the error message text, hides the error message element, and
 * restores the blueprint input's border color.
 */
function hideError() {
  errorMessageDiv.textContent = '';
  errorMessageDiv.style.display = 'none';
  blueprintInput.style.borderColor = 'var(--input-border-color)';  // Reset
}


/**
 * Determines if the given current version is newer than or equal to the
 * reference version.
 *
 * Versions are compared numerically by splitting on '.' and comparing each part
 * in order. If a part is missing, it is treated as 0.
 *
 * @param {string} currentVersion - The version string to compare (e.g.,
 *     "0.10.31.22242").
 * @param {string} [referenceVersion='0.10.30.22241'] - The reference version
 *     string to compare against.
 * @returns {boolean} Returns true if currentVersion is newer than or equal to
 *     referenceVersion, false otherwise.
 */
function isNewerVersion(currentVersion, referenceVersion = '0.10.30.22241') {
  const currentParts = currentVersion.split('.').map(Number);
  const referenceParts = referenceVersion.split('.').map(Number);
  const maxLength = Math.max(currentParts.length, referenceParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const referencePart = referenceParts[i] || 0;

    if (currentPart > referencePart) {  // Current version is newer
      return true;
    }
    if (currentPart < referencePart) {  // Current version is older
      return false;
    }
  }

  return true;
}

/**
 * Sets up a sprite container with selection, click handling, and visual
 * feedback. Allows selecting sprites, disabling/enabling clicks, and updating
 * selection display.
 *
 * @param {HTMLElement} containerElement - The DOM element containing the sprite
 *     group.
 * @param {string[]} groupItemIds - Array of item IDs corresponding to each
 *     sprite in the group.
 * @param {string|number} groupUniqueId - Unique identifier for the group, used
 *     for DOM element IDs.
 * @param {string} genericGroupTitle - Title or type of the group, used for
 *     global update logic.
 * @returns {{
 *   deselectAll: function(): void,
 *   selectSprite: function(string|number): void,
 *   enableClicks: function(): void,
 *   disableClicks: function(): void,
 *   getSelectedIndex: function(): number,
 *   updateBorderPosition: function(): void
 * }} An object exposing methods to control sprite selection and interaction.
 */
function setupSpriteContainer(
    containerElement, groupItemIds, groupUniqueId, genericGroupTitle) {
  let selectedSprite = null;
  let selectedIndex = -1;
  let clickEnabled = false;
  const container = containerElement;  // Use passed element
  if (!container) return;
  const border = container.querySelector('.border');
  const sprites = container.querySelectorAll('.sprite');
  const selectedSpan =
      document.getElementById(`selected-name-${groupUniqueId}`);

  // This function is no longer needed as CSS handles sprite positioning via
  // data-icon.


  /**
   * Recalculates and sets the position of the selection border based on the
   * currently selected sprite.
   */
  function updateBorderPosition() {
    if (!selectedSprite || !border) {
      if (border) border.style.opacity = 0;
      return;
    }
    border.style.opacity = 1;
    const spriteDOMElements = Array.from(sprites);
    const visualIndex = spriteDOMElements.indexOf(selectedSprite);
    if (visualIndex !== -1) {
      // This is the key calculation that needs to be re-run on resize
      border.style.left = `${visualIndex * (spriteWidth + 16) + 15}px`;
    }
  }


  function disableSpriteClicks() {
    clickEnabled = false;
    sprites.forEach(sprite => {
      sprite.style.pointerEvents = 'none';
      sprite.style.cursor = 'default';
      sprite.style.opacity = 0.5;
    });
    // Hide the border if it's visible
    if (border) {
      border.style.opacity = 0;
    }
    if (selectedSpan) {
      selectedSpan.textContent = 'None';
    }
    selectedSprite = null;  // Clear selection
    selectedIndex = -1;
  }


  function enableSpriteClicks() {
    clickEnabled = true;
    sprites.forEach(sprite => {
      sprite.style.pointerEvents = 'auto';
      sprite.style.cursor = 'pointer';
    });
  }

  function deselectAll() {
    disableSpriteClicks();
    // Hide the selection border/indicator
    if (border) {
      border.style.opacity = 0;
    }

    // Set opacity for all sprites in this container
    sprites.forEach(sprite => {
      sprite.style.opacity = 0.5;
    });

    // Update the selected text display for this container
    if (selectedSpan) {
      selectedSpan.textContent = 'None';
    }

    selectedSprite = null;
    selectedIndex = -1;
  }


  function selectSprite(numericalIdSuffix) {
    enableSpriteClicks();
    const fullSpriteId = `sprite-${groupUniqueId}-${numericalIdSuffix}`;
    const newSelectedSprite = document.getElementById(fullSpriteId);
    if (!newSelectedSprite) return;

    if (selectedSprite) {
      selectedSprite.style.opacity = 0.5;
    }
    newSelectedSprite.style.opacity = 1;
    selectedSprite = newSelectedSprite;
    selectedIndex = parseInt(numericalIdSuffix);

    // Centralize positioning logic into one function
    updateBorderPosition();

    if (selectedSpan && itemsData && groupItemIds[selectedIndex - 1] &&
        itemsData[groupItemIds[selectedIndex - 1]]) {
      selectedSpan.textContent =
          itemsData[groupItemIds[selectedIndex - 1]].name;
    } else if (selectedSpan) {
      selectedSpan.textContent = 'Error';
      console.warn(
          'Could not set selected item name for:', groupUniqueId, selectedIndex,
          groupItemIds[selectedIndex - 1]);
    }
  }


  function getSelectedIndex() {
    return selectedIndex;
  }


  sprites.forEach((sprite) => {
    // updateSpritePosition(sprite); // No longer needed
    sprite.addEventListener('click', (event) => {  // Added event parameter
      const numericalSuffix = sprite.id.split('-').pop();
      const selectedItemId = groupItemIds[parseInt(numericalSuffix) - 1];

      if (event.shiftKey) {
        // If shift is pressed, call the global update function
        updateAllGroupsOfType(genericGroupTitle, selectedItemId);
      } else {
        // Otherwise, perform a normal click action
        selectSprite(numericalSuffix);
        if (typeof encode === 'function') encode();
      }
    });
  });



  if (sprites.length > 0 &&
      sprites[0].id) {  // Ensure sprite[0] and its id exist
    const firstSpriteNumericalSuffix = sprites[0].id.split('-').pop();
    if (firstSpriteNumericalSuffix) selectSprite(firstSpriteNumericalSuffix);
  }

  return {
    deselectAll: deselectAll,
    selectSprite: selectSprite,  // Now exposed externally
    enableClicks: enableSpriteClicks,
    disableClicks: disableSpriteClicks,
    getSelectedIndex: getSelectedIndex,
    updateBorderPosition: updateBorderPosition  // Expose for resize handler
  };
}

/**
 * Generates an HTML element representing a group of sprite selectors.
 *
 * @param {string} groupTitle - The title of the sprite selector group.
 * @param {Array<string>} itemIds - Array of item IDs to display as sprites.
 * @param {string|number} groupUniqueId - Unique identifier for the group, used
 *     for element IDs.
 * @returns {HTMLElement} The root HTML element of the sprite selector group.
 */
function generateSpriteSelectorGroupHTML(groupTitle, itemIds, groupUniqueId) {
  let spritesHtml = '';
  // The loop now uses the item ID to create a data-icon attribute
  itemIds.forEach((itemId, index) => {
    const itemName =
        itemsData[itemId] ? itemsData[itemId].name : 'Unknown Item';
    const spriteId = `sprite-${groupUniqueId}-${index + 1}`;

    // Use data-icon for CSS-based sprite mapping, removing data-x/y
    spritesHtml += `
      <div
        class="sprite"
        id="${spriteId}"
        data-icon="item.${itemId}"
        title="${itemName}"
      ></div>`;
  });

  const groupHtml = `
    <div class="sprite-selector-group" id="group-${groupUniqueId}">
      <p>Convert: ${groupTitle}</p>
      <div id="sprite-container-${groupUniqueId}" class="sprite-container">
        <div class="border"></div>
        ${spritesHtml}
      </div>
      <p class="selected-info">
        Selected: <span id="selected-name-${groupUniqueId}">None</span>
      </p>
    </div>`;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = groupHtml.trim();
  return tempDiv.firstChild;
}

/**
 * Converts C# ticks (100-nanosecond intervals since 0001-01-01) to milliseconds
 * since the Unix epoch (1970-01-01).
 *
 * @param {number} ticks - The number of C# ticks to convert.
 * @returns {number} The corresponding time in milliseconds since the Unix
 *     epoch.
 */
function csharpTicksToJSDate(ticks) {
  // Ticks per millisecond
  const ticksPerMillisecond = 10000;
  // Ticks between the .NET epoch (0001-01-01) and the Unix epoch (1970-01-01).
  const epochDifferenceTicks = 621355968000000000;
  // Convert C# ticks to milliseconds since the Unix epoch.
  const milliseconds = (ticks - epochDifferenceTicks) / ticksPerMillisecond;
  // Create a JavaScript Date object.
  const date = new Date(milliseconds);
  return milliseconds;
}

/**
 * Asynchronously reads text from the user's clipboard and sets it as the value
 * of the input element with the ID 'blueprintInput'. If successful, attempts to
 * call the global Decode function. Handles errors and missing elements
 * gracefully.
 *
 * @async
 * @function getClip
 * @returns {Promise<void>} Resolves when clipboard text is read and processed,
 *     or rejects on error.
 */
async function getClip() {
  const blueprintInput = document.getElementById('blueprintInput');
  if (!blueprintInput) {
    console.error('Blueprint input element not found!');
    return;
  }

  try {
    // This is the line that might trigger a permission prompt
    const text = await navigator.clipboard.readText();
    // console.log('Pasted text:', text);
    blueprintInput.value = text;

    // Call Decode immediately after successful paste
    if (typeof Decode === 'function') {
      Decode();
    } else {
      console.warn('Decode function is not defined.');
    }
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
  }
}

window.getClip = getClip;

async function Copy() {
  const text = document.getElementById('blueprintOutput').value;
  navigator.clipboard.writeText(text);
}
window.Copy = Copy;

/**
 * Decodes a blueprint input string, validates its hash, decompresses and parses
 * the data, and dynamically generates UI groups for upgradeable buildings and
 * crafter recipes.
 */
function Decode() {
  var predata;
  if (optionsGrid) {
    optionsGrid.innerHTML = '';
  }
  hideError();
  // Clear out the state from the previous decode
  lastDecodedState = {};
  activeRecipeSelectors = {};

  let bp_string = document.getElementById('blueprintInput').value;
  if (!bp_string) {
    showError('Blueprint input is empty.');
    return;
  }
  try {
    const inputIndex = bp_string.lastIndexOf('"');
    const hashed_data = bp_string.substring(0, inputIndex);
    let encodedData = bp_string.split('"')[1];
    predata = bp_string.substring(0, bp_string.indexOf('"'));
    let givenHash = bp_string.substring(bp_string.lastIndexOf('"') + 1);
    let md5Hash = md5(new stringToBytes(hashed_data), true, true);
    if (md5Hash.trim().toLowerCase() !== givenHash.trim().toLowerCase()) {
      const error = new Error(`Invalid input:.\n Calculated hash:${
          md5Hash.toLowerCase()},\nExpected hash:${givenHash.toLowerCase()}`);
      error.name = 'HashMismatchError';
      throw error;
    }
    base64data = crypt.base64ToBytes(encodedData)
    let decodedData = pako.ungzip(base64data);

    let hexList = byteArrayToHexString(decodedData)
    tempCompare = hexList
    let hexsplit = hexList.split('9bffffff')
    let dynamicSelectionGroups = {};
    const crafterGroups = {};

    for (const i in hexsplit) {
      if (i == 0) {
        continue
      }
      const segment = hexsplit[i];

      let buildingId = decodeBuildingNumber(segment.slice(8, 12));

      // Handle upgradeable buildings
      if (upgradePaths[buildingId]) {
        const groupKey = buildingId;

        if (!dynamicSelectionGroups[groupKey]) {
          const groupDefinition = upgradePaths[buildingId];
          const groupTitle =
              itemsData[buildingId]?.name || `Building ID: ${buildingId}`;
          const itemIdsForGroup = groupDefinition.upgrades;
          const groupIndex = buildingsWanted.findIndex(
              wantedGroup => JSON.stringify(wantedGroup) ===
                  JSON.stringify(itemIdsForGroup));

          if (groupIndex === -1) {
            console.warn(`Could not find sprite layout for group: ${
                groupDefinition.title}`);
          } else {
            const spriteCoordinates = spriteLayoutData[groupIndex];
            const groupUniqueId = `building-${buildingId}`;

            const groupElement = generateSpriteSelectorGroupHTML(
                groupTitle, itemIdsForGroup, groupUniqueId);
            if (optionsGrid) optionsGrid.appendChild(groupElement);

            const spriteContainerInDom =
                document.getElementById(`sprite-container-${groupUniqueId}`);
            if (spriteContainerInDom) {
              const selectorInstance = setupSpriteContainer(
                  spriteContainerInDom, itemIdsForGroup, groupUniqueId,
                  groupDefinition.title);

              dynamicSelectionGroups[groupKey] = {
                selectorInstance,
                hexIndices: [],
                itemIds: itemIdsForGroup
              };
            }
          }
        }

        if (dynamicSelectionGroups[groupKey]) {
          dynamicSelectionGroups[groupKey].hexIndices.push(i);

          const upgradeOptions = dynamicSelectionGroups[groupKey].itemIds;
          const spriteIndexToSelect = upgradeOptions.indexOf(buildingId);

          if (spriteIndexToSelect !== -1) {
            dynamicSelectionGroups[groupKey].selectorInstance.selectSprite(
                spriteIndexToSelect + 1);
          }
        }
      }

      // Handle crafter buildings (Assemblers, Smelters, etc.)
      const buildingType = buildingTypeMap[buildingId];
      if (buildingType && craftableRecipesByBuildingType[buildingType]) {
        const recipeId = decodeBuildingNumber(segment.slice(78, 82));
        console.log(recipeId)
        if (recipeId >= 0 && recipeId !== 65535) {
          const groupKey = `${buildingType}-${recipeId}`;
          if (!crafterGroups[groupKey]) {
            crafterGroups[groupKey] = {
              name: itemsData[buildingId]?.name,
              buildingType,
              recipeId,
              count: 0,
              hexIndices: [],
            };
          }
          crafterGroups[groupKey].count++;
          crafterGroups[groupKey].hexIndices.push(i);
        }
      }
    }

    // Generate UI for recipe modification groups
    for (const key in crafterGroups) {
      const groupData = crafterGroups[key];
      const groupElement = generateRecipeSelectorHTML(groupData, key);
      if (optionsGrid) {
        optionsGrid.appendChild(groupElement);
        // Set up the interactive parts now that the element is in the DOM
        setupRecipeSelector(groupElement, groupData, key);
      }
    }

    lastDecodedState =
        {predata, hexsplit, dynamicSelectionGroups, crafterGroups};
    encode();
  } catch (e) {
    console.error('Error during Decode:', e.message);
    showError(`Decoding error: ${e.message || e}`);
    blueprintInput.style.borderColor = 'var(--error-border-color)';
  }
}
window.Decode = Decode

/**
 * Encodes the current blueprint state by updating hex segments based on user
 * selections, compresses the result using gzip, and generates a final blueprint
 * string with a hash.
 */
function encode() {
  const {predata, hexsplit, dynamicSelectionGroups} = lastDecodedState;

  if (!predata || !hexsplit) {
    console.warn('encode called before successful decode. Aborting.');
    return;
  }

  hideError();

  let tempHexSegments = [...hexsplit];

  // Update segments for building UPGRADES
  for (const groupKey in dynamicSelectionGroups) {
    const group = dynamicSelectionGroups[groupKey];
    const selectedSpriteOneBasedIndex =
        group.selectorInstance.getSelectedIndex();

    if (selectedSpriteOneBasedIndex <= 0) {
      const groupTitle =
          itemsData[groupKey]?.name || `Building ID: ${groupKey}`;
      showError(`Error: No selection made for ${groupTitle}.`);
      continue;
    }

    const selectedItemActualIndex = selectedSpriteOneBasedIndex - 1;
    const buildingNumToEncode = group.itemIds[selectedItemActualIndex];

    if (itemsData[buildingNumToEncode] === undefined) {
      showError(`Error: Data for item ID ${buildingNumToEncode} is missing.`);
      continue;
    }
    const modelNumToEncode = itemsData[buildingNumToEncode].modelIndex;

    for (const hexSplitIndex of group.hexIndices) {
      let segmentHex = tempHexSegments[hexSplitIndex];
      let buildingHexLE = encodeBuildingNumber(buildingNumToEncode);
      segmentHex =
          segmentHex.slice(0, 8) + buildingHexLE + segmentHex.slice(12);
      let modelHexLE = encodeBuildingNumber(modelNumToEncode);
      segmentHex = segmentHex.slice(0, 12) + modelHexLE + segmentHex.slice(16);
      tempHexSegments[hexSplitIndex] = segmentHex;
    }
  }

  // Update segments for RECIPE changes
  for (const groupKey in activeRecipeSelectors) {
    const group = activeRecipeSelectors[groupKey];
    const selectedRecipeId = group.selectedRecipeId;
    const recipeHexLE = encodeBuildingNumber(selectedRecipeId || 0);

    for (const hexSplitIndex of group.hexIndices) {
      let segmentHex = tempHexSegments[hexSplitIndex];
      // The "crafted item" slice (offset 39, 2 bytes) is the recipe ID
      segmentHex = segmentHex.slice(0, 78) + recipeHexLE + segmentHex.slice(82);
      tempHexSegments[hexSplitIndex] = segmentHex;
    }
  }


  const finalHexString = tempHexSegments.join('9bffffff');
  const byteArrayForGzip = hexStringToArray(finalHexString);
  const pakoOptions = {level: 6, header: {mtime: 0, os: 11}};
  let zippedData = pako.gzip(byteArrayForGzip, pakoOptions);
  let encodedBlueprintPart = predata + '"' + crypt.bytesToBase64(zippedData);
  let newHash = md5(new stringToBytes(encodedBlueprintPart), true, true);
  let finalBlueprintString = encodedBlueprintPart + '"' + newHash.toUpperCase();

  document.getElementById('blueprintOutput').value = finalBlueprintString;
}
window.encode = encode;

function encodeBuildingNumber(buildingNumToEncode) {
  return (
      (buildingNumToEncode & 0xFF).toString(16).padStart(2, '0') +
      ((buildingNumToEncode >> 8) & 0xFF).toString(16).padStart(2, '0'));
}

function decodeBuildingNumber(encodedString) {
  if (encodedString.length !== 4) {
    throw new Error('Invalid encoded string length. Expected 4 characters.');
  }

  const lowByte = parseInt(encodedString.slice(0, 2), 16);
  const highByte = parseInt(encodedString.slice(2, 4), 16);

  return (highByte << 8) | lowByte;
}

function findStringDifferences(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  const differences = [];

  for (let i = 0; i < maxLength; i++) {
    if (str1[i] !== str2[i]) {
      differences.push(`Index ${i}: '${str1[i] || ' '} vs '${str2[i] || ' '}'`);
    }
  }
  if (differences.length == 0) {
    return -1
  }
  return differences;
}

/**
 * Updates all dynamic selection groups of a specific type by selecting a new
 * item in their UI selectors.
 *
 * Iterates through all groups in `lastDecodedState.dynamicSelectionGroups`,
 * finds those whose generic title matches the provided `genericTitle`, and
 * updates their selector to select the item with `newItemId`. After updating,
 * it calls the `encode` function to persist the changes.
 *
 * @param {string} genericTitle - The generic title of the group type to update.
 * @param {string|number} newItemId - The ID of the new item to select in each
 *     matching group.
 */
function updateAllGroupsOfType(genericTitle, newItemId) {
  const {dynamicSelectionGroups} = lastDecodedState;
  if (!dynamicSelectionGroups) return;

  // Iterate over all the active selectors on the page
  for (const groupKey in dynamicSelectionGroups) {
    const group = dynamicSelectionGroups[groupKey];

    // Find the generic title for this group using the original building ID (the
    // key)
    const currentGroupGenericTitle = upgradePaths[groupKey]?.title;

    // Check if it's the type of group we want to modify
    if (currentGroupGenericTitle === genericTitle) {
      // Find the index of the new item in this selector's list of options
      const spriteIndexToSelect = group.itemIds.indexOf(newItemId);

      if (spriteIndexToSelect !== -1) {
        // The selectSprite method expects a 1-based index
        group.selectorInstance.selectSprite(spriteIndexToSelect + 1);
      }
    }
  }

  // After updating all the relevant UI selectors, encode the result.
  if (typeof encode === 'function') {
    encode();
  }
}

/**
 * Converts a byte array to its hexadecimal string representation.
 *
 * Each byte in the input array is converted to a two-character hexadecimal
 * string. If the input is null or undefined, an empty string is returned and an
 * error is logged.
 *
 * @param {Uint8Array|number[]} byteArray - The array of bytes to convert.
 * @returns {string} The hexadecimal string representation of the byte array.
 */
function byteArrayToHexString(byteArray) {
  if (!byteArray) {
    console.error('Input byte array is null or undefined.');
    return '';
  }

  return Array.from(byteArray)
      .map(byte => {
        const hex = (byte & 0xFF).toString(16);
        // Pad with a leading zero if the hex representation is a single digit
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
}

/**
 * Converts a hexadecimal string into a Uint8Array.
 *
 * Each pair of hexadecimal characters in the input string is parsed as a byte.
 * If an invalid hex byte is encountered, the function logs an error and returns
 * -1.
 *
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {Uint8Array|number} A Uint8Array representing the bytes of the hex
 *     string,
 * or -1 if an invalid byte is found.
 */
function hexStringToArray(hexString) {
  const int8Array = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byteHex = hexString.substring(i, i + 2);

    const unsignedByteValue = parseInt(byteHex, 16);

    if (isNaN(unsignedByteValue)) {
      console.error(
          `Invalid hex byte "${byteHex}" at position ${i}. Skipping.`);
      return -1;
    }
    int8Array.push(unsignedByteValue);
  }

  return new Uint8Array(int8Array);
  ;
}



/**
 * Splits a byte array into segments using a specified delimiter array.
 *
 * @param {number[]} byteArray - The input array of bytes to be split.
 * @returns {number[][]} An array of byte segments, split by the delimiter.
 *
 * @example
 * // Assuming delimiterArray = [0xFF, 0x00]
 * const byteArray = [1, 2, 0xFF, 0x00, 3, 4];
 * const segments = splitByteArrayByDelimiter(byteArray);
 * // segments: [[1, 2], [3, 4]]
 *
 * @throws {ReferenceError} If delimiterArray is not defined in the scope.
 */
function splitByteArrayByDelimiter(byteArray) {
  const result = [];
  let currentSegment = [];
  let i = 0;

  while (i < byteArray.length) {
    // Check if the delimiter sequence starts at the current position
    let match = true;
    if (i + delimiterArray.length <= byteArray.length) {
      for (let k = 0; k < delimiterArray.length; k++) {
        if (byteArray[i + k] !== delimiterArray[k]) {
          match = false;
          break;
        }
      }
    } else {
      match = false;
    }

    if (match) {
      result.push(currentSegment);
      currentSegment = [];
      i += delimiterArray.length;
    } else {
      currentSegment.push(byteArray[i]);
      i++;
    }
  }

  result.push(currentSegment);

  return result;
}

/**
 * Decodes the full blueprint data including main header, areas, building
 * header, and segments.
 *
 * @param {number[]} fullByteArray The complete byte array for the blueprint.
 * @returns {object|null} The decoded blueprint object or null on critical
 *     failure.
 */
function decodeFullBlueprint(fullByteArray) {
  if (!fullByteArray || fullByteArray.length === 0) {
    console.error('Input byte array is empty or null.');
    return null;
  }

  const uint8Array = new Uint8Array(fullByteArray);
  const buffer = uint8Array.buffer;
  const view = new DataView(buffer);

  let currentOffset = 0;
  const decodedBlueprint =
      {header: null, areas: [], buildingHeader: null, segments: []};

  const mainHeaderResult = decodeMainHeader(view);  // Assumed to be available
  if (mainHeaderResult.header.error) {
    console.error('Error decoding main header:', mainHeaderResult.header.error);
    return {
      error: 'Failed to decode main header',
      details: mainHeaderResult.header.error,
      ...decodedBlueprint
    };
  }
  decodedBlueprint.header = mainHeaderResult.header;
  currentOffset += mainHeaderResult.bytesRead;

  if (decodedBlueprint.header && decodedBlueprint.header.area_count > 0) {
    for (let i = 0; i < decodedBlueprint.header.area_count; i++) {
      if (currentOffset >= view.byteLength) {
        console.error(`Ran out of data while trying to read area ${i}.`);
        decodedBlueprint.areas.push({error: `Ran out of data for area ${i}`});
        break;
      }
      const areaResult =
          decodeBlueprintArea(view, currentOffset);  // Assumed to be available
      if (areaResult.area.error) {
        console.error(`Error decoding area ${i}:`, areaResult.area.error);
        decodedBlueprint.areas.push(areaResult.area);
        const sizeToAdvance = areaResult.bytesRead > 0 ? areaResult.bytesRead :
                                                         14;  // Expected size
        currentOffset += sizeToAdvance;
        if (areaResult.bytesRead === 0) break;
      } else {
        decodedBlueprint.areas.push(areaResult.area);
        currentOffset += areaResult.bytesRead;
      }
    }
  }

  const buildingHeaderData = {};
  if (currentOffset + 4 <= view.byteLength) {
    buildingHeaderData.building_count =
        view.getUint32(currentOffset, true);  // true for littleEndian
    currentOffset += 4;
    decodedBlueprint.buildingHeader = buildingHeaderData;
  } else {
    console.error('Not enough data to read Building Header.');
    buildingHeaderData.error = 'Not enough data for Building Header.';
    decodedBlueprint.buildingHeader = buildingHeaderData;
  }

  const bytesForSegments = (currentOffset <= fullByteArray.length) ?
      fullByteArray.slice(currentOffset) :
      [];


  let listOfByteSegments = splitByteArrayByDelimiter(
      bytesForSegments, delimiterArray);  // Assumed to be available
  listOfByteSegments.shift()
  decodedBlueprint.segments = listOfByteSegments.map(
      segment => decodeSegment(segment));  // Assumed to be available

  return decodedBlueprint;
}


/**
 * Factory function to create a moving border selection handler for a grid.
 * @param {HTMLElement} container - The grid container element.
 * @returns {object} An object with a method to move the selection border.
 */
function setupGridSelectionHandler(container) {
  const border = document.createElement('div');
  border.className = 'selection-border';  // Requires CSS from grid-view.css
  container.appendChild(border);

  return {
    moveTo: (targetElement) => {
      if (!targetElement) {
        border.style.opacity = '0';
        return;
      }
      border.style.opacity = '1';
      const left = targetElement.offsetLeft - container.clientLeft;
      const top = targetElement.offsetTop - container.clientTop;
      border.style.transform = `translate(${left}px, ${top}px)`;
    }
  };
}


/**
 * Generates the HTML for a single, clickable recipe display which opens a
 * modal. If the recipe has alternates, it also generates a sprite selector
 * for them.
 * @param {object} groupData - The grouped data for the crafter buildings.
 * @param {string} groupKey - The unique key for this group.
 * @returns {HTMLElement} The root HTML element of the recipe selector group.
 */
function generateRecipeSelectorHTML(groupData, groupKey) {
  const currentRecipeId = groupData.recipeId;
  const resultItemId = recipeIdToResultItemIdMap[currentRecipeId];
  const currentRecipeName = CraftingIdMap[currentRecipeId] || 'None';
  var title = title = `${groupData.name}s (${groupData.count} building)`;
  if (groupData.count > 1) {
    title = `${groupData.name}s (${groupData.count} buildings)`;
  }

  const alternates = alternateRecipesMap[resultItemId];
  let alternateSelectorHtml = '';

  if (alternates && alternates.length > 1) {
    let alternateSpritesHtml = '';
    alternates.forEach((recipe) => {
      // Base recipes are represented by their product's item icon.
      // Alternate recipes (explicit: true) have their own unique recipe icon.
      const productOfRecipe = recipe.results[0];
      const iconValue =
          recipe.explicit ? `recipe.${recipe.id}` : `item.${productOfRecipe}`;

      alternateSpritesHtml += `
        <div
          class="sprite recipe-alternate"
          id="alt-sprite-${groupKey}-${recipe.id}"
          data-recipe-id="${recipe.id}"
          data-icon="${iconValue}"
          title="${recipe.name}"
        ></div>`;
    });

    // Add the custom class for styling overrides
    alternateSelectorHtml = `
      <div id="alternate-selector-${
        groupKey}" class="sprite-container alternate-recipe-selector">
        <div class="border"></div>
        ${alternateSpritesHtml}
      </div>
    `;
  }

  // This is the main change: wrap the display and selector in
  // recipe-selection-area
  const groupHtml = `
    <div class="sprite-selector-group" id="group-${groupKey}">
        <p>${title}</p>
        <div class="recipe-selection-area">
            <div class="recipe-display" id="recipe-display-${
      groupKey}" title="Click to change recipe: ${currentRecipeName}">
                <div class="item-icon"
                     data-icon="item.${resultItemId}">
                </div>
                <span id="selected-name-${groupKey}">${currentRecipeName}</span>
            </div>
            ${alternateSelectorHtml}
        </div>
    </div>`;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = groupHtml.trim();
  return tempDiv.firstChild;
}


/**
 * Initializes the pop-up modal trigger for a recipe selector UI group and
 * sets up the selector for alternate recipes if they exist.
 * @param {HTMLElement} groupElement - The DOM element for the selector group.
 * @param {object} groupData - The data object for this crafter group.
 * @param {string} groupKey - The unique key for this group.
 */
function setupRecipeSelector(groupElement, groupData, groupKey) {
  const recipeDisplay =
      groupElement.querySelector(`#recipe-display-${groupKey}`);

  // Store all necessary data for the modal to use later
  activeRecipeSelectors[groupKey] = {
    selectedRecipeId: groupData.recipeId,
    hexIndices: groupData.hexIndices,
    buildingType: groupData.buildingType,
  };

  if (recipeDisplay) {
    recipeDisplay.addEventListener('click', () => {
      openRecipeModal(groupKey);
    });
  }

  // Set up the alternate recipe selector if it exists
  const altSelectorContainer =
      groupElement.querySelector(`#alternate-selector-${groupKey}`);
  if (altSelectorContainer) {
    const border = altSelectorContainer.querySelector('.border');
    const sprites =
        altSelectorContainer.querySelectorAll('.sprite.recipe-alternate');

    const updateBorderPosition = () => {
      const currentRecipeId = activeRecipeSelectors[groupKey].selectedRecipeId;
      const selectedSprite = altSelectorContainer.querySelector(
          `[data-recipe-id="${currentRecipeId}"]`);
      if (!selectedSprite || !border) return;

      border.style.opacity = 1;
      const allSpritesArray = Array.from(sprites);
      const visualIndex = allSpritesArray.indexOf(selectedSprite);
      if (visualIndex !== -1) {
        border.style.left = `${visualIndex * (spriteWidth + 16) + 15}px`;
      }
    };

    // Attach an instance to the global tracker for the resize handler
    activeRecipeSelectors[groupKey].selectorInstance = {updateBorderPosition};

    // Controller function to change the selected alternate recipe
    const selectAlternate = (recipeId) => {
      // Update data model if changed, then trigger encode
      if (activeRecipeSelectors[groupKey].selectedRecipeId !== recipeId) {
        activeRecipeSelectors[groupKey].selectedRecipeId = recipeId;
        encode();
      }

      // Update view (opacity and border position)
      sprites.forEach(s => s.style.opacity = 0.5);
      const selectedSprite =
          altSelectorContainer.querySelector(`[data-recipe-id="${recipeId}"]`);
      if (selectedSprite) {
        selectedSprite.style.opacity = 1;
      }
      updateBorderPosition();
    };

    sprites.forEach(sprite => {
      sprite.addEventListener('click', (e) => {
        const newRecipeId = parseInt(e.currentTarget.dataset.recipeId, 10);
        selectAlternate(newRecipeId);
      });
    });

    // Set the initial selection highlight
    selectAlternate(groupData.recipeId);
  }
}

/**
 * Opens and populates the recipe selection modal for a specific crafter group.
 * @param {string} groupKey - The unique key for the crafter group.
 */
function openRecipeModal(groupKey) {
  currentModalGroupKey = groupKey;
  const groupData = activeRecipeSelectors[groupKey];
  if (!groupData) return;

  const buildingType = groupData.buildingType;
  const availableRecipes = craftableRecipesByBuildingType[buildingType] || [];

  modalRecipeGrid.innerHTML = '';  // Clear previous grid
  const addedResultItemIds = new Set();

  availableRecipes.forEach(recipe => {
    const resultItemId = recipe.results[0];
    const resultItem = itemsData[resultItemId];

    // Only add one icon per unique result item
    if (resultItem && !addedResultItemIds.has(resultItemId)) {
      addedResultItemIds.add(resultItemId);

      const icon = document.createElement('div');
      icon.className = 'item-icon';
      icon.dataset.resultItemId = resultItemId;
      icon.dataset.icon = `item.${resultItemId}`;
      icon.title = resultItem.name;

      icon.addEventListener('click', (e) => {
        const clickedResultItemId =
            parseInt(e.currentTarget.dataset.resultItemId, 10);
        const {crafterGroups} = lastDecodedState;

        // Find the first available recipe for the selected product
        const alternates = alternateRecipesMap[clickedResultItemId];
        if (!alternates || alternates.length === 0) return;
        const newRecipeId = alternates[0].id;

        // Get the original data for this group of buildings
        const crafterGroupData = crafterGroups[currentModalGroupKey];
        if (!crafterGroupData) return;

        // Update the recipe ID in the data object
        crafterGroupData.recipeId = newRecipeId;

        // Find the old DOM element for this group
        const oldElement =
            document.getElementById(`group-${currentModalGroupKey}`);
        if (oldElement) {
          // Generate a new DOM element with the updated recipe info
          const newElement = generateRecipeSelectorHTML(
              crafterGroupData, currentModalGroupKey);
          // Replace the old element with the new one
          oldElement.replaceWith(newElement);
          // Re-initialize the state and event handlers for the new element
          setupRecipeSelector(
              newElement, crafterGroupData, currentModalGroupKey);
        }

        encode();
        closeRecipeModal();
      });

      modalRecipeGrid.appendChild(icon);
    }
  });

  // Store handler and selected element for the resize listener
  modalSelectionHandler = setupGridSelectionHandler(modalRecipeGrid);
  const currentRecipeId = groupData.selectedRecipeId;
  const currentResultItemId = recipeIdToResultItemIdMap[currentRecipeId];
  modalSelectedElement = modalRecipeGrid.querySelector(
      `[data-result-item-id="${currentResultItemId}"]`);
  modalSelectionHandler.moveTo(modalSelectedElement);

  recipeModal.classList.add('visible');
}

/**
 * Closes the recipe selection modal.
 */
function closeRecipeModal() {
  recipeModal.classList.remove('visible');
  // Clean up after the transition ends
  setTimeout(() => {
    modalRecipeGrid.innerHTML = '';
    currentModalGroupKey = null;

    // Clear the modal handler state
    modalSelectionHandler = null;
    modalSelectedElement = null;
  }, 300);
}

/**
 * A new function, called on window resize, to update all active selection
 * borders.
 */
function updateAllSelectorBorders() {
  // Update building upgrade selectors
  if (lastDecodedState && lastDecodedState.dynamicSelectionGroups) {
    for (const key in lastDecodedState.dynamicSelectionGroups) {
      const group = lastDecodedState.dynamicSelectionGroups[key];
      if (group.selectorInstance &&
          typeof group.selectorInstance.updateBorderPosition === 'function') {
        group.selectorInstance.updateBorderPosition();
      }
    }
  }

  // Update alternate recipe selectors
  if (activeRecipeSelectors) {
    for (const key in activeRecipeSelectors) {
      const group = activeRecipeSelectors[key];
      if (group.selectorInstance &&
          typeof group.selectorInstance.updateBorderPosition === 'function') {
        group.selectorInstance.updateBorderPosition();
      }
    }
  }

  // Update modal selection border if it is visible
  if (recipeModal.classList.contains('visible') && modalSelectionHandler &&
      modalSelectedElement) {
    modalSelectionHandler.moveTo(modalSelectedElement);
  }
}


/**
 * Decodes a byte array segment into a structured object based on the provided
 * table. Assumes Little Endian byte order for multi-byte fields.
 *
 * @param {number[]} segmentBytes An array of numbers (0-255) representing the
 *     bytes of the segment.
 * @returns {object} The decoded object.
 */
function decodeSegment(segmentBytes) {
  if (!segmentBytes) {
    // Handle null or undefined input gracefully, though an empty array is
    // more likely from splitter
    return {error: 'Input segment is null or undefined.'};
  }

  // Convert the array of numbers (bytes) into a Uint8Array, then get its
  // ArrayBuffer
  const uint8Array = new Uint8Array(segmentBytes);
  const buffer = uint8Array.buffer;
  const view = new DataView(buffer);

  const decoded = {};

  // Helper function to check if 'length' bytes can be read from 'offset'
  const canRead = (offset, length) => offset + length <= view.byteLength;

  // Decode fields according to the table:

  // 0-3: int32 Index
  if (canRead(0, 4)) {
    decoded.Index = view.getInt32(0, true);  // true for littleEndian
  } else {
    decoded.Index = undefined;
  }

  // 4-5: uint16 Building ID
  if (canRead(4, 2)) {
    decoded.BuildingID = view.getUint16(4, true);
  } else {
    decoded.BuildingID = undefined;
  }

  // 6-7: uint16 Model Index
  if (canRead(6, 2)) {
    decoded.ModelIndex = view.getUint16(6, true);
  } else {
    decoded.ModelIndex = undefined;
  }

  // 8: byte Unknown
  if (canRead(8, 1)) {
    decoded.UnknownByte =
        view.getUint8(8);  // Endianness doesn't apply to single byte
  } else {
    decoded.UnknownByte = undefined;
  }

  // 9-12: float32 x
  if (canRead(9, 4)) {
    decoded.x = view.getFloat32(9, true);
  } else {
    decoded.x = undefined;
  }

  // 13-16: float32 y
  if (canRead(13, 4)) {
    decoded.y = view.getFloat32(13, true);
  } else {
    decoded.y = undefined;
  }

  // 17-20: float32 z
  if (canRead(17, 4)) {
    decoded.z = view.getFloat32(17, true);
  } else {
    decoded.z = undefined;
  }

  // 21-24: float32 Yaw
  if (canRead(21, 4)) {
    decoded.Yaw = view.getFloat32(21, true);
  } else {
    decoded.Yaw = undefined;
  }

  // 25-28: float32 Tilt
  if (canRead(25, 4)) {
    decoded.Tilt = view.getFloat32(25, true);
  } else {
    decoded.Tilt = undefined;
  }

  // 29-32: int32 Connection Index
  if (canRead(29, 4)) {
    decoded.ConnectionIndex = view.getInt32(29, true);
  } else {
    decoded.ConnectionIndex = undefined;
  }

  // Byte Range 33-36 is skipped in the table.

  // 37-38: uint16 Crafted Item
  // The note "(0xFF Default)" likely means the *value* 0xFFFF (65535) is used
  // if no item is crafted.
  if (canRead(37, 2)) {
    decoded.CraftedItem = view.getUint16(37, true);
  } else {
    decoded.CraftedItem = undefined;
  }

  // Byte Range 39-44 is skipped in the table.

  // 45-48: int32 Custom for each Building (Bitfield)
  if (canRead(45, 4)) {
    decoded.CustomBitfield = view.getInt32(45, true);
  } else {
    // For a bitfield, 0 is often a more sensible default than undefined if
    // the field is missing.
    decoded.CustomBitfield = 0;
  }

  // Add a property for segment length for debugging or validation
  decoded.originalSegmentLength = segmentBytes.length;

  return decoded;
}

function decodeMainHeader(view) {
  const header = {};
  let offset = 0;
  const headerStructSize = (4 * 7) + 1;  // 29 bytes

  if (view.byteLength < headerStructSize) {
    header.error = 'Input byte array too short for main header.';
    return {header: header, bytesRead: 0};
  }

  header.version = view.getUint32(offset, true);
  offset += 4;
  header.cursor_offset_x = view.getUint32(offset, true);
  offset += 4;
  header.cursor_offset_y = view.getUint32(offset, true);
  offset += 4;
  header.cursor_target_area = view.getUint32(offset, true);
  offset += 4;
  header.dragbox_size_x = view.getUint32(offset, true);
  offset += 4;
  header.dragbox_size_y = view.getUint32(offset, true);
  offset += 4;
  header.primary_area_index = view.getUint32(offset, true);
  offset += 4;
  header.area_count = view.getUint8(offset);
  offset += 1;

  return {header: header, bytesRead: offset};
}


/**
 * Decodes a BlueprintArea structure from a DataView starting at the given
 * offset.
 *
 * The BlueprintArea structure consists of:
 * - index (int8)
 * - parent_index (int8)
 * - tropic_anchor (uint16, little-endian)
 * - area_segments (uint16, little-endian)
 * - anchor_local_offset_x (uint16, little-endian)
 * - anchor_local_offset_y (uint16, little-endian)
 * - width (uint16, little-endian)
 * - height (uint16, little-endian)
 *
 * @param {DataView} view - The DataView containing the binary data.
 * @param {number} initialOffset - The offset in the DataView to start reading
 *     from.
 * @returns {{area: Object, bytesRead: number}} An object containing the decoded
 *     area and the number of bytes read.
 */
function decodeBlueprintArea(view, initialOffset) {
  const area = {};
  let offset = initialOffset;
  const areaStructSize =
      (1 * 2) + (2 * 6);  // 2 * int8 (b) + 6 * uint16 (H) = 2 + 12 = 14 bytes

  // Helper to check if enough bytes are available from the current offset in
  // the view
  const canRead = (len) => (offset + len) <= view.byteLength;

  if (!canRead(areaStructSize)) {
    area.error = 'Not enough data to read BlueprintArea.';
    return {area: area, bytesRead: 0};
  }

  // ("b", "index") - int8
  area.index = view.getInt8(offset);
  offset += 1;

  // ("b", "parent_index") - int8
  area.parent_index = view.getInt8(offset);
  offset += 1;

  // ("H", "tropic_anchor") - uint16
  area.tropic_anchor = view.getUint16(offset, true);  // true for littleEndian
  offset += 2;

  // ("H", "area_segments") - uint16
  area.area_segments = view.getUint16(offset, true);
  offset += 2;

  // ("H", "anchor_local_offset_x") - uint16
  area.anchor_local_offset_x = view.getUint16(offset, true);
  offset += 2;

  // ("H", "anchor_local_offset_y") - uint16
  area.anchor_local_offset_y = view.getUint16(offset, true);
  offset += 2;

  // ("H", "width") - uint16
  area.width = view.getUint16(offset, true);
  offset += 2;

  // ("H", "height") - uint16
  area.height = view.getUint16(offset, true);
  offset += 2;

  const bytesRead = offset - initialOffset;
  if (bytesRead !== areaStructSize) {
    console.warn(`BlueprintArea decoding size mismatch. Expected: ${
        areaStructSize}, Read: ${bytesRead}`);
  }

  return {area: area, bytesRead: bytesRead};
}

// Start the application
main();