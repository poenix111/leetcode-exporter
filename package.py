"""
Helper script to package the extension into a clean .zip ready for Chrome Web Store upload.
Usage: python package.py
"""
import zipfile
import os

OUTPUT_ZIP = "leetcode-to-pdf.zip"

FILES_TO_INCLUDE = [
    "manifest.json",
    "main-world.js",
    "highlight.min.js",
    "code-themes.js",
    "content.js",
    "content-button.css",
    "popup.html",
    "popup.css",
    "popup.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]

def build_package():
    print(f"Packaging {OUTPUT_ZIP}...")
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for file_path in FILES_TO_INCLUDE:
            if os.path.exists(file_path):
                z.write(file_path)
                print(f"  + Added {file_path}")
            else:
                print(f"  ! Warning: {file_path} not found")

    size_kb = os.path.getsize(OUTPUT_ZIP) / 1024
    print(f"\nSuccessfully created {OUTPUT_ZIP} ({size_kb:.1f} KB)")
    print("Ready to upload to Chrome Web Store Developer Dashboard!")

if __name__ == "__main__":
    build_package()
