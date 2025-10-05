# Auditor Feature for HaloAudit

## 📱 What's Included

A complete document audit integration for your macOS notch app, connecting to the Auditor Edge API.

### Components

1. **AuditorAPIClient.swift** - Network client for edge worker API
   - Upload creation
   - File upload to R2
   - Run management
   - Status polling

2. **WebSocketManager.swift** - Real-time updates
   - WebSocket connection to edge Durable Object
   - Live progress updates
   - Phase and message streaming

3. **AuditorViewModel.swift** - State management
   - Upload state tracking
   - Findings management
   - WebSocket coordination

4. **AuditorUploadView.swift** - Upload UI
   - Drag & drop support
   - File picker
   - Progress visualization
   - State-based UI (idle → uploading → processing → complete)

5. **AuditorFindingsView.swift** - Results display
   - Findings list with severity badges
   - Color-coded severity levels
   - Detailed finding cards

6. **AuditorNotchView.swift** - Compact notch view
   - Status icon and progress
   - Real-time phase updates
   - Minimal UI for notch integration

## 🎯 Features

- ✅ **Drag & Drop** - Drop PDF/CSV files directly onto the upload zone
- ✅ **File Picker** - Button to browse and select files
- ✅ **Real-time Progress** - WebSocket updates showing current phase and percentage
- ✅ **Visual Feedback** - Animated progress indicators
- ✅ **Error Handling** - Graceful error messages and retry options
- ✅ **Findings Display** - Categorized by severity (high/medium/low)
- ✅ **Status Tracking** - Live connection indicator

## 🔄 Upload Flow

1. **User selects/drops file** → `AuditorUploadView`
2. **Create upload** → `POST /uploads/create`
3. **Upload to R2** → `PUT` to presigned URL
4. **Enqueue job** → `POST /runs/:id/enqueue`
5. **Connect WebSocket** → `ws://edge/ws/run/:id`
6. **Show progress** → Real-time updates from Durable Object
7. **Display results** → Show findings when complete

## 🎨 UI States

### Idle
- Upload zone with drag & drop
- "Choose File" button
- Supported file types hint

### Uploading
- Linear progress bar
- Status message
- Percentage indicator

### Processing
- Circular progress with gradient
- Current phase (e.g., "Analyzing", "Generating Report")
- Live connection indicator
- Last message from pipeline

### Completed
- Checkmark icon (green)
- "Upload Another" button
- Run ID for reference

### Failed
- Warning icon (orange/red)
- Error message
- "Try Again" button

## 🔧 Configuration

Update `AuditorAPIClient.swift` with your values:

```swift
struct AuditorConfig {
    static let baseURL = "https://your-worker.workers.dev"
    static let jwtSecret = "your-jwt-secret" // Optional, for server auth
}
```

## 🧪 Testing

1. **Build the app** - Add the new files to your Xcode project
2. **Switch to Auditor tab** - Click the new "Auditor" tab in the notch
3. **Upload a test file** - Drag & drop a PDF or CSV
4. **Watch progress** - See real-time updates as it processes
5. **View findings** - See audit results when complete

## 📊 Integration Points

### Added to Existing Files

1. **enums/generic.swift**
   - Added `.auditor` to `NotchViews` enum

2. **components/Tabs/TabSelectionView.swift**
   - Added auditor tab to tabs array

3. **ContentView.swift**
   - Added `.auditor` case to view switcher

### Standalone Components

All other files are self-contained in the `Auditor/` folder.

## 🎯 Next Steps

1. **Add to Xcode Project**
   - Select all files in `components/Auditor/`
   - Drag into Xcode project navigator
   - Ensure "Copy items if needed" is checked
   - Add to appropriate target

2. **Build and Run**
   - Press Cmd+B to build
   - Fix any import issues
   - Run the app (Cmd+R)

3. **Test Upload**
   - Open the notch
   - Click "Auditor" tab
   - Drop a PDF or CSV file
   - Watch it process in real-time!

## 🎨 Customization

### Colors
Modify in each view file to match your app's theme.

### Layout
Adjust spacing and sizing to fit your notch dimensions.

### Features
Add more features:
- Download reports
- View detailed findings
- Export results
- Historical runs

## 🐛 Troubleshooting

### WebSocket won't connect
- Check worker URL in `AuditorAPIClient.swift`
- Verify WebSocket URL uses `wss://` not `ws://`
- Check network connectivity

### Upload fails
- Verify edge worker is deployed
- Check file size limits
- Ensure file type is supported (PDF/CSV only)

### No progress updates
- Check WebSocket connection indicator
- Verify run ID is correct
- Check backend agent is running

---

**Your auditor feature is ready to integrate!** 🚀

Just add the files to Xcode and you're good to go!

