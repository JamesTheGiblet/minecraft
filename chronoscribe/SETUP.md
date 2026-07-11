# ChronoScribe Setup Guide

Follow these steps to get your AI architect companion running in your Minecraft world.

## One-Click Installer (for Non-Developers)

If you have the `chronoscribe.exe` file, the setup is much simpler.

1.  **Install Ollama:** Download and install Ollama from ollama.com.
2.  **Download AI Models:** Open a terminal or command prompt and run the following commands:
    ```bash
    ollama pull llama3.2:3b
    ollama pull llava
    ```
3.  **Run ChronoScribe:** Simply double-click the `chronoscribe.exe` file to start the bot. Make sure Ollama is running in the background.
4.  **Start Minecraft:** Launch Minecraft and open a world to LAN or join a server. ChronoScribe will connect automatically.

---

## For Developers (Version Control)

If you plan to contribute to or modify the project, it's highly recommended to use Git for version control.

1.  **Initialize Git:** In your project directory, run `git init`.
2.  **Commit:** The included `.gitignore` file is configured to exclude dependencies, build files, and logs, ensuring a clean repository.

---

## Prerequisites

Before you begin, ensure you have the following software installed:

1. **Minecraft: Java Edition:** The bot is designed for the Java version of Minecraft.
2. **Node.js:** Version 18.x or newer. You can download it from [nodejs.org](https://nodejs.org/).
3. **Ollama:** The platform for running the local AI model. Download it from [ollama.ai](https://ollama.ai/).

## Installation and Setup

### Step 1: Install Ollama and Pull the AI Model

1. Install Ollama by following the instructions on their website.
2. Once installed, open a terminal or command prompt and run the following command to download the AI model. This may take a few minutes as the model is several gigabytes.

    ```bash
    ollama pull llama3.2:3b
    ollama pull llava
    ```

3. Leave the Ollama application running in the background.

### Step 2: Set Up the ChronoScribe Project

1. Create a new folder for the project and navigate into it in your terminal.

    ```bash
    mkdir chronoscribe
    cd chronoscribe
    ```

2. Initialize a new Node.js project and install the `mineflayer` library.
    
    ```bash
    npm init -y # Creates package.json
    npm install mineflayer
    ```

    **Note:** If you have modified the `package.json` file to update dependencies (like `mineflayer`), run the following command to install the new versions:
   ```bash
   npm install
   ```

3. Create a file named `config.json` in this folder and paste the configuration content into it.
    - To enable the text-to-speech feature, add `"USE_TTS": true` to this file.
    - To enable vision, you must add `"VISION_MODEL": "llava:latest"` and `"SCREENSHOTS_PATH": "C:/Users/YourUser/AppData/Roaming/.minecraft/screenshots"`.
    - **IMPORTANT:** You must replace `YourUser` with your actual Windows username.
    
4. Create a file named `architect.js` in this folder and copy the entire source code into it.

### Step 3: Run ChronoScribe

This guide focuses on the most stable method: running a dedicated server on your machine.

#### 1. Set Up Your Minecraft Server
1.  **Download the Server File:**
    *   Open the Minecraft Launcher and go to the **"Installations"** tab.
    *   Select your `1.21.1` installation and click the **"Server"** button to download the official `server.jar`.
    *   Place this file in your server directory (e.g., `MinecraftServer`).
2.  **Configure Your Server (First-time setup only):**
    *   Run your server's start script (e.g., `start.bat`) once. It will close after creating new files.
    - **EULA:** The first time you run the server, it will create a `eula.txt` file. Open it and change `eula=false` to `eula=true`.
    - **Online Mode:** Open the `server.properties` file. Find the line `online-mode=true` and change it to `online-mode=false`. This allows the bot to connect.

#### 2. Start the Server and the Bot
1.  **Start the Server:** In a terminal, navigate to your `MinecraftServer` directory and run `.\start.bat`. Wait for it to say `Done!`.
2.  **Join the Game:** Launch Minecraft 1.21.1, go to **Multiplayer**, and connect to `localhost`.
3.  **Start the Bot:** Once you are in the game, open a **new, separate terminal**, navigate to your `chronoscribe` directory, and run `node architect.js`.

You should see log messages in your terminal indicating that ChronoScribe is connecting. Within a few seconds, you will see its welcome message in the Minecraft chat.

## Becoming a Server Operator (for Dedicated Servers)

To use in-game commands like `/gamemode` or `/give` on your dedicated server, you need to grant yourself operator status. In the console window where your server is running, type the following command, replacing `YourUsername` with your actual Minecraft username:

`op YourUsername`

## Performance Tuning (for Dedicated Servers)

If you see "Can't keep up!" warnings in your server console, it means the server is lagging. You can significantly improve performance by using optimized Java startup flags. Open your `start.bat` file and replace the `java` command line with the following, which uses modern garbage collection settings:

```bat
"C:\Path\To\Your\java.exe" -Xmx4G -Xms4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:MaxTenuringThreshold=1 -Daikars.new.flags=true -jar server.jar nogui
```

Remember to adjust the path to your `java.exe` and the `-Xmx` value (e.g., `-Xmx6G` for 6GB of RAM) to match your system.

## Troubleshooting

- **Connection Error:** If you see a connection error, double-check that your Minecraft world is open to LAN.
- **Ollama Error:** If you get an "Ollama error," ensure the Ollama application is running and that you have successfully pulled the model.
- **Bot Doesn't Speak:** If the bot joins but doesn't speak, wait about 90 seconds for the first automatic tip or type `build` in the chat to trigger it manually- **Chat Not Working:** If you can join the server but cannot send or see chat messages, you may need to adjust your Microsoft/Xbox account's privacy settings. Sign in to your Microsoft account on the Xbox website and ensure that "You can communicate outside of Xbox with voice and text" and "Others can communicate with voice, text or invites" are set to "Allow" or "Everyone". For more details, see the official Minecraft help article.
