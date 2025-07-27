/**
 * @fileoverview Manages all UI interactions, DOM manipulation, and event
 * handling.
 */

import * as data from './data.js';

const spriteWidth = 70;

// --- DOM Element Selection ---
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
const modalRecipeSearch = document.getElementById('modal-recipe-search');

// --- Module-level State ---
let _onEncodeCallback = () => {};
let _activeUpgradeSelectors = {};
let _activeRecipeSelectors = {};
let _currentModalGroupKey = null;
let _modalSelectionHandler = null;
let _modalSelectedElement = null;



/**
 * Initializes the UI module, setting up static event listeners.
 * @param {object} config - Configuration object with callbacks.
 * @param {function} config.onDecode - Callback for when the decode button is
 *     clicked.
 * @param {function} config.onPaste - Callback for when the paste button is
 *     clicked.
 * @param {function} config.onCopy - Callback for when the copy button is
 *     clicked.
 */
export function init(config) {
  pasteButton.addEventListener('click', config.onPaste);
  decodeButton.addEventListener('click', config.onDecode);
  copyButton.addEventListener('click', config.onCopy);

  // Modal listeners
  modalCloseButton.addEventListener('click', _closeRecipeModal);
  recipeModal.addEventListener('click', (event) => {
    if (event.target === recipeModal) _closeRecipeModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && recipeModal.classList.contains('visible')) {
      _closeRecipeModal();
    }
  });

  // Modal search listeners
  modalRecipeSearch.addEventListener('input', _filterModalRecipes);
  modalRecipeSearch.addEventListener('keydown', (event) => {
    _handleModalSearchKeydown(event);
  });

  // Debounced resize listener to update selection borders
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(_updateAllSelectorBorders, 150);
  });
}

/**
 * Clears the options grid and resets internal UI state.
 */
export function clearOptions() {
  optionsGrid.innerHTML = '';
  _activeUpgradeSelectors = {};
  _activeRecipeSelectors = {};
}

/**
 * Renders the dynamic UI options based on the decoded blueprint data.
 * @param {Array<object>} buildings - Array of building data from the blueprint
 *     decoder.
 * @param {function} onEncode - The callback function to trigger when a
 *     selection changes.
 */
export function renderBlueprintOptions(buildings, onEncode) {
  _onEncodeCallback = onEncode;
  const upgradeGroups = {};
  const crafterGroups = {};

  // 1. Group buildings from the decoded data
  buildings.forEach(building => {
    // Group upgradeable buildings
    if (data.upgradePaths[building.buildingId]) {
      const groupKey =
          building.buildingId;  // Group by the specific building ID found
      if (!upgradeGroups[groupKey]) {
        const groupDef = data.upgradePaths[building.buildingId];
        upgradeGroups[groupKey] = {
          title: data.itemsData[building.buildingId]?.name ||
              `ID: ${building.buildingId}`,
          genericTitle: groupDef.title,
          itemIds: groupDef.upgrades,
          initialSelection: building.buildingId,
          hexIndices: [],
        };
      }
      upgradeGroups[groupKey].hexIndices.push(building.hexSegmentIndex);
    }

    // Group crafter buildings
    const buildingType = data.buildingTypeMap[building.buildingId];
    if (buildingType && data.craftableRecipesByBuildingType[buildingType]) {
      if (building.recipeId >= 0 && building.recipeId !== 65535) {
        const groupKey = `${buildingType}-${building.recipeId}`;
        if (!crafterGroups[groupKey]) {
          crafterGroups[groupKey] = {
            name: data.itemsData[building.buildingId]?.name,
            buildingType,
            recipeId: building.recipeId,
            count: 0,
            hexIndices: [],
          };
        }
        crafterGroups[groupKey].count++;
        crafterGroups[groupKey].hexIndices.push(building.hexSegmentIndex);
      }
    }
  });

  // 2. Generate and set up UI for each group
  for (const key in upgradeGroups) {
    const groupData = upgradeGroups[key];
    const groupElement = _generateSpriteSelectorGroupHTML(
        groupData.title, groupData.itemIds, key);
    optionsGrid.appendChild(groupElement);
    _setupSpriteContainer(groupElement, groupData, key);
  }

  for (const key in crafterGroups) {
    const groupData = crafterGroups[key];
    const groupElement = _generateRecipeSelectorHTML(groupData, key);
    optionsGrid.appendChild(groupElement);
    _setupRecipeSelector(groupElement, groupData, key);
  }
}



