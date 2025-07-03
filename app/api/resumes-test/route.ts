import { NextRequest, NextResponse } from 'next/server';
import { parseFile, validateFile } from '@/lib/file-parser-simple';

// Simple test endpoint that doesn't require authentication
export async function POST(request: NextRequest) {
  try {
    console.log('Test resume upload starting...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    console.log('Processing file:', file.name, 'size:', file.size);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse file content
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer created, parsing file...');
    
    const parseResult = await parseFile(buffer, file.name);
    
    if (parseResult.error) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    if (!parseResult.content.trim()) {
      return NextResponse.json({ error: 'File appears to be empty or could not extract text' }, { status: 400 });
    }

    console.log('File parsed successfully, content length:', parseResult.content.length);

    return NextResponse.json({ 
      message: 'Resume processed successfully',
      content: parseResult.content.substring(0, 500) + '...', // Preview only
      contentLength: parseResult.content.length
    });
  } catch (error) {
    console.error('Test resume upload error:', error);
    return NextResponse.json({ error: 'Failed to process resume', details: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Resume test endpoint is working',
    supportedFormats: ['DOCX', 'Markdown'],
    note: 'PDF support temporarily disabled due to Next.js compatibility issues'
  });
}