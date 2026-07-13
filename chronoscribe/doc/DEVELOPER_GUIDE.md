# CobbleWright Developer Guide

This document provides technical guidance for developers who wish to contribute to CobbleWright or extend its capabilities.

## Extending ChronoScribe's Knowledge

ChronoScribe's abilities are defined by its knowledge bases, which are simple JSON files located in the `data/` directory. You can teach ChronoScribe new things without writing any code by editing these files.

### Adding New Pre-defined Structures

The `blueprint` command can build structures from a pre-defined library located in `data/structures.json`. This is faster and more reliable than generating them with the AI.

While you can write these JSON files by hand, the easiest way to add new buildings is to use the schematic importer utility.

#### Using the Schematic Importer

The project includes a utility script to convert standard Minecraft `.schem` files into the JSON format ChronoScribe understands.

**Workflow:**

1. **Find a Schematic:** Download a `.schem` or `.schematic` file for a structure you like from a community site like Planet Minecraft.

2. **Run the Importer:** Place the downloaded file in the project directory and run the following command from your terminal:

    ```bash
    node utils/schematic-importer.js path/to/your/schematic.schem
    ```

3. **Copy the Output:** The script will print a perfectly formatted JSON object to your console.

4. **Update the Database:** Open `data/structures.json`, add a new key for your structure (e.g., `"wizard_tower":`), and paste the copied JSON as its value.

The next time you run CobbleWright, you can use the `structures` command to see your new addition and build it with `/blueprint wizard_tower`.

