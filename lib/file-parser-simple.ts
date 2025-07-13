export interface ParsedFileResult {
  content: string;
  error?: string;
}

/**
 * Convert plain text to basic markdown format
 */
function convertTextToMarkdown(text: string): string {
  const lines = text.split('\n');
  let markdown = '';
  let inSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    
    // Skip empty lines but preserve section breaks
    if (!line) {
      if (inSection) {
        markdown += '\n\n';
        inSection = false;
      }
      continue;
    }
    
    // Detect name (first line, typically all caps or title case)
    if (i === 0 && line.length < 60 && /^[A-Z][a-zA-Z\s]+$/.test(line)) {
      markdown += `# ${line}\n\n`;
      inSection = true;
      continue;
    }
    
    // Detect contact info (email, phone, etc.)
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(line) ||
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(line) ||
        /linkedin\.com|github\.com/.test(line.toLowerCase())) {
      markdown += `${line}\n`;
      inSection = true;
      continue;
    }
    
    // Detect headers - lines that are short, capitalized, and followed by content
    if (line.length < 50 && 
        (line.toUpperCase() === line || 
         /^[A-Z][A-Z\s&-]+$/.test(line) ||
         line.endsWith(':') ||
         /^(EDUCATION|EXPERIENCE|SKILLS|SUMMARY|OBJECTIVE|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|AWARDS)$/i.test(line)) &&
        nextLine && 
        nextLine.length > 0) {
      
      // Remove trailing colon if present
      const headerText = line.replace(/:$/, '');
      markdown += `## ${headerText}\n\n`;
      inSection = true;
      continue;
    }
    
    // Detect job titles or company names with dates
    if (/\b(19|20)\d{2}\b/.test(line) && 
        (line.includes('-') || line.includes('to') || line.includes('present'))) {
      markdown += `### ${line}\n\n`;
      inSection = true;
      continue;
    }
    
    // Detect bullet points or list items
    if (/^[•·▪▫‣⁃-]\s/.test(line) || 
        /^\d+\.\s/.test(line) ||
        /^[a-zA-Z]\.\s/.test(line)) {
      markdown += `- ${line.replace(/^[•·▪▫‣⁃-]\s/, '').replace(/^\d+\.\s/, '').replace(/^[a-zA-Z]\.\s/, '')}\n`;
      inSection = true;
      continue;
    }
    
    // Regular content
    markdown += `${line}\n`;
    inSection = true;
  }
  
  return markdown.trim();
}

/**
 * Parse PDF file buffer to extract text content with improved formatting
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    // Dynamic import to avoid Next.js build issues.
    // We import the internal module directly to bypass the debug mode check
    // in the main export of `pdf-parse` which causes issues in a Next.js environment.
    const pdfParse = await import('pdf-parse/lib/pdf-parse.js');
    const pdf = pdfParse.default || pdfParse;

    const data = await pdf(buffer);

    if (!data || !data.text || data.text.trim().length === 0) {
      return {
        content: '',
        error:
          'PDF appears to be empty or contains no readable text. Please check if the PDF has text content.',
      };
    }

    // Convert plain text to markdown format
    const markdownContent = convertTextToMarkdown(data.text.trim());

    return {
      content: markdownContent,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);

    if (error instanceof Error && error.message.includes('Invalid PDF')) {
      return {
        content: '',
        error:
          'The uploaded file appears to be corrupted or is not a valid PDF. Please try a different file.',
      };
    }

    return {
      content: '',
      error:
        'Failed to parse PDF file. Please ensure it contains readable text, or try uploading a DOCX file instead.',
    };
  }
}

/**
 * Convert HTML to markdown format
 */
function convertHtmlToMarkdown(html: string): string {
  // Basic HTML to markdown conversion
  let markdown = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
    
    // Bold and italic
    .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
    
    // Lists
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Line breaks
    .replace(/<br[^>]*\/?>/gi, '\n')
    
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

/**
 * Parse DOCX file buffer to extract text content with formatting preserved
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    // Dynamic import to avoid Next.js build issues
    const mammoth = (await import('mammoth')).default;
    
    // Try to convert to HTML first to preserve formatting
    const htmlResult = await mammoth.convertToHtml({ buffer });
    
    if (htmlResult.value && htmlResult.value.trim()) {
      // Convert HTML to markdown
      const markdownContent = convertHtmlToMarkdown(htmlResult.value);
      return {
        content: markdownContent
      };
    }
    
    // Fall back to raw text if HTML conversion fails
    const textResult = await mammoth.extractRawText({ buffer });
    const markdownContent = convertTextToMarkdown(textResult.value.trim());
    
    return {
      content: markdownContent
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
 * Parse TXT file buffer to extract text content and convert to markdown
 */
export async function parseTXT(buffer: Buffer): Promise<ParsedFileResult> {
  try {
    const textContent = buffer.toString('utf-8').trim();
    if (!textContent) {
      return {
        content: '',
        error: 'Text file appears to be empty.'
      };
    }
    
    // Convert plain text to markdown format
    const markdownContent = convertTextToMarkdown(textContent);
    
    return {
      content: markdownContent
    };
  } catch (error) {
    console.error('TXT parsing error:', error);
    return {
      content: '',
      error: 'Failed to parse text file. Please ensure it is a valid text file.'
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
    case 'txt':
      return parseTXT(buffer);
    default:
      return {
        content: '',
        error: `Unsupported file format: ${extension}. Please upload PDF, DOCX, TXT, or Markdown files.`
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
  const allowedExtensions = ['pdf', 'docx', 'md', 'markdown', 'txt'];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Please upload a PDF, DOCX, TXT, or Markdown file'
    };
  }

  return { valid: true };
}