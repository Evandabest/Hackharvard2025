#!/bin/bash

# Build and run Boring Notch from command line
echo "Building Boring Notch..."

# Build the project
xcodebuild -scheme boringNotch -configuration Debug build

if [ $? -eq 0 ]; then
    echo "Build successful! Launching app..."
    
    # Find the built app and run it
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "boringNotch.app" -path "*/Build/Products/Debug/*" | head -1)
    
    if [ -n "$APP_PATH" ]; then
        open "$APP_PATH"
        echo "App launched successfully!"
    else
        echo "Error: Could not find built app"
        exit 1
    fi
else
    echo "Build failed!"
    exit 1
fi
