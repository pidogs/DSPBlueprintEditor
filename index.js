const spriteWidth = 80;
const spriteHeight = 80;
const delimiterArray = [155, 255, 255, 255];  // 0x9bffffff

const optionsGrid = document.querySelector('.options-grid');

const blueprintInput = document.getElementById('blueprintInput');
const pasteButton = document.getElementById('pasteButton');
const decodeButton = document.getElementById('decodeButton');
const blueprintOutput = document.getElementById('blueprintOutput');
const copyButton = document.getElementById('copyButton');
const errorMessageDiv = document.getElementById('error-message');

pasteButton.addEventListener('click', getClip);
decodeButton.addEventListener('click', Decode);
copyButton.addEventListener('click', Copy);

/**
 * Displays an error message to the user and highlights the blueprint input field.
 *
 * @param {string} message - The error message to display.
 */
function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';
  blueprintInput.style.borderColor = 'var(--error-border-color)';  // Visual cue
}

/**
 * Hides the error message and resets the input border color to its default value.
 * Clears the error message text, hides the error message element,
 * and restores the blueprint input's border color.
 */
function hideError() {
  errorMessageDiv.textContent = '';
  errorMessageDiv.style.display = 'none';
  blueprintInput.style.borderColor = 'var(--input-border-color)';  // Reset
}

