const spriteWidth = 80;
const spriteHeight = 80;
const delimiterArray = [155, 255, 255, 255];  // 0x9bffffff

// let OGString;
// let decodedData;
// let predata = '';
const optionsGrid = document.querySelector('.options-grid');
// let dynamicSelectionGroups = {};

const blueprintInput = document.getElementById('blueprintInput');
const pasteButton = document.getElementById('pasteButton');
const decodeButton = document.getElementById('decodeButton');
const blueprintOutput = document.getElementById('blueprintOutput');
const copyButton = document.getElementById('copyButton');
const errorMessageDiv = document.getElementById('error-message');

pasteButton.addEventListener(
    'click', getClip);  // Assuming getClip is global or imported
decodeButton.addEventListener(
    'click', Decode);  // Assuming Decode is global or imported
copyButton.addEventListener(
    'click', Copy);  // Assuming Copy is global or imported

function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';
  blueprintInput.style.borderColor = 'var(--error-border-color)';  // Visual cue
}

function hideError() {
  errorMessageDiv.textContent = '';
  errorMessageDiv.style.display = 'none';
  blueprintInput.style.borderColor = 'var(--input-border-color)';  // Reset
}

const itemsJsonPath = './items-en-US.json';
let itemsData;
try {
  // 1. Make the web request using fetch
  const response = await fetch(itemsJsonPath);

  // 2. Check if the request was successful (status code 200-299)
  if (!response.ok) {
    // If not successful, throw an error with the status
    throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`);
  }
  itemsData = await response.json();
} catch (error) {
  // Handle any errors that occurred during fetch or JSON parsing
  console.error('Could not load items data:', error);
}



function isNewerVersion(currentVersion, referenceVersion = '0.10.30.22241') {
  const currentParts = currentVersion.split('.').map(Number);
  const referenceParts = referenceVersion.split('.').map(Number);
  const maxLength = Math.max(currentParts.length, referenceParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const referencePart = referenceParts[i] || 0;

    if (currentPart > referencePart) {
      return true;  // Current version is newer
    }
    if (currentPart < referencePart) {
      return false;  // Current version is older
    }
    // If parts are equal, continue to the next part
  }

  return true;  // Versions are equal (so not newer)
}

function setupSpriteContainer(containerElement, groupItemIds, groupUniqueId) {
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
      sprite.style.pointerEvents = 'none';  // Prevent clicks
      sprite.style.cursor = 'default';      // Change cursor
      sprite.style.opacity = 0.5;           // Ensure all are dimmed
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
      sprite.style.pointerEvents = 'auto';  // Re-enable clicks
      sprite.style.cursor = 'pointer';      // Restore pointer cursor
    });
    // The selectSprite function will handle showing the border and correct
    // opacity
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
      // This case should ideally not happen if itemsData and groupItemIds are
      // correct
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
    updateSpritePosition(sprite);
    sprite.addEventListener('click', () => {
      const numericalSuffix = sprite.id.split('-').pop();
      selectSprite(numericalSuffix);
      if (typeof encode === 'function') encode();
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

// Set up each container
// let c1 = setupSpriteContainer('c1');
// let c2 = setupSpriteContainer('c2');
// let c3 = setupSpriteContainer('c3');
// let c4 = setupSpriteContainer('c4');
// const selectionArr = [c1, c2, c3, c4];

// c1.deselectAll();
// c2.selectSprite('2')


function generateSpriteSelectorGroupHTML(
    groupTitle, itemIds, baseX, spriteY, groupUniqueId) {
  let spritesHtml = '';
  itemIds.forEach((itemId, index) => {
    const itemName =
        itemsData[itemId] ? itemsData[itemId].name : 'Unknown Item';
    const spriteId = `sprite-${groupUniqueId}-${
        index + 1}`;  // e.g., sprite-conveyor-belts-1
    spritesHtml += `
      <div
        class="sprite"
        id="${spriteId}"
        data-x="${baseX + index}"
        data-y="${spriteY}"
        title="${itemName}"
      ></div>`;
  });

  const groupHtml = `
    <div class="sprite-selector-group" id="group-${groupUniqueId}">
      <p>${groupTitle}:</p>
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
    // Optionally, inform the user that paste failed
    // e.g., showError("Failed to paste from clipboard. Please check
    // permissions.");
  }
}

window.getClip = getClip;

async function Copy() {
  const text = document.getElementById('blueprintOutput').value;
  navigator.clipboard.writeText(text);
}
window.Copy = Copy;

