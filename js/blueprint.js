/**
 * @fileoverview Core logic for decoding and encoding DSP blueprint strings.
 */

import * as data from './data.js';
import * as md5d from './md5d.js';

// pako and crypt are global variables from the imported scripts in index.html
// md5 is also global.

// The hexadecimal representation of the delimiter used to split blueprint
// building data.
const delimiterHex = '9bffffff';

// --- UTILITY FUNCTIONS ---


/**
 * Converts a string to an array of byte values.
 * This is a simple charCodeAt implementation, matching the original's behavior.
 * @param {string} str The string to convert.
 * @returns {number[]} An array of byte values.
 */
function _stringToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xFF);
  }
  return bytes;
}

/**
 * Converts a hexadecimal string into a Uint8Array.
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {Uint8Array} A Uint8Array representing the bytes.
 */
function _hexStringToArray(hexString) {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
}

/**
 * Converts a byte array to its hexadecimal string representation.
 * @param {Uint8Array|number[]} byteArray - The array of bytes to convert.
 * @returns {string} The hexadecimal string representation.
 */
function _byteArrayToHexString(byteArray) {
  return Array.from(byteArray)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
}

/**
 * Encodes a number into a 4-character little-endian hex string.
 * @param {number} num - The number to encode.
 * @returns {string} The little-endian hex string.
 */
function _encodeLittleEndianHex(num) {
  return (num & 0xFF).toString(16).padStart(2, '0') +
      ((num >> 8) & 0xFF).toString(16).padStart(2, '0');
}

/**
 * Decodes a 4-character little-endian hex string into a number.
 * @param {string} encodedString - The hex string.
 * @returns {number} The decoded number.
 */
function _decodeLittleEndianHex(encodedString) {
  const lowByte = parseInt(encodedString.slice(0, 2), 16);
  const highByte = parseInt(encodedString.slice(2, 4), 16);
  return (highByte << 8) | lowByte;
}


// --- DECODING LOGIC ---