const itemsJsonPath = './items-en-US.json';
let itemsData;
try {
  const response = await fetch(itemsJsonPath);

  if (!response.ok) {
    throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`);
  }
  itemsData = await response.json();
} catch (error) {
  console.error('Could not load items data:', error);
}



/**
 * Determines if the given current version is newer than or equal to the reference version.
 *
 * Versions are compared numerically by splitting on '.' and comparing each part in order.
 * If a part is missing, it is treated as 0.
 *
 * @param {string} currentVersion - The version string to compare (e.g., "0.10.31.22242").
 * @param {string} [referenceVersion='0.10.30.22241'] - The reference version string to compare against.
 * @returns {boolean} Returns true if currentVersion is newer than or equal to referenceVersion, false otherwise.
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
 * Sets up a sprite container with selection, click handling, and visual feedback.
 * Allows selecting sprites, disabling/enabling clicks, and updating selection display.
 *
 * @param {HTMLElement} containerElement - The DOM element containing the sprite group.
 * @param {string[]} groupItemIds - Array of item IDs corresponding to each sprite in the group.
 * @param {string|number} groupUniqueId - Unique identifier for the group, used for DOM element IDs.
 * @param {string} genericGroupTitle - Title or type of the group, used for global update logic.
 * @returns {{
 *   deselectAll: function(): void,
 *   selectSprite: function(string|number): void,
 *   enableClicks: function(): void,
 *   disableClicks: function(): void,
 *   getSelectedIndex: function(): number
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

  function updateSpritePosition(sprite) {
    const x = parseInt(sprite.dataset.x);
    const y = parseInt(sprite.dataset.y);
    sprite.style.backgroundPosition =
        `-${x * spriteWidth}px -${y * spriteHeight}px`;
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
    if (border) {
      border.style.opacity = 1;
    }
    if (selectedSprite) {
      selectedSprite.style.opacity = 0.5;
    }
    newSelectedSprite.style.opacity = 1;
    selectedSprite = newSelectedSprite;
    selectedIndex = parseInt(numericalIdSuffix);
    let spriteDOMElements = Array.from(sprites);
    let visualIndex = spriteDOMElements.indexOf(newSelectedSprite);
    if (visualIndex !== -1 && border) {
      border.style.left = `${visualIndex * (spriteWidth + 16) + 15}px`;
    }
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

  function deselectAll() {
    disableSpriteClicks();
    if (border) {
      border.style.opacity = 0;
    }
    sprites.forEach(sprite => {
      sprite.style.opacity = 0.5;
    });
    if (selectedSpan) {
      selectedSpan.textContent = 'None';
    }
    selectedSprite = null;
    selectedIndex = -1;
  }


  sprites.forEach((sprite) => {
    updateSpritePosition(sprite);
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
    enableClicks:
        enableSpriteClicks,  // Exposing for programmatic re-enabling if needed
    disableClicks:
        disableSpriteClicks,  // Exposing for programmatic disabling if needed
    getSelectedIndex: getSelectedIndex

  };
}

/**
 * Generates an HTML element representing a group of sprite selectors.
 *
 * @param {string} groupTitle - The title of the sprite selector group.
 * @param {Array<string>} itemIds - Array of item IDs to display as sprites.
 * @param {Array<Object>} spriteCoordinates - Array of coordinate objects for each sprite.
 *        Each object should have `dataX` and `dataY` properties.
 * @param {string|number} groupUniqueId - Unique identifier for the group, used for element IDs.
 * @returns {HTMLElement} The root HTML element of the sprite selector group.
 */
function generateSpriteSelectorGroupHTML(
    groupTitle, itemIds, spriteCoordinates, groupUniqueId) {
  let spritesHtml = '';
  // The loop now uses both the item ID and its index to get the corresponding
  // sprite data
  itemIds.forEach((itemId, index) => {
    const itemName =
        itemsData[itemId] ? itemsData[itemId].name : 'Unknown Item';
    const spriteId = `sprite-${groupUniqueId}-${index + 1}`;

    // Get the specific coordinates for this sprite from the passed array
    const coords = spriteCoordinates[index];
    if (!coords) {
      console.warn(`Missing sprite coordinate for item at index ${
          index} in group ${groupTitle}`);
      return;  // Skip this sprite if coordinates are missing
    }

    spritesHtml += `
      <div
        class="sprite"
        id="${spriteId}"
        data-x="${coords.dataX}"
        data-y="${coords.dataY}"
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
 * Converts C# ticks (100-nanosecond intervals since 0001-01-01) to milliseconds since the Unix epoch (1970-01-01).
 *
 * @param {number} ticks - The number of C# ticks to convert.
 * @returns {number} The corresponding time in milliseconds since the Unix epoch.
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
 * Asynchronously reads text from the user's clipboard and sets it as the value of the
 * input element with the ID 'blueprintInput'. If successful, attempts to call the global
 * Decode function. Handles errors and missing elements gracefully.
 *
 * @async
 * @function getClip
 * @returns {Promise<void>} Resolves when clipboard text is read and processed, or rejects on error.
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

let tempCompare = '';
let base64data = '';
let lastDecodedState = {};

/**
 * Decodes a blueprint input string, validates its hash, decompresses and parses the data,
 * and dynamically generates sprite selector groups for upgradeable buildings.
 * 
 * The function performs the following steps:
 * 1. Clears the options grid and hides any previous errors.
 * 2. Retrieves and validates the blueprint input string.
 * 3. Extracts and verifies the hash from the input using MD5.
 * 4. Decodes and decompresses the blueprint data from base64 and gzip formats.
 * 5. Parses the decompressed data to identify upgradeable buildings.
 * 6. Dynamically generates sprite selector groups for each building with upgrade paths.
 * 7. Updates the UI with the generated groups and sets the selected sprite.
 * 8. Stores the decoded state and triggers encoding.
 * 
 * @throws {Error} If the blueprint input is empty, the hash does not match, or decoding fails.
 */
function Decode() {
  var predata;
  if (optionsGrid) {
    optionsGrid.innerHTML = '';
  }
  hideError();
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
    for (const i in hexsplit) {
      if (i == 0) {
        continue
      }

      const buildingIdHexLECorrected =
          hexsplit[i].slice(10, 12) + hexsplit[i].slice(8, 10);
      let buildingId = parseInt(buildingIdHexLECorrected, 16)

      if (!upgradePaths[buildingId]) {
        continue
      }

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
          continue;
        }

        // Get the specific sprite coordinates from spriteLayoutData using the
        // found index.
        const spriteCoordinates = spriteLayoutData[groupIndex];


        const groupUniqueId = `building-${buildingId}`;

        const groupElement = generateSpriteSelectorGroupHTML(
            groupTitle, itemIdsForGroup, spriteCoordinates, groupUniqueId);
        if (optionsGrid) optionsGrid.appendChild(groupElement);

        const spriteContainerInDom =
            document.getElementById(`sprite-container-${groupUniqueId}`);
        if (!spriteContainerInDom) {
          console.error(`Failed to find sprite container sprite-container-${
              groupUniqueId} in DOM`);
          continue;
        }

        const selectorInstance = setupSpriteContainer(
            spriteContainerInDom, itemIdsForGroup, groupUniqueId,
            groupDefinition.title);

        dynamicSelectionGroups[groupKey] = {
          selectorInstance,
          hexIndices: [],
          itemIds: itemIdsForGroup
        };
      }

      dynamicSelectionGroups[groupKey].hexIndices.push(i);

      const upgradeOptions = dynamicSelectionGroups[groupKey].itemIds;
      const spriteIndexToSelect = upgradeOptions.indexOf(buildingId);

      if (spriteIndexToSelect !== -1) {
        dynamicSelectionGroups[groupKey].selectorInstance.selectSprite(
            spriteIndexToSelect + 1);
      }
    }
    lastDecodedState = {predata, hexsplit, dynamicSelectionGroups};
    encode();
  } catch (e) {
    console.error('Error during Decode:', e.message);
    showError(`Decoding error: ${e.message || e}`);
    blueprintInput.style.borderColor = 'var(--error-border-color)';
  }
}
window.Decode = Decode

