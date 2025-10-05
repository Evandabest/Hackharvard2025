import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportUrl = searchParams.get('url');

    if (!reportUrl) {
      return NextResponse.json(
        { error: 'No report URL provided' },
        { status: 400 }
      );
    }

    // Fetch the report content from the R2 URL with authentication
    const response = await fetch(reportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/markdown, text/plain, */*',
        'Authorization': `Bearer ${process.env.EDGE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    
    // Return the content as plain text
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
