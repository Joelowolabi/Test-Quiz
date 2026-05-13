import { NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { text, count, type, difficulty, questionType } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing source content' }, { status: 400 });
    }

    let sourceContent = text;

    if (type === 'url') {
      try {
        const urls = text.split('\n').map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'));
        if (urls.length === 0) throw new Error("No valid URLs found");
        
        const fetchPromises = urls.slice(0, 5).map(async (url: string) => {
          const response = await fetch(url);
          if (!response.ok) return '';
          const html = await response.text();
          return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
        });
        
        const htmlResults = await Promise.all(fetchPromises);
        sourceContent = htmlResults.join('\n\n---\n\n').substring(0, 15000); 
      } catch (err) {
        return NextResponse.json({ error: 'Could not fetch content from the provided URLs. Ensure they are public.' }, { status: 400 });
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
      You are an expert educator. Create ${count || 5} ${typeInstructions} based on the following text or attached file.
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
    });

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
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