/**
 * Gathers all current user selections from the UI.
 * @returns {object} An object mapping hexSegmentIndex to the changes to be
 *     made.
 */
export function getSelections() {
  const selections = {};

  // Get selections from upgrade groups
  for (const groupKey in _activeUpgradeSelectors) {
    const selector = _activeUpgradeSelectors[groupKey];
    for (const hexIndex of selector.hexIndices) {
      // Initialize if it doesn't exist
      if (!selections[hexIndex]) {
        selections[hexIndex] = {};
      }
      selections[hexIndex].buildingId = selector.selectedId;
    }
  }

  // Get selections from recipe groups and MERGE them
  for (const groupKey in _activeRecipeSelectors) {
    const selector = _activeRecipeSelectors[groupKey];
    for (const hexIndex of selector.hexIndices) {
      // Initialize if it doesn't exist
      if (!selections[hexIndex]) {
        selections[hexIndex] = {};
      }
      selections[hexIndex].recipeId = selector.selectedRecipeId;
    }
  }

  return selections;
}

// --- I/O and Error Display ---

export const getInputValue = () => blueprintInput.value;
export const setInputValue = (value) => {
  blueprintInput.value = value;
};
export const setOutputValue = (value) => {
  blueprintOutput.value = value;
};

export async function copyOutputToClipboard() {
  await navigator.clipboard.writeText(blueprintOutput.value);
}

export function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.style.display = 'block';
  blueprintInput.style.borderColor = 'var(--error-border-color)';
}

export function hideError() {
  errorMessageDiv.textContent = '';
  errorMessageDiv.style.display = 'none';
  blueprintInput.style.borderColor = 'var(--input-border-color)';
}

// --- UI Component Generation & Setup (Internal "Private" Functions) ---

/**
 * Generates HTML for a building upgrade selector group.
 */
