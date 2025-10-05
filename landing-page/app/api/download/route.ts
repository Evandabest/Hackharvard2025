import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    
    if (!platform || !['mac', 'windows'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "mac" or "windows"' },
        { status: 400 }
      )
    }

    // For now, we'll create a simple download response
    // In a real implementation, you would serve actual built applications
    
    if (platform === 'mac') {
      // Return instructions for macOS download
      const downloadInfo = {
        platform: 'mac',
        instructions: [
          '1. Clone the repository: git clone https://github.com/Evandabest/Hackharvard2025',
          '2. Navigate to swift-frontend: cd swift-frontend',
          '3. Open the project: open boringNotch.xcodeproj',
          '4. Build and run in Xcode',
          '5. Or use the build script: ./build_and_run.sh'
        ],
        buildScript: 'swift-frontend/build_and_run.sh',
        projectPath: 'swift-frontend/boringNotch.xcodeproj'
      }
      
      return NextResponse.json(downloadInfo)
    } else if (platform === 'windows') {
      // Return instructions for Windows download
      const downloadInfo = {
        platform: 'windows',
        instructions: [
          '1. Clone the repository: git clone https://github.com/Evandabest/Hackharvard2025',
          '2. Navigate to windows-frontend: cd windows-frontend',
          '3. Install dependencies: npm install',
          '4. Build the application: npm run build',
          '5. Run the application: npm start'
        ],
        buildScript: 'windows-frontend/build.bat',
        projectPath: 'windows-frontend'
      }
      
      return NextResponse.json(downloadInfo)
    }
    
  } catch (error) {
    console.error('Error in download API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
