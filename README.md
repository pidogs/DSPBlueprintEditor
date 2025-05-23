# DSP Blueprint Upgrader

https://pidogs.github.io/DSPBlueprintEditor/

 - **Important Note:** At present, the upgrader supports only one type of each building per blueprint. This means all buildings of a selected type within the blueprint will be transformed into the one chosen upgrade type. For example, if you select "Conveyor Belt MK.III", all Conveyor Belts in your blueprint will be upgraded to MK.III, regardless of their original tier.

## Project Description

The DSP Blueprint Upgrader is a web-based tool designed to facilitate the modification and upgrading of blueprint strings for the game Dyson Sphere Program. It allows users to decode existing blueprint strings, select various upgrades for different building types (e.g., Conveyor Belts, Sorters, Smelters, Assemblers), and then encode the modified blueprint back into a string format.

## Features

- **Blueprint Input/Output:** Easily paste blueprint strings for decoding and copy upgraded blueprint strings.
- **Clipboard Integration:** Convenient "Paste from Clipboard" and "Copy to Clipboard" buttons for quick interaction.
- **Upgrade Options:** Select desired upgrade tiers for various in-game structures:
  - Conveyor Belts (MK.I, MK.II, MK.III)
  - Sorters (MK.I, MK.II, MK.III, Stacking Sorter)
  - Smelters (Arc Smelter, Plane Smelter, Negentropy Smelter)
  - Assemblers (Assembling Machine Mk.I, Mk.II, Mk.III, Re-Composing Assembler)
- **Blueprint Decoding & Encoding:** Handles the underlying data transformation, including gzip decompression/compression and MD5 hash validation.

## Usage

To use the DSP Blueprint Upgrader:

1.  **Paste Blueprint:** Paste your Dyson Sphere Program blueprint string into the "Blueprint Input" textarea. You can also use the "Paste from Clipboard" button.
2.  **Decode Blueprint:** Click the "Decode Blueprint" button to process the input string.
3.  **Select Upgrades:** Choose your desired upgrade tiers for Conveyor Belts, Sorters, Smelters, and Assemblers using the provided selectors.
4.  **Copy Upgraded Blueprint:** The "Upgraded Blueprint" textarea will automatically update with the modified string. Click "Copy to Clipboard" to get your new blueprint.

## Blueprint Data Format

The project interacts with a specific binary format for Dyson Sphere Program blueprints. The structure of this binary data is detailed below:

| Section                    | Byte Range (Relative to Section Start) | Data Type | Field Name            | Description                                                                               |
| -------------------------- | -------------------------------------- | --------- | --------------------- | ----------------------------------------------------------------------------------------- |
| **Main Header**            |                                        |           |                       | Global information about the blueprint.                                                   |
|                            | 0-3                                    | uint32    | version               | Blueprint version.                                                                        |
|                            | 4-7                                    | uint32    | cursor_offset_x       | Cursor's X offset when the blueprint was created.                                         |
|                            | 8-11                                   | uint32    | cursor_offset_y       | Cursor's Y offset when the blueprint was created.                                         |
|                            | 12-15                                  | uint32    | cursor_target_area    | Index of the area the cursor was targeting.                                               |
|                            | 16-19                                  | uint32    | dragbox_size_x        | Width of the drag box if used during creation.                                            |
|                            | 20-23                                  | uint32    | dragbox_size_y        | Height of the drag box if used during creation.                                           |
|                            | 24-27                                  | uint32    | primary_area_index    | Index of the primary area in the blueprint.                                               |
|                            | 28                                     | uint8     | area_count            | Number of BlueprintArea structures that follow.                                           |
| **Blueprint Area**         | (Repeats area_count times)             |           |                       | Defines a rectangular area within the blueprint.                                          |
|                            | 0                                      | uint8      | index                 | Unique index for this area.                                                               |
|                            | 1                                      | uint8      | parent_index          | Index of the parent area (e.g., -1 or 0xFF for no parent).                                |
|                            | 2-3                                    | uint16    | tropic_anchor         | Anchor point related to planetary tropics/grid.                                           |
|                            | 4-5                                    | uint16    | area_segments         | Number of segments (grid units) in this area.                                             |
|                            | 6-7                                    | uint16    | anchor_local_offset_x | X offset of the area's anchor within its parent or global space.                          |
|                            | 8-9                                    | uint16    | anchor_local_offset_y | Y offset of the area's anchor within its parent or global space.                          |
|                            | 10-11                                  | uint16    | width                 | Width of the area in grid units.                                                          |
|                            | 12-13                                  | uint16    | height                | Height of the area in grid units.                                                         |
| **Building Header**        |                                        |           |                       | Header for the main building/entity data that follows.                                    |
|                            | 0-3                                    | uint32    | building_count        | **Speculative:** Total number of building entries/segments in the blueprint.              |
| **Building Data Segments** | (Variable Length)                      |           |                       | Contains data for individual buildings/entities.                                          |
|                            | 0-3                                    | uint32     | Index                 | Unique identifier for the building/entity entry.                                          |
|                            | 4-5                                    | uint16    | BuildingID            | ID of the building/item type (e.g., Sorter, Assembler).                                   |
|                            | 6-7                                    | uint32    | ModelIndex            | Index of the object's visual model/variant.                                               |
|                            | 8                                      | uint8     | UnknownByte           | An unknown byte, often observed as 0x00.                                                  |
|                            | 9-12                                   | float32   | x                     | X-coordinate of the building.                                                             |
|                            | 13-16                                  | float32   | y                     | Y-coordinate of the building.                                                             |
|                            | 17-20                                  | float32   | z                     | Z-coordinate of the building.                                                             |
|                            | 21-24                                  | float32   | Yaw                   | Yaw rotation of the building (degrees or radians).                                        |
|                            | 25-28                                  | float32   | Tilt                  | Tilt rotation of the building (degrees or radians).                                       |
|                            | 29-32                                  | int32     | ConnectionIndex       | Index of a connected object (e.g., for belts, sorters). 0xFFFFFFFF (-1) if not connected. |
|                            | 33-36                                  | (Bytes)   | (Skipped)             | Unused/padding                                                                            |
|                            | 37-38                                  | uint16    | CraftedItem           | ID of the item being crafted/filtered (e.g., in Assembler, Sorter).                       |
|                            | 39-44                                  | (Bytes)   | (Skipped)             | Unused/padding                                                                            |
|                            | 45-48                                  | int32     | CustomBitfield        | Bitfield for various building-specific options.                                           |
|                            | 49+                                    | (Bytes)   | (Additional Data)     | Some buildings might have more data after this fixed part, before the next delimiter.     |