/**
 * Encodes the current blueprint state by updating hex segments based on user selections,
 * compresses the result using gzip, and generates a final blueprint string with a hash.
 * The output is set to the 'blueprintOutput' textarea element.
 *
 * Preconditions:
 * - Requires a successful decode to populate `lastDecodedState`.
 * - Depends on global objects: `itemsData`, `crypt`, `md5`, `stringToBytes`, and `pako`.
 *
 * Error Handling:
 * - Displays warnings and errors if required selections or item data are missing.
 *
 * Side Effects:
 * - Updates the value of the 'blueprintOutput' element in the DOM.
 *
 * @returns {void}
 */
function encode() {
  const {predata, hexsplit, dynamicSelectionGroups} = lastDecodedState;

  if (!predata || !hexsplit || !dynamicSelectionGroups) {
    console.warn('encode called before successful decode. Aborting.');
    return;
  }

  hideError();

  let tempHexSegments = [...hexsplit];
  for (const groupKey in dynamicSelectionGroups) {
    const group = dynamicSelectionGroups[groupKey];
    const selectedSpriteOneBasedIndex =
        group.selectorInstance.getSelectedIndex();

    if (selectedSpriteOneBasedIndex <= 0) {
      const groupTitle =
          itemsData[groupKey]?.name || `Building ID: ${groupKey}`;
      console.warn(`No selection for group ${groupTitle}. Skipping.`);
      showError(`Error: No selection made for ${groupTitle}.`);
      continue;
    }

    const selectedItemActualIndex = selectedSpriteOneBasedIndex - 1;
    const buildingNumToEncode = group.itemIds[selectedItemActualIndex];

    if (itemsData[buildingNumToEncode] === undefined) {
      console.warn(
          `Item data for ID ${buildingNumToEncode} (group for original ID ${
              groupKey}) not found. Skipping.`);
      showError(`Error: Data for item ID ${buildingNumToEncode} is missing.`);
      continue;
    }
    const modelNumToEncode = itemsData[buildingNumToEncode].modelIndex;

    for (const hexSplitIndex of group.hexIndices) {
      let segmentHex = tempHexSegments[hexSplitIndex];

      let buildingHexLE =
          (buildingNumToEncode & 0xFF).toString(16).padStart(2, '0') +
          ((buildingNumToEncode >> 8) & 0xFF).toString(16).padStart(2, '0');
      segmentHex =
          segmentHex.slice(0, 8) + buildingHexLE + segmentHex.slice(12);

      let modelHexLE = (modelNumToEncode & 0xFF).toString(16).padStart(2, '0') +
          ((modelNumToEncode >> 8) & 0xFF).toString(16).padStart(2, '0');
      segmentHex = segmentHex.slice(0, 12) + modelHexLE + segmentHex.slice(16);

      tempHexSegments[hexSplitIndex] = segmentHex;
    }
  }

  const finalHexString = tempHexSegments.join('9bffffff');

  const byteArrayForGzip = hexStringToArray(finalHexString);

  const pakoOptions = {
    level: 6,
    header: {
      mtime: 0,  // Set Modification Time to 0 to match original header
      os: 11     // Set OS to 11 (0x0B) for Windows/NTFS to match original
    }
  };

  // Use pako.gzip to compress the data
  let zippedData = pako.gzip(byteArrayForGzip, pakoOptions);
  // --- END OF CRITICAL CHANGE ---

  // NOTE: crypt.bytesToBase64 must be defined elsewhere in your project
  // This assumes it correctly converts a Uint8Array to a Base64 string.
  let encodedBlueprintPart = predata + '"' + crypt.bytesToBase64(zippedData);

  // NOTE: md5 and stringToBytes must be defined elsewhere in your project
  let newHash = md5(new stringToBytes(encodedBlueprintPart), true, true);
  let finalBlueprintString = encodedBlueprintPart + '"' + newHash.toUpperCase();

  document.getElementById('blueprintOutput').value = finalBlueprintString;
}
// Make sure this is globally available for your HTML button
window.encode = encode;

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
 * Updates all dynamic selection groups of a specific type by selecting a new item in their UI selectors.
 *
 * Iterates through all groups in `lastDecodedState.dynamicSelectionGroups`, finds those whose generic title matches
 * the provided `genericTitle`, and updates their selector to select the item with `newItemId`. After updating,
 * it calls the `encode` function to persist the changes.
 *
 * @param {string} genericTitle - The generic title of the group type to update.
 * @param {string|number} newItemId - The ID of the new item to select in each matching group.
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
 * Each byte in the input array is converted to a two-character hexadecimal string.
 * If the input is null or undefined, an empty string is returned and an error is logged.
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
 * If an invalid hex byte is encountered, the function logs an error and returns -1.
 *
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {Uint8Array|number} A Uint8Array representing the bytes of the hex string,
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
 * Decodes a BlueprintArea structure from a DataView starting at the given offset.
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
 * @param {number} initialOffset - The offset in the DataView to start reading from.
 * @returns {{area: Object, bytesRead: number}} An object containing the decoded area and the number of bytes read.
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