function _isNewerVersion(currentVersion, referenceVersion = '0.10.31.24697') {
  const currentParts = currentVersion.split('.').map(Number);
  const referenceParts = referenceVersion.split('.').map(Number);
  const maxLength = Math.max(currentParts.length, referenceParts.length);

  for (let i = 0; i < maxLength; i++) {
    console.log("_isNewerVersion",i,currentParts[i],referenceParts[i])
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

  return true;  // Versions are equal
}

/**
 * Validates the blueprint hash, decodes from base64, and decompresses the data.
 * @param {string} bp_string - The full blueprint string.
 * @returns {{predata: string, decompressedBytes: Uint8Array}}
 * @throws {Error} If hash is invalid or input is malformed.
 */
function _validateAndDecompress(bp_string) {
  const inputIndex = bp_string.lastIndexOf('"');
  if (inputIndex === -1 || inputIndex === bp_string.length - 1) {
    throw new Error('Invalid blueprint format: Missing quotes or hash.');
  }

  const hashed_data = bp_string.substring(0, inputIndex);
  const givenHash = bp_string.substring(inputIndex + 1);
  const encodedData = bp_string.split('"')[1];

  // The custom md5 function uses a specific (and non-standard) string-to-byte
  // conversion.
  const md5Hash = md5d.md5(_stringToBytes(hashed_data), true, true);
  console.log(md5Hash.trim().toLowerCase(), givenHash.trim().toLowerCase())
  if (md5Hash.trim().toLowerCase() !== givenHash.trim().toLowerCase()) {
    throw new Error(
        `Invalid hash. The blueprint may be corrupted or modified.`);
  }

  const base64bytes = md5d.crypt.base64ToBytes(encodedData);
  const decompressedBytes = pako.ungzip(base64bytes);
  const predata = bp_string.substring(0, bp_string.indexOf('"'));

  return {predata, decompressedBytes};
}

/**
 * Analyzes the decompressed byte array to extract building data.
 * @param {Uint8Array} decompressedBytes - The raw decompressed blueprint data.
 * @returns {{hexsplit: string[], buildings: object[]}}
 */
function _analyzeSegments(decompressedBytes) {
  const hexList = _byteArrayToHexString(decompressedBytes);
  const hexsplit = hexList.split(delimiterHex);

  // The first element is header info, actual buildings start from index 1.
  const buildings =
      hexsplit.slice(1)
          .map((segment, index) => {
            // Not enough data for a building, skip.
            if (segment.length < 82) return null;

            return {
              hexSegmentIndex:
                  index + 1,  // 1-based index to map back to hexsplit
              buildingId: _decodeLittleEndianHex(segment.slice(8, 12)),
              recipeId: _decodeLittleEndianHex(segment.slice(78, 82)),
            };
          })
          .filter(b => b !== null);  // Filter out any malformed segments

  return {hexsplit, buildings};
}

/**
 * Decodes a full blueprint string into a structured object.
 * @param {string} bp_string - The blueprint string from the game.
 * @returns {object} An object containing the decoded data.
 */
export function decode(bp_string) {
  const {predata, decompressedBytes} = _validateAndDecompress(bp_string);
  const validVersion = _isNewerVersion(predata.split(",")[9])
  if (!validVersion){
    throw new Error('Blueprint is too old.\nDSP change the blueprint format in version 0.10.31.24697.\nTo fix please paste it down in game and make a new blueprint to upgrade to the latest version.');
  }
  const {hexsplit, buildings} = _analyzeSegments(decompressedBytes);

  return {predata, hexsplit, buildings};
}


// --- ENCODING LOGIC ---

/**
 * Compresses, encodes, and signs the final blueprint data.
 * @param {string} finalHexString - The complete hex string of the modified
 *     blueprint.
 * @param {string} predata - The header part of the original blueprint string.
 * @returns {string} The final, complete blueprint string.
 */
function _compressAndFinalize(finalHexString, predata) {
  const byteArrayForGzip = _hexStringToArray(finalHexString);
  const pakoOptions = {level: 6, header: {mtime: 0, os: 11}};
  const zippedData = pako.gzip(byteArrayForGzip, pakoOptions);

  const encodedBlueprintPart =
      predata + '"' + md5d.crypt.bytesToBase64(zippedData);
  const newHash = md5d.md5(_stringToBytes(encodedBlueprintPart), true, true);

  return encodedBlueprintPart + '"' + newHash.toUpperCase();
}

/**
 * Encodes the current state back into a blueprint string.
 * @param {object} originalState - The state object from the last successful
 *     decode.
 * @param {object} selections - A data object of user selections from the UI.
 * @returns {string} The new, encoded blueprint string.
 */
export function encode(originalState, selections) {
  const {predata, hexsplit} = originalState;
  const tempHexSegments = [...hexsplit];

  // Selections object maps a hexSegmentIndex to its required changes.
  // e.g., { 5: { buildingId: 2204 }, 12: { recipeId: 55 } }
  for (const hexIndexStr in selections) {
    const hexSplitIndex = parseInt(hexIndexStr, 10);
    const changes = selections[hexIndexStr];
    let segmentHex = tempHexSegments[hexSplitIndex];

    if (changes.buildingId) {
      const {buildingId} = changes;
      const modelIndex = data.itemsData[buildingId]?.modelIndex;
      if (typeof modelIndex === 'undefined') {
        throw new Error(
            `Data for item ID ${buildingId} is missing or invalid.`);
      }
      const buildingHexLE = _encodeLittleEndianHex(buildingId);
      const modelHexLE = _encodeLittleEndianHex(modelIndex);

      segmentHex =
          segmentHex.slice(0, 8) + buildingHexLE + segmentHex.slice(12);
      segmentHex = segmentHex.slice(0, 12) + modelHexLE + segmentHex.slice(16);
    }

    if (typeof changes.recipeId !== 'undefined') {
      const recipeHexLE = _encodeLittleEndianHex(changes.recipeId);
      // Recipe ID is at offset 39 (78 in hex string), length 2 bytes.
      segmentHex = segmentHex.slice(0, 78) + recipeHexLE + segmentHex.slice(82);
    }

    tempHexSegments[hexSplitIndex] = segmentHex;
  }

  const finalHexString = tempHexSegments.join(delimiterHex);
  return _compressAndFinalize(finalHexString, predata);
}