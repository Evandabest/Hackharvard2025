#!/bin/bash

# Build and run HaloAudit from command line
echo "🔨 Building HaloAudit..."
echo ""

# Kill existing instance
killall boringNotch 2>/dev/null && echo "✅ Stopped existing instance" || echo "ℹ️  No existing instance running"
sleep 0.5

# Build the project
xcodebuild -scheme boringNotch -configuration Debug build 2>&1 | grep -E "(error:|warning:|BUILD SUCCEEDED|BUILD FAILED|Compiling)"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    
    # Find the built app and run it
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "boringNotch.app" -path "*/Build/Products/Debug/*" -type d | head -1)
    
    if [ -n "$APP_PATH" ]; then
        echo "🚀 Launching app..."
        open "$APP_PATH"
        sleep 1
        echo ""
        echo "✅ App launched successfully!"
        echo ""
        echo "📱 Look for the sparkle icon ✨ in your menu bar"
        echo "🎯 Or hover over the top of your screen to open the notch"
        echo "📄 Click the document icon (📄) to access Auditor"
        echo ""
        echo "💡 To stop: killall boringNotch"
    else
        echo "❌ Error: Could not find built app"
        exit 1
    fi
else
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "💡 Try opening in Xcode to see detailed errors:"
    echo "   open boringNotch.xcodeproj"
    exit 1
fi
