"""
Orchestrator script for the experimental MCSkinsGen text-to-skin pipeline.

This script reads the curated prompt from SKIN_DESIGN.md and passes it to the
external MCSkinsGen pipeline script to generate a high-fidelity skin.

Usage:
1. Follow the setup instructions in doc/SETUP.md to install the MCSkinsGen pipeline.
2. Configure the `MCSKINSGEN_PATH` in `config.json`.
3. Run this script: python generate_skin.py
"""

import os
import re
import json
import subprocess
import sys

def generate_skin():
    """Reads the design prompt and invokes the MCSkinsGen pipeline."""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        pipeline_path = config.get("experimental", {}).get("MCSKINSGEN_PATH")
        if not pipeline_path or not os.path.isdir(pipeline_path):
            print("❌ Error: 'MCSKINSGEN_PATH' is not configured in config.json or the path is invalid.")
            print("   Please point it to the directory where you cloned the MCSkinsGen repository.")
            return

        with open(os.path.join('skin', 'SKIN_DESIGN.md'), 'r', encoding='utf-8') as f:
            content = f.read()

        # Prioritize the new, concise prompt designed for AI models.
        model_prompt_match = re.search(r'<!-- AI_MODEL_PROMPT_START -->(.*)<!-- AI_MODEL_PROMPT_END -->', content, re.DOTALL)
        if model_prompt_match:
            prompt = model_prompt_match.group(1).strip()
            print("✅ Found and using optimized AI model prompt.")
        else:
            # Fallback to the older, more verbose prompt if the new one isn't found.
            print("⚠️ Could not find optimized AI prompt. Falling back to summary prompt. This may be too long for the model.")
            summary_match = re.search(r'<!-- AI_PROMPT_START -->(.*)<!-- AI_PROMPT_END -->', content, re.DOTALL)
            if not summary_match:
                print("❌ Error: Could not find any AI prompt markers in SKIN_DESIGN.md.")
                return
            prompt = summary_match.group(1).strip().replace("## 📝 Summary for Skin Maker", "").replace("Copy-paste this:", "").strip()

        print("🎨 Invoking the MCSkinsGen pipeline with the curated prompt... (This will take several minutes)")
        script_path = os.path.join(pipeline_path, 'main.py')
        # The MCSkinsGen script saves the output in its own directory, so we'll copy it back.
        subprocess.run([sys.executable, script_path, "--prompt", prompt], check=True, cwd=pipeline_path)
        print("\n✅ Successfully generated skin.png using the MCSkinsGen pipeline!")

    except FileNotFoundError:
        print("❌ Error: config.json not found.")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"❌ An error occurred while running the MCSkinsGen pipeline: {e}")
        print("   Ensure the pipeline is installed correctly and all its dependencies are met.")

if __name__ == "__main__":
    generate_skin()