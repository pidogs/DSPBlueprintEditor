# DSP Blueprint Modifier
## Project Description

The DSP Blueprint Modifier is a powerful, web-based tool designed to facilitate the modification of blueprint strings for the game Dyson Sphere Program. It goes beyond simple upgrades, allowing users to decode existing blueprints, select new tiers for various buildings, and change recipes for entire groups of crafters. The tool then re-encodes the blueprint with a valid hash, ready to be pasted back into the game.

## Key Concepts

-   **Intelligent Grouping:** Buildings in a pasted blueprint are automatically grouped by their type. Crafting buildings (like Assemblers, Smelters, etc.) are further grouped by their currently assigned recipe.
-   **Group-Based Modification:** All changes—whether upgrading a building tier or selecting a new recipe—are applied to an entire group at once. For example, if your blueprint has 10 Assemblers making Iron Gears and 5 making Circuit Boards, they will appear as two separate groups. You can upgrade the "Iron Gear" group to Mk.II assemblers without affecting the "Circuit Board" group.

## Features

-   **Blueprint Decoding & Encoding:** Handles the complex process of Gzip decompression/compression and custom MD5 hash validation to ensure blueprint integrity.
-   **Comprehensive Building Upgrades:**
  -   Dynamically detects and displays upgrade options for buildings found in your blueprint, including Conveyor Belts, Sorters, Smelters, and Assemblers.
  -   **Shift-Click Mass Upgrade:** Hold the `Shift` key while clicking an upgrade icon to apply that change to all similar groups simultaneously (e.g., upgrade all Sorter groups to Mk.III at once).
-   **Advanced Recipe Modification:**
  -   Change the recipe for any group of crafting buildings (Assemblers, Refineries, Chemical Plants, Matrix Labs, etc.).
  -   A pop-up modal provides a full list of available recipes for a building, complete with a search bar for finding recipes quickly.
  -   Easily switch between alternate recipes that produce the same item.

## Usage

1.  **Paste Blueprint:** Paste your Dyson Sphere Program blueprint string into the "Blueprint Input" textarea, or use the "Paste from Clipboard" button.
2.  **Decode Blueprint:** Click the "Decode Blueprint" button to process the string. The tool will populate the "Upgrade Options" section based on the contents of your blueprint.
3.  **Modify Blueprint:**
  -   For **upgrades**, find the group you want to change and click on the icon for the new tier.
  -   For **recipe changes**, find the crafter group and click on its current recipe display. This will open a modal where you can search for and select a new recipe.
4.  **Copy Upgraded Blueprint:** The "Upgraded Blueprint" textarea updates automatically with every change. When you are finished, click "Copy to Clipboard" to get your new blueprint string.

## Blueprint Data Format

For a detailed technical breakdown of the blueprint binary structure, decoding process, and custom MD5 hash, please see the [Blueprint Data Format](./BlueprintDataFormat.md) document.

## Disclaimer

**Important:** This tool is provided "as is" and is not affiliated with Youthcat Studio. Always back up your blueprints and save files before using this tool. The author is not responsible for any corrupted blueprints, lost progress, or other issues that may arise from its use.