import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Vercel serverless functions

export async function POST(req: Request) {
  let text = '';
  let count = 5;
  try {
    const body = await req.json();
    text = body.text;
    count = body.count;
    const { type, difficulty, questionType } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing source content' }, { status: 400 });
    }

    let sourceContent = text;
    const isUrl = type === 'url' || (type === 'text' && (text.trim().startsWith('http://') || text.trim().startsWith('https://')));

    if (isUrl) {
      try {
        const rawUrls = text.split('\n')
          .map((u: string) => u.trim())
          .filter((u: string) => u.startsWith('http'));

        if (rawUrls.length === 0) throw new Error("No valid URLs found");
        
        const fetchPromises = rawUrls.slice(0, 3).map(async (urlStr: string) => {
          // Remove text fragment hashes (e.g. #:~:text=...)
          const cleanUrl = urlStr.split('#')[0];

          const response = await fetch(cleanUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!response.ok) return '';
          const html = await response.text();

          // Strip scripts, styles, and unwanted tags to extract clean text
          return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&[a-z0-9]+;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        });
        
        const htmlResults = await Promise.all(fetchPromises);
        sourceContent = htmlResults.join('\n\n---\n\n').substring(0, 25000); 

        if (!sourceContent.trim()) {
          return NextResponse.json({ error: 'Could not extract readable text from the provided URL(s).' }, { status: 400 });
        }
      } catch (err: any) {
        return NextResponse.json({ error: 'Could not fetch content from the provided URLs: ' + (err?.message || 'Network error') }, { status: 400 });
      }
    }

    let filePart = null;
    if (type === 'file') {
      try {
        const fileData = JSON.parse(text);
        if (fileData.fileBase64 && fileData.mimeType) {
          filePart = {
            inlineData: {
              data: fileData.fileBase64,
              mimeType: fileData.mimeType
            }
          };
          sourceContent = "Attached File";
        }
      } catch (err) {
        return NextResponse.json({ error: 'Invalid file format uploaded.' }, { status: 400 });
      }
    }

    const diffLevel = difficulty || "Medium";
    const qType = questionType || "Multiple Choice";
    // Cap question count to a safe maximum of 30 per generation request to prevent timeout
    const safeCount = Math.min(Math.max(Number(count) || 5, 1), 30);
    
    let typeInstructions = "multiple-choice questions";
    if (qType === "True/False") {
      typeInstructions = "True/False questions (options must be exactly ['True', 'False'])";
    } else if (qType === "Mixed") {
      typeInstructions = "a mix of multiple-choice and True/False questions";
    } else if (qType === "Fill in the Blanks") {
      typeInstructions = "fill-in-the-blank questions (format the question with a '______' and provide 4 multiple-choice options to fill it)";
    } else if (qType === "Scenario-based") {
      typeInstructions = "scenario-based multiple-choice questions (create a short, real-world scenario before asking the question)";
    } else if (qType === "Definition matching") {
      typeInstructions = "definition-matching multiple-choice questions (ask to match a term to its definition or vice versa)";
    }

    const prompt = `
      You are an expert educator. Create ${safeCount} ${typeInstructions} based on the following text or attached file.
      The difficulty level of the questions should be: ${diffLevel}.
      
      Return the output strictly as a JSON array of objects. Do not use markdown blocks (\`\`\`json). Just the raw JSON array.
      
      Each object must have exactly this structure:
      {
        "question": "The question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": "Option 1"
      }
      
      Make sure the options are plausible and the correct answer exactly matches one of the options.
      If the question is True/False, the options array must contain only two items: ["True", "False"].

      Source Text:
      ${sourceContent}
    `;

    const contents: any[] = [prompt];
    if (filePart) {
      contents.push(filePart);
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (primaryErr: any) {
      console.warn("Primary model (gemini-3.8-flash) unavailable, falling back to gemini-2.5-flash:", primaryErr?.message || primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const outputText = response.text || "";
    
    // Clean up potential markdown formatting if the model disobeys
    let cleanJson = outputText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/```json/g, '');
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/```/g, '');
    cleanJson = cleanJson.trim();

    try {
      const questions = JSON.parse(cleanJson);
      return NextResponse.json({ questions });
    } catch (parseError) {
      console.error("Failed to parse Gemini output:", outputText);
      return NextResponse.json({ error: 'Failed to parse AI response. Please try again.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to generate questions with AI. Please try again.' 
    }, { status: 500 });
  }
}
