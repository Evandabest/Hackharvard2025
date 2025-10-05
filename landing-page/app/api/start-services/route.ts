import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { services } = await request.json()
    
    if (!services || !Array.isArray(services)) {
      return NextResponse.json(
        { error: 'Services array is required' },
        { status: 400 }
      )
    }

    const results = []
    const projectRoot = path.join(process.cwd(), '..', '..')
    
    for (const service of services) {
      try {
        let command, args, cwd
        
        switch (service) {
          case 'backend':
            cwd = path.join(projectRoot, 'backend')
            command = 'npm'
            args = ['run', 'dev']
            break
            
          case 'agent':
            cwd = path.join(projectRoot, 'agent')
            command = 'python'
            args = ['-m', 'src.main']
            break
            
          case 'landing-page':
            cwd = path.join(projectRoot, 'landing-page')
            command = 'npm'
            args = ['run', 'dev']
            break
            
          default:
            results.push({
              service,
              success: false,
              error: `Unknown service: ${service}`
            })
            continue
        }
        
        // Start the service in the background
        const child = spawn(command, args, {
          cwd,
          detached: true,
          stdio: 'ignore'
        })
        
        child.unref()
        
        results.push({
          service,
          success: true,
          pid: child.pid,
          message: `${service} started successfully`
        })
        
      } catch (error) {
        results.push({
          service,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      message: 'Services startup initiated',
      results
    })
    
  } catch (error) {
    console.error('Error starting services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
