// Dynamic imports to avoid Next.js build issues
// import pdf from 'pdf-parse';
// import mammoth from 'mammoth';

export interface ParsedFileResult {
  content: string;
  error?: string;
}

/**
 * Parse PDF file buffer to extract text content
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    // Dynamic import to avoid Next.js build issues
    const pdfParse = await import('pdf-parse');
    const pdf = pdfParse.default || pdfParse;
    
    // Create a clean buffer without any test file references
    const options = {
      // Disable automatic loading of test files
      version: 'v1.6.522'
    };
    
    const data = await pdf(buffer, options);
    return {
      content: data.text.trim()
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      content: '',
      error: 'Failed to parse PDF file. Please ensure it contains readable text.'
    };
  }
}

/**
 * Parse DOCX file buffer to extract text content
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    // Dynamic import to avoid Next.js build issues
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return {
      content: result.value.trim()
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    return {
      content: '',
      error: 'Failed to parse DOCX file. Please ensure it is a valid Word document.'
    };
  }
}

/**
 * Parse Markdown file buffer to extract text content
 */
export async function parseMarkdown(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    const content = buffer.toString('utf-8').trim();
    return {
      content
    };
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return {
      content: '',
      error: 'Failed to parse Markdown file. Please ensure it is a valid text file.'
    };
  }
}

/**
 * Parse file based on its extension
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<ParsedFileResult> {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return parsePDF(buffer);
    case 'docx':
      return parseDOCX(buffer);
    case 'md':
    case 'markdown':
      return parseMarkdown(buffer);
    default:
      return {
        content: '',
        error: `Unsupported file format: ${extension}. Please upload PDF, DOCX, or Markdown files.`
      };
  }
}

/**
 * Validate file size and type
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['pdf', 'docx', 'md', 'markdown'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Please upload a PDF, DOCX, or Markdown file'
    };
  }

  return { valid: true };
}