function _generateSpriteSelectorGroupHTML(groupTitle, itemIds, groupUniqueId) {
  let spritesHtml = itemIds
                        .map((itemId, index) => `
    <div
      class="sprite"
      id="sprite-${groupUniqueId}-${itemId}"
      data-item-id="${itemId}"
      data-icon="item.${itemId}"
      title="${data.itemsData[itemId]?.name || 'Unknown'}"
    ></div>`).join('');

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
 * Sets up interaction for a building upgrade selector.
 */
function _setupSpriteContainer(containerElement, groupData, groupKey) {
  const border = containerElement.querySelector('.border');
  const sprites = containerElement.querySelectorAll('.sprite');
  const selectedSpan =
      containerElement.querySelector(`#selected-name-${groupKey}`);

  const selector = {
    selectedId: groupData.initialSelection,
    hexIndices: groupData.hexIndices,
    itemIds: groupData.itemIds,
    updateBorderPosition: () => {
      const selectedSprite = containerElement.querySelector(
          `[data-item-id="${selector.selectedId}"]`);
      if (!selectedSprite || !border) {
        if (border) border.style.opacity = 0;
        return;
      }
      border.style.opacity = 1;
      const visualIndex = Array.from(sprites).indexOf(selectedSprite);
      if (visualIndex !== -1) {
        border.style.left = `${visualIndex * (spriteWidth + 16) + 15}px`;
      }
    },
    selectSprite: (itemId) => {
      selector.selectedId = itemId;
      sprites.forEach(s => s.style.opacity = 0.5);
      const selectedSprite =
          containerElement.querySelector(`[data-item-id="${itemId}"]`);
      if (selectedSprite) {
        selectedSprite.style.opacity = 1;
        selectedSpan.textContent = data.itemsData[itemId]?.name || 'Error';
      }
      selector.updateBorderPosition();
    }
  };

  sprites.forEach(sprite => {
    sprite.addEventListener('click', (event) => {
      const clickedItemId = parseInt(sprite.dataset.itemId, 10);
      if (event.shiftKey) {
        // Update all groups of the same generic type
        for (const key in _activeUpgradeSelectors) {
          const otherSelector = _activeUpgradeSelectors[key];
          if (otherSelector.genericTitle === groupData.genericTitle) {
            otherSelector.selectSprite(clickedItemId);
          }
        }
      } else {
        selector.selectSprite(clickedItemId);
      }
      _onEncodeCallback();
    });
  });

  _activeUpgradeSelectors[groupKey] = selector;
  _activeUpgradeSelectors[groupKey].genericTitle =
      groupData.genericTitle;                         // Store for shift-click
  selector.selectSprite(groupData.initialSelection);  // Set initial state
}

/**
 * Generates HTML for a recipe selector group.
 */
function _generateRecipeSelectorHTML(groupData, groupKey) {
  const resultItemId = data.recipeIdToResultItemIdMap[groupData.recipeId];
  const recipeName = data.CraftingIdMap[groupData.recipeId] || 'None';
  const title = `${groupData.name}s (${groupData.count} building${
      groupData.count > 1 ? 's' : ''})`;
  const alternates = data.alternateRecipesMap[resultItemId];

  let alternateSelectorHtml = '';
  if (alternates && alternates.length > 1) {
    let alternateSpritesHtml =
        alternates
            .map(recipe => {
              const iconValue = recipe.explicit ? `recipe.${recipe.id}` :
                                                  `item.${recipe.results[0]}`;
              return `
        <div class="sprite recipe-alternate" data-recipe-id="${
                  recipe.id}" data-icon="${iconValue}" title="${
                  recipe.name}"></div>`;
            })
            .join('');

    alternateSelectorHtml = `
      <div id="alternate-selector-${
        groupKey}" class="sprite-container alternate-recipe-selector">
        <div class="border"></div>
        ${alternateSpritesHtml}
      </div>`;
  }

  const groupHtml = `
    <div class="sprite-selector-group" id="group-${groupKey}">
      <p>${title}</p>
      <div class="recipe-selection-area">
        <div class="recipe-display" id="recipe-display-${
      groupKey}" title="Click to change recipe: ${recipeName}">
          <div class="item-icon" data-icon="item.${resultItemId}"></div>
          <span id="selected-name-${groupKey}">${recipeName}</span>
        </div>
        ${alternateSelectorHtml}
      </div>
    </div>`;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = groupHtml.trim();
  return tempDiv.firstChild;
}

/**
 * Sets up interaction for a recipe selector.
 */
function _setupRecipeSelector(groupElement, groupData, groupKey) {
  const selector = {
    selectedRecipeId: groupData.recipeId,
    hexIndices: groupData.hexIndices,
    buildingType: groupData.buildingType,
  };

  // Main recipe display click handler
  const recipeDisplay =
      groupElement.querySelector(`#recipe-display-${groupKey}`);
  if (recipeDisplay) {
    recipeDisplay.addEventListener('click', () => _openRecipeModal(groupKey));
  }

  // Alternate recipe selector logic
  const altSelectorContainer =
      groupElement.querySelector(`#alternate-selector-${groupKey}`);
  if (altSelectorContainer) {
    const border = altSelectorContainer.querySelector('.border');
    const sprites =
        altSelectorContainer.querySelectorAll('.sprite.recipe-alternate');

    selector.updateBorderPosition = () => {
      const selectedSprite = altSelectorContainer.querySelector(
          `[data-recipe-id="${selector.selectedRecipeId}"]`);
      if (!selectedSprite || !border) return;
      border.style.opacity = 1;
      const visualIndex = Array.from(sprites).indexOf(selectedSprite);
      if (visualIndex !== -1) {
        border.style.left = `${visualIndex * (spriteWidth + 16) + 15}px`;
      }
    };

    const selectAlternate = (recipeId) => {
      if (selector.selectedRecipeId !== recipeId) {
        selector.selectedRecipeId = recipeId;
        _onEncodeCallback();
      }
      sprites.forEach(s => s.style.opacity = 0.5);
      const selectedSprite =
          altSelectorContainer.querySelector(`[data-recipe-id="${recipeId}"]`);
      if (selectedSprite) selectedSprite.style.opacity = 1;
      selector.updateBorderPosition();
    };

    sprites.forEach(sprite => {
      sprite.addEventListener('click', (e) => {
        selectAlternate(parseInt(e.currentTarget.dataset.recipeId, 10));
      });
    });
    selectAlternate(groupData.recipeId);  // Initial selection
  }

  _activeRecipeSelectors[groupKey] = selector;
}

// --- Modal Logic ---

function _openRecipeModal(groupKey) {
  _currentModalGroupKey = groupKey;
  const selector = _activeRecipeSelectors[groupKey];
  if (!selector) return;

  modalRecipeGrid.innerHTML = '';  // Clear previous grid
  const addedResultItemIds = new Set();
  const availableRecipes =
      data.craftableRecipesByBuildingType[selector.buildingType] || [];

  availableRecipes.forEach(recipe => {
    const resultItemId = recipe.results[0];
    const resultItem = data.itemsData[resultItemId];

    if (resultItem && !addedResultItemIds.has(resultItemId)) {
      addedResultItemIds.add(resultItemId);
      const icon = document.createElement('div');
      icon.className = 'item-icon';
      icon.dataset.resultItemId = resultItemId;
      icon.dataset.icon = `item.${resultItemId}`;
      icon.title = resultItem.name;
      icon.setAttribute('tabindex', '0');


      icon.addEventListener('click', (e) => {
        const clickedResultItemId =
            parseInt(e.currentTarget.dataset.resultItemId, 10);
        const newRecipeId = data.alternateRecipesMap[clickedResultItemId][0].id;

        // This is a complex operation: we're changing the group's key
        // characteristic (recipeId), so we need to effectively destroy the old
        // UI element and create a new one.
        const oldElement =
            document.getElementById(`group-${_currentModalGroupKey}`);
        if (oldElement) {
          // Reconstruct the groupData with the new recipeId
          const oldGroupData = {
            name: selector.name || data.itemsData[selector.buildingId]?.name,
            buildingType: selector.buildingType,
            recipeId: newRecipeId,  // The crucial change
            count: selector.hexIndices.length,
            hexIndices: selector.hexIndices,
          };
          const newGroupKey = `${selector.buildingType}-${newRecipeId}`;
          const newElement =
              _generateRecipeSelectorHTML(oldGroupData, newGroupKey);
          oldElement.replaceWith(newElement);

          // Remove old selector state and setup the new one
          delete _activeRecipeSelectors[_currentModalGroupKey];
          _setupRecipeSelector(newElement, oldGroupData, newGroupKey);
        }

        _onEncodeCallback();
        _closeRecipeModal();
      });

      // Update selection border when an icon receives focus
      icon.addEventListener('focus', (e) => {
        if (_modalSelectionHandler) {
          _modalSelectionHandler.moveTo(e.currentTarget);
        }
      });

      modalRecipeGrid.appendChild(icon);
    }
  });

  _modalSelectionHandler = _setupGridSelectionHandler(modalRecipeGrid);
  const currentResultItemId =
      data.recipeIdToResultItemIdMap[selector.selectedRecipeId];
  _modalSelectedElement = modalRecipeGrid.querySelector(
      `[data-result-item-id="${currentResultItemId}"]`);
  _modalSelectionHandler.moveTo(_modalSelectedElement);

  recipeModal.classList.add('visible');
  recipeModal.addEventListener('keydown', _handleModalNavigation);


  modalRecipeSearch.value = '';
  _filterModalRecipes();

  // Now, re-select the correct item that was active before opening.
  _modalSelectedElement = modalRecipeGrid.querySelector(
      `[data-result-item-id="${currentResultItemId}"]`);
  if (_modalSelectionHandler) {
    _modalSelectionHandler.moveTo(_modalSelectedElement);
  }

  // Focus the input field after a short delay to ensure it's ready.
  setTimeout(() => modalRecipeSearch.focus(), 50);
}


function _closeRecipeModal() {
  recipeModal.classList.remove('visible');
  recipeModal.removeEventListener('keydown', _handleModalNavigation);
  modalRecipeSearch.value = '';
  setTimeout(() => {
    modalRecipeGrid.innerHTML = '';
    _currentModalGroupKey = null;
    _modalSelectionHandler = null;
    _modalSelectedElement = null;
  }, 300);
}

/**
 * Handles specific key events on the modal search input.
 */
function _handleModalSearchKeydown(event) {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      // Find the currently selected element and click it
      const selectedIcon =
          modalRecipeGrid.querySelector('.item-icon.has-selection-border');
      if (selectedIcon) {
        selectedIcon.click();
      }
      break;
    case 'Escape':
      // If the search bar has text, clear it. Otherwise, the window listener
      // will close the modal.
      if (modalRecipeSearch.value !== '') {
        event.preventDefault();  // Prevent modal from closing immediately
        event.stopPropagation();
        modalRecipeSearch.value = '';
        _filterModalRecipes();
      }
      break;
  }
}