let tempCompare = "";

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
    console.log("hashed_data",hashed_data)
    let encodedData = bp_string.split('"')[1];
    console.log("encodedData",encodedData)
    // console.log(bp_string)
    predata = bp_string.substring(0, bp_string.indexOf('"'));
    let givenHash = bp_string.substring(bp_string.lastIndexOf('"') + 1);
    let md5Hash = md5(new stringToBytes(hashed_data), true, true);
    // console.log(hashed_data)
    console.log('GivenHash  : ' + givenHash.toLowerCase())
    console.log('InputHashed: ' + md5Hash.toLowerCase())
    if (md5Hash.trim().toLowerCase() !== givenHash.trim().toLowerCase()) {
      const error = new Error(`Invalid input:.\n Calculated hash:${
          md5Hash.toLowerCase()},\nExpected hash:${givenHash.toLowerCase()}`);
      error.name = 'HashMismatchError';
      throw error;
    }
    // document.getElementById('output').innerHTML = md5Hash;
    //     bp_string.split(',')[11].split('"')[2].toLowerCase();
    let decodedData = gzip.unzip(crypt.base64ToBytes(encodedData));

    let hexList = byteArrayToHexString(decodedData)
    tempCompare = hexList
    // console.log(hexList)
    // console.log(hexList.split('9bffffff'))
    let hexsplit = hexList.split('9bffffff')
    // window.decodedData = hexsplit
    let dynamicSelectionGroups = {};
    for (const i in hexsplit) {
      if (i == 0) {
        continue
      }
      // console.log(i)
      const buildingIdHexLECorrected =
          hexsplit[i].slice(10, 12) + hexsplit[i].slice(8, 10);
      let buildingId = parseInt(buildingIdHexLECorrected, 16)

      if (!upgradePaths[buildingId]) {
        continue
      }
      const groupDefinition = upgradePaths[buildingId];
      // console.log(groupDefinition)
      const groupTitle = groupDefinition.title;
      const itemIdsForGroup = groupDefinition.upgrades;
      //===========================
      if (!dynamicSelectionGroups[groupTitle]) {
        const spriteConfig = groupSpriteDetails[groupTitle];
        if (!spriteConfig) {
          console.warn(`Missing spriteConfig for group: ${groupTitle}`);
          continue;
        }
        const groupUniqueId =
            groupTitle.replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase();

        const groupElement = generateSpriteSelectorGroupHTML(
            groupTitle, itemIdsForGroup, spriteConfig.baseX, spriteConfig.y,
            groupUniqueId);
        if (optionsGrid) optionsGrid.appendChild(groupElement);

        const spriteContainerInDom =
            document.getElementById(`sprite-container-${groupUniqueId}`);
        if (!spriteContainerInDom) {
          console.error(`Failed to find sprite container sprite-container-${
              groupUniqueId} in DOM`);
          continue;
        }
        const selectorInstance = setupSpriteContainer(
            spriteContainerInDom, itemIdsForGroup, groupUniqueId);

        dynamicSelectionGroups[groupTitle] = {
          selectorInstance,
          hexIndices: [],
          itemIds: itemIdsForGroup
        };
      }

      dynamicSelectionGroups[groupTitle].hexIndices.push(i);

      const spriteIndexToSelect = itemIdsForGroup.indexOf(buildingId);

      if (spriteIndexToSelect !== -1) {
        // selectSprite expects 1-based index
        dynamicSelectionGroups[groupTitle].selectorInstance.selectSprite(
            spriteIndexToSelect + 1);
      }
    }
    encode(predata,hexsplit,dynamicSelectionGroups);
  } catch (e) {
    console.error('Error during Decode:', e);
    showError(`Decoding error: ${e.message || e}`);
    blueprintInput.style.borderColor = 'var(--error-border-color)';
  }
}
window.Decode = Decode

function encode(predata,hexsplit,dynamicSelectionGroups) {
  hideError();
  if (Object.keys(dynamicSelectionGroups).length === 0) {
    return
  }
  console.log(dynamicSelectionGroups)
  // let tempHexSegments = [...window.decodedData];
  let tempHexSegments = [...hexsplit];
  for (const groupTitle in dynamicSelectionGroups) {
    const group = dynamicSelectionGroups[groupTitle];
    const selectedSpriteOneBasedIndex =
        group.selectorInstance.getSelectedIndex();
    const selectedItemActualIndex =
        selectedSpriteOneBasedIndex - 1;  // Convert to 0-based
    const buildingNumToEncode = group.itemIds[selectedItemActualIndex];


    if (itemsData[buildingNumToEncode] === undefined) {
      console.warn(`Item data for ID ${buildingNumToEncode} (group ${
          groupTitle}) not found. Skipping.`);
      showError(`Error: Data for item ID ${buildingNumToEncode} is missing.`);
      continue;
    }
    const modelNumToEncode = itemsData[buildingNumToEncode].modelIndex
    for (const hexSplitIndex of group.hexIndices) {
      // console.log("index: "+hexSplitIndex)
      let segmentHex = tempHexSegments[hexSplitIndex];
      // console.log(segmentHex)

      let buildingHexLE =
          (buildingNumToEncode & 0xFF).toString(16).padStart(2, '0') +
          ((buildingNumToEncode >> 8) & 0xFF).toString(16).padStart(2, '0');
      segmentHex =
          segmentHex.slice(0, 8) + buildingHexLE + segmentHex.slice(12);

      let modelHexLE = (modelNumToEncode & 0xFF).toString(16).padStart(2, '0') +
          ((modelNumToEncode >> 8) & 0xFF).toString(16).padStart(2, '0');
      segmentHex = segmentHex.slice(0, 12) + modelHexLE + segmentHex.slice(16);
      // console.log(segmentHex)
      tempHexSegments[hexSplitIndex] = segmentHex;
    }
  }

  const finalHexString = tempHexSegments.join('9bffffff');
  // console.log(finalHexString)
  console.log(findStringDifferences(tempCompare,finalHexString))
  
  const byteArrayForGzip = hexStringToArray(finalHexString);
  let gzipOptions = {
    timestamp: new Date(0),
    level: 6
  };

  let zippedData = gzip.zip(byteArrayForGzip, gzipOptions);
  zippedData[9] = 11;  // set os to ntfs so I can just import the files insted
                       // of supplying them my self
  let encodedBlueprintPart = predata + '"' + crypt.bytesToBase64(zippedData);
  console.log("encodedBlueprintPart",encodedBlueprintPart)
  let newHash = md5(new stringToBytes(encodedBlueprintPart), true, true);
  let finalBlueprintString = encodedBlueprintPart + '"' + newHash.toUpperCase();
  document.getElementById('blueprintOutput').value = finalBlueprintString;



  //============================
  // let hexString = ''
  // let options = {
  //   timestamp: new Date(0),
  // };
  // let tempData = decodedData
  // for (const type in buildingindexes) {
  //   for (const index in buildingindexes[type]) {
  //     // get the hex string associated wiht a type of building for change
  //     let data = decodedData[buildingindexes[type][index]];
  //     let buildingNum =
  //         buildingsWanted[type][selectionArr[type].getSelectedIndex() - 1];
  //     // Extract the least significant byte
  //     let hex = '';
  //     // const byte = buildingNum & 0xFF;
  //     // hex += byte.toString(16).padStart(2, '0');
  //     hex += (buildingNum & 0xFF).toString(16).padStart(2, '0');
  //     let tmp = buildingNum >> 8
  //     hex += (tmp & 0xFF).toString(16).padStart(2, '0');
  //     console.log(data)
  //     data = data.slice(0, 8) + hex + data.slice(12)
  //     hex = '';
  //     // Convert byte to a 2-character hex string, padding with '0' if needed
  //     // if ("d2" == data.slice(8, 10)) {
  //     // let model = 52
  //     let model = itemsData[buildingNum].modelIndex
  //     hex += (model & 0xFF).toString(16).padStart(2, '0');
  //     model = model >> 8
  //     hex += (model & 0xFF).toString(16).padStart(2, '0');
  //     data = data.slice(0, 12) + hex + data.slice(16);
  //     console.log(data)
  //     tempData[buildingindexes[type][index]] = data
  //     tempData[buildingindexes[type][index]] = data
  //   }
  // }
  // hexString = tempData.join(`9bffffff`)
  // // console.log(hexString)
  // let intArray = hexStringToArray(hexString)

  // let partA = gzip.zip(intArray, options);
  // partA[9] = 11;  // set os to ntfs so I can just import the files insted of
  //                 // supplying them my self
  // let encoded = predata + '"' + crypt.bytesToBase64(partA);
  // // console.log(encoded);
  // let newHash = md5(encoded, true, true);
  // let finalstring = encoded + '"' + newHash.toUpperCase();
  // console.log(finalstring);
  // document.getElementById('blueprintOutput').value = finalstring;
  // // navigator.clipboard.writeText(finalstring);
}
window.encode = encode

function findStringDifferences(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  const differences = [];

  for (let i = 0; i < maxLength; i++) {
    if (str1[i] !== str2[i]) {
      differences.push(`Index ${i}: '${str1[i] || ' '} vs '${str2[i] || ' '}'`);
    }
  }
  if(differences.length == 0){
    return -1
  }
  return differences;
}


function byteArrayToHexString(byteArray) {
  if (!byteArray || !Array.isArray(byteArray)) {
    console.error('Input is not a valid array.');
    return '';
  }
  return byteArray
      .map(byte => {
        // Ensure the byte is within the 0-255 range and get its hex
        // representation
        const hex = (byte & 0xFF).toString(16);
        // Pad with a leading zero if the hex representation is a single digit
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('');
}

function hexStringToArray(hexString) {
  const int8Array = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byteHex = hexString.substring(i, i + 2);

    // 3. Parse the two-character hex string to an unsigned byte value (0-255)
    const unsignedByteValue = parseInt(byteHex, 16);

    if (isNaN(unsignedByteValue)) {
      console.error(
          `Invalid hex byte "${byteHex}" at position ${i}. Skipping.`);
      return -1;
    }
    int8Array.push(unsignedByteValue);
  }

  return int8Array;
}



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
      match = false;  // Not enough bytes left for a full delimiter
    }

    if (match) {
      result.push(currentSegment);  // Add the segment before the delimiter
      currentSegment = [];          // Start a new segment
      i += delimiterArray.length;   // Move past the delimiter
    } else {
      currentSegment.push(byteArray[i]);  // Add current byte to segment
      i++;                                // Move to the next byte
    }
  }

  // Add the last segment (whatever is left after the last delimiter or if no
  // delimiter was found)
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
  const decodedBlueprint = {
    header: null,
    areas: [],
    buildingHeader: null,  // To store the decoded building header
    segments: []
  };

  // 1. Decode Main Header
  // (Assuming decodeMainHeader is defined elsewhere and returns {header,
  // bytesRead})
  /*
  // Example structure of decodeMainHeader if you were to inline it or call
  it: function decodeMainHeader(view) { const header = {}; let offset = 0;
      const headerStructSize = 29;
      if (view.byteLength < headerStructSize) {
          header.error = "Input byte array too short for main header.";
          return { header: header, bytesRead: 0 };
      }
      header.version = view.getUint32(offset, true); offset += 4;
      // ... other main header fields ...
      header.area_count = view.getUint8(offset); offset += 1;
      return { header: header, bytesRead: offset };
  }
  */
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

  // 2. Decode Blueprint Areas
  // (Assuming decodeBlueprintArea is defined elsewhere and returns {area,
  // bytesRead})
  /*
  // Example structure of decodeBlueprintArea if you were to inline it or call
  it: function decodeBlueprintArea(view, initialOffset) { const area = {}; let
  offset = initialOffset; const areaStructSize = 14; if ((offset +
  areaStructSize) > view.byteLength) { area.error = "Not enough data to read
  BlueprintArea."; return { area: area, bytesRead: 0 };
      }
      // ... area fields decoding ...
      return { area: area, bytesRead: areaStructSize };
  }
  */
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

  // 3. Decode Building Header
  const buildingHeaderData = {};
  if (currentOffset + 4 <= view.byteLength) {
    // ("L", "building_count") - uint32
    buildingHeaderData.building_count =
        view.getUint32(currentOffset, true);  // true for littleEndian
    currentOffset += 4;
    decodedBlueprint.buildingHeader = buildingHeaderData;
  } else {
    console.error('Not enough data to read Building Header.');
    buildingHeaderData.error = 'Not enough data for Building Header.';
    decodedBlueprint.buildingHeader = buildingHeaderData;
    // Depending on strictness, you might want to return an error for the
    // whole blueprint here For now, we'll record the error and try to process
    // segments with what's left (if anything)
  }
  console.log(byteArrayToHexString(fullByteArray.slice(currentOffset)))

  // 4. Get the remaining bytes for the segments
  // Ensure currentOffset does not exceed total length before slicing
  const bytesForSegments = (currentOffset <= fullByteArray.length) ?
      fullByteArray.slice(currentOffset) :
      [];


  // 5. Split and Decode Segments
  // (Assuming splitByteArrayByDelimiter and decodeSegment are defined
  // elsewhere)
  const delimiter = [155, 255, 255, 255];  // 0x9bffffff
  let listOfByteSegments = splitByteArrayByDelimiter(
      bytesForSegments, delimiter);  // Assumed to be available
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



import * as gzip from 'https://cdn.skypack.dev/gzip-js';
// import * as gzip from './gzip-js.in.js';
