import * as data from './data.js';
import * as ui from './ui.js';
import * as blueprint from './blueprint.js';


/**
 * Main application state. Holds the data from the last successful decode.
 * @type {object|null}
 */
let lastDecodedState = null;

/**
 * Handles the "Paste" button click. Fetches clipboard content and triggers a decode.
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    ui.setInputValue(text);
    handleDecode();
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
    ui.showError('Could not read from clipboard. Please paste manually.');
  }
}

/**
 * Main decoding workflow.
 * 1. Reads the input value from the UI.
 * 2. Calls the blueprint decoder.
 * 3. Saves the decoded state.
 * 4. Renders the dynamic UI options based on the decoded data.
 * 5. Triggers an initial encoding to populate the output field.
 */
function handleDecode() {
  ui.clearOptions();
  ui.hideError();
  const bpString = ui.getInputValue();

  if (!bpString) {
    ui.showError('Blueprint input is empty.');
    return;
  }

  try {
    const decoded = blueprint.decode(bpString);
    window.decoded = decoded;
    lastDecodedState = {
      predata: decoded.predata,
      hexsplit: decoded.hexsplit,
    };
    // The UI module is responsible for grouping and rendering.
    // Pass the raw building data and a callback for when selections change.
    ui.renderBlueprintOptions(decoded.buildings, handleEncode);
    handleEncode();  // Initial encode to populate output
  } catch (e) {
    console.error('Error during Decode:', e);
    ui.showError(`Decoding error: ${e.message || e}`);
  }
}

/**
 * Main encoding workflow.
 * 1. Checks if a valid decoded state exists.
 * 2. Gets the current user selections from the UI module.
 * 3. Calls the blueprint encoder with the original state and new selections.
 * 4. Updates the output text area with the newly generated blueprint string.
 */
function handleEncode() {
  if (!lastDecodedState) {
    console.warn('Encode called before a successful decode.');
    return;
  }

  try {
    ui.hideError();
    // The UI module provides a clean data object of user's selections.
    const selections = ui.getSelections();
    const newBlueprintString = blueprint.encode(lastDecodedState, selections);
    ui.setOutputValue(newBlueprintString);
  } catch (e) {
    console.error('Error during Encode:', e);
    ui.showError(`Encoding error: ${e.message || e}`);
  }
}

/**
 * Initializes the application.
 * Loads game data, then initializes the UI with the necessary event handlers.
 */
async function startApp() {
  try {
    await data.loadGameData();
    ui.init({
      onDecode: handleDecode,
      onPaste: handlePaste,
      onCopy: ui.copyOutputToClipboard,
    });
  } catch (error) {
    console.error('Application initialization failed:', error);
    ui.showError(
        'Failed to load essential game data. Please check the console and refresh.');
  }
}

// Start the application
startApp();