/**
 * Handles Tab and Arrow Key navigation within the recipe modal.
 * Traps focus inside the modal.
 */
function _handleModalNavigation(event) {
  if (!['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']
          .includes(event.key))
    return;

  const focusable = [
    modalRecipeSearch,
    ...modalRecipeGrid.querySelectorAll(
        '.item-icon:not([style*="display: none"])'),
    modalCloseButton,
  ];

  if (focusable.length <= 2) {  // Only search input and close button
    if (event.key === 'Tab') event.preventDefault();
    return;
  }

  if (event.key === 'Tab') {
    const currentIndex = focusable.indexOf(document.activeElement);
    const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0) {  // Was on first element, wrap to last
      event.preventDefault();
      focusable[focusable.length - 1].focus();
    } else if (nextIndex >= focusable.length) {  // Was on last element, wrap to
                                                 // first
      event.preventDefault();
      focusable[0].focus();
    }
    // Otherwise, let the browser handle tabbing between elements
  } else if (event.key === 'Enter') {
    if (document.activeElement &&
        document.activeElement.classList.contains('item-icon')) {
      event.preventDefault();
      document.activeElement.click();
    }
  } else if (event.key.startsWith('Arrow')) {
    // Only navigate with arrows if focus is inside the grid
    if (!document.activeElement.classList.contains('item-icon')) return;

    event.preventDefault();
    const icons = focusable.filter(el => el.classList.contains('item-icon'));
    const currentIconIndex = icons.indexOf(document.activeElement);
    const gridRect = modalRecipeGrid.getBoundingClientRect();
    const itemRect = icons[0].getBoundingClientRect();
    const numColumns = Math.round((gridRect.width)*.8 / itemRect.width);

    let nextIndex = currentIconIndex;
    if (event.key === 'ArrowLeft')
      nextIndex = Math.max(0, currentIconIndex - 1);
    else if (event.key === 'ArrowRight')
      nextIndex = Math.min(icons.length - 1, currentIconIndex + 1);
    else if (event.key === 'ArrowUp')
      nextIndex = Math.max(0, currentIconIndex - numColumns);
    else if (event.key === 'ArrowDown')
      nextIndex = Math.min(icons.length - 1, currentIconIndex + numColumns);

    if (nextIndex !== currentIconIndex && icons[nextIndex]) {
      icons[nextIndex].focus();
    }
  }
}

/**
 * Filters recipes in the modal based on the search input.
 */
function _filterModalRecipes() {
  const searchTerm = modalRecipeSearch.value.toLowerCase();
  const icons = modalRecipeGrid.querySelectorAll('.item-icon');
  let firstVisibleIcon = null;

  icons.forEach(icon => {
    const itemName = icon.title.toLowerCase();
    if (itemName.includes(searchTerm)) {
      icon.style.display = '';  // Use default display from CSS
      icon.setAttribute('tabindex', '0');
      if (!firstVisibleIcon) {
        firstVisibleIcon = icon;
      }
    } else {
      icon.style.display = 'none';
      icon.setAttribute('tabindex', '-1');
    }
  });

  // Update the state to reflect the new selection for the 'Enter' key.
  _modalSelectedElement = firstVisibleIcon;

  // Move the selection border to the first visible item
  if (_modalSelectionHandler) {
    _modalSelectionHandler.moveTo(_modalSelectedElement);
  }
}

function _setupGridSelectionHandler(container) {
  const border = document.createElement('div');
  border.className = 'selection-border';
  container.appendChild(border);

  return {
    moveTo: (targetElement) => {
      if (!targetElement) {
        border.style.opacity = '0';
        return;
      }
      // Remove border class from any other icon
      container.querySelectorAll('.item-icon')
          .forEach(icon => icon.classList.remove('has-selection-border'));

      // Add border class to the target for the 'Enter' key handler
      targetElement.classList.add('has-selection-border');
      border.style.opacity = '1';
      const left = targetElement.offsetLeft - container.clientLeft +
          (targetElement.offsetWidth / 2) - (border.offsetWidth / 2);
      const top = targetElement.offsetTop - container.clientTop +
          (targetElement.offsetHeight / 2) - (border.offsetHeight / 2);
      border.style.transform = `translate(${left}px, ${top}px)`;
    }
  };
}

function _updateAllSelectorBorders() {
  // Update building upgrade selectors
  for (const key in _activeUpgradeSelectors) {
    _activeUpgradeSelectors[key].updateBorderPosition();
  }

  // Update alternate recipe selectors
  for (const key in _activeRecipeSelectors) {
    const selector = _activeRecipeSelectors[key];
    if (selector.updateBorderPosition) {
      selector.updateBorderPosition();
    }
  }

  // Update modal selection border if visible
  if (recipeModal.classList.contains('visible') && _modalSelectionHandler &&
      _modalSelectedElement) {
    _modalSelectionHandler.moveTo(_modalSelectedElement);
  }
}