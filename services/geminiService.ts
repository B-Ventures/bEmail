
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedEmailData, AIProvider } from '../types';

// --- CONFIGURATION HELPERS ---

const getAIConfig = () => {
    const provider = (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
    let apiKey = localStorage.getItem(`${provider}_api_key`);

    // Fallback for Gemini if using GitHub Secrets
    if (provider === 'gemini' && !apiKey && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
        throw new Error(`MISSING_KEY_${provider.toUpperCase()}`);
    }

    return { provider, apiKey };
};

// --- GENERIC AI COMPLETION HANDLER ---

const callAI = async (
    systemPrompt: string, 
    userPrompt: string | any[], 
    schema: any, 
    isFilePdf: boolean
): Promise<string> => {
    
    const { provider, apiKey } = getAIConfig();

    // 1. GOOGLE GEMINI IMPLEMENTATION
    if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        
        // Fallback check for dynamic key selection in AI Studio environments
        if (!apiKey && (window as any).aistudio) {
             // Project IDX specific logic handled in UI or via env, skipping complex polyfill here for simplicity
        }

        let contents: any = null;
        if (Array.isArray(userPrompt)) {
            // Has file attachments
            contents = { parts: [...userPrompt, { text: systemPrompt }] }; 
        } else {
            contents = { parts: [{ text: systemPrompt + "\n" + userPrompt }] };
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema, // Native Schema Object
                temperature: 0.2,
            }
        });
        
        return response.text || "{}";
    }

    // 2. OPENAI & DEEPSEEK IMPLEMENTATION (Shared Fetch Logic)
    if (provider === 'openai' || provider === 'deepseek') {
        
        if (isFilePdf) {
             throw new Error("PDF_NOT_SUPPORTED");
        }

        // Prepare Endpoints
        const baseUrl = provider === 'openai' 
            ? 'https://api.openai.com/v1/chat/completions' 
            : 'https://api.deepseek.com/chat/completions';
        
        const model = provider === 'openai' ? 'gpt-4o' : 'deepseek-chat';

        // Flatten user prompt if array (extract text only, ignore images/pdf blobs for this fetch implementation)
        let finalUserPrompt = "";
        if (Array.isArray(userPrompt)) {
            // Filter for text parts only
            finalUserPrompt = userPrompt
                .filter(p => p.text)
                .map(p => p.text)
                .join("\n\n");
                
            if (!finalUserPrompt && userPrompt.some(p => p.inlineData)) {
                throw new Error("Only text/docx files are supported with OpenAI/DeepSeek in this version.");
            }
        } else {
            finalUserPrompt = userPrompt;
        }

        // Construct Fetch
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt + "\n IMPORTANT: Respond strictly with valid JSON." 
                    },
                    { 
                        role: 'user', 
                        content: finalUserPrompt 
                    }
                ],
                response_format: { type: "json_object" }, // Ensure JSON mode
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    throw new Error("Unknown AI Provider");
};


// --- DOCUMENT PROCESSING ---

const fileToGenerativePart = async (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const processDocument = async (file: File): Promise<{ title: string; contentChunks: string[] }> => {
    let promptContent: any[] = [];
    const isPdf = file.type === 'application/pdf';

    // 1. Prepare content based on file type
    if (isPdf) {
         // Gemini can read PDFs directly via base64
         const part = await fileToGenerativePart(file);
         promptContent = [part];
    } 
    else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
    ) {
         // Use Mammoth.js (loaded via CDN in index.html) to extract text
         if ((window as any).mammoth) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
            promptContent = [{ text: result.value }];
         } else {
             throw new Error("DOCX processor not loaded. Please refresh.");
         }
    } 
    else {
         // Assume Text
         const text = await file.text();
         promptContent = [{ text: text }];
    }

    // 2. System Prompt
    const systemPrompt = `
        You are an expert educational content structurer. 
        Analyze the attached document content. It contains content for a mini-course.
        
        Your goals:
        1. Identify the main Course Title.
        2. Break the content down into logical, distinct daily lessons/emails.
        
        If the content is already separated (e.g., by "Day 1", "Day 2"), respect that structure.
        If the content is a continuous block of text, intelligently divide it into 3-7 logical "Days" or "Lessons" based on topic changes.
        
        Return ONLY a valid JSON object matching this structure:
        {
            "title": "Course Name",
            "contentChunks": ["Day 1 content full text...", "Day 2 content full text..."]
        }
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The name of the course" },
            contentChunks: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "An array where each string is the full raw text content for one day/email of the course."
            }
        },
        required: ["title", "contentChunks"]
    };

    try {
        // Call Generic AI Handler
        const jsonText = await callAI(systemPrompt, promptContent, responseSchema, isPdf);
        return JSON.parse(jsonText);
    } catch (e: any) {
        console.error("Error parsing document:", e);
        if (e.message.includes("MISSING_KEY")) {
             throw new Error("API Key missing. Please check your Settings.");
        }
        if (e.message === "PDF_NOT_SUPPORTED") {
            throw new Error("PDF analysis is only available with Google Gemini. For OpenAI or DeepSeek, please convert your file to DOCX or Text.");
        }
        throw new Error("Failed to analyze document. " + (e as Error).message);
    }
};

// --- EMAIL GENERATION ---

// This function builds the final HTML from a structured data object and a sophisticated template.
const buildEmailFromTemplate = (data: ParsedEmailData, artworkUrl: string, courseTitle: string): string => {
  const renderIf = (condition: any, content: string) => condition ? content : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${data.subject}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; box-sizing: border-box; background-color: #f9f9f7; font-family: 'Inter', sans-serif; line-height: 1.6; color: #333;">
    <center style="width: 100%; table-layout: fixed; background-color: #f9f9f7; padding: 20px 0;">
        <div style="max-width: 650px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 25px rgba(0,0,0,0.08);">
            <table align="center" style="border-spacing: 0; color: #333; margin: 0 auto; width: 100%; max-width: 650px;">
                <!-- HEADER -->
                <tr>
                    <td style="padding: 0;">
                        <div style="padding: 50px 30px; text-align: center; color: white; background-image: linear-gradient(to bottom, rgba(26, 42, 108, 0.85), rgba(80, 20, 20, 0.85)), url('${artworkUrl}'); background-size: cover; background-position: center;">
                            <p style="font-family: 'Playfair Display', serif; font-size: 1.6rem; margin: 0 0 10px 0; font-weight: 700;">${data.headerBrand || courseTitle}</p>
                            <p style="font-size: 0.9rem; opacity: 0.9; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1.5px;">${data.headerCourseName}</p>
                            <h1 style="font-family: 'Playfair Display', serif; font-size: 2.2rem; margin: 15px 0; line-height: 1.3; text-shadow: 1px 1px 3px rgba(0,0,0,0.3);">${data.headerTitle}</h1>
                            <p style="font-size: 1.1rem; opacity: 0.95; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); margin: 0;">${data.headerSubtitle}</p>
                        </div>
                    </td>
                </tr>
                <!-- BODY -->
                <tr>
                    <td style="padding: 40px; background-color: #ffffff;">
                        <p style="font-size: 1.1rem; margin: 0 0 25px 0; color: #444;">${data.greeting}</p>
                        <div style="margin-bottom: 30px;">${data.introduction}</div>
                        <div style="margin-bottom: 30px;">${data.mainContent}</div>
                        
                        ${renderIf(data.actionStep && data.actionStep.heading, `
                        <div style="background: #f0f7ff; border-left: 4px solid #1a2a6c; padding: 25px; border-radius: 0 8px 8px 0; margin: 30px 0;">
                            <h3 style="font-family: 'Playfair Display', serif; margin: 0 0 15px 0; color: #1a2a6c; font-size: 1.3rem;">${data.actionStep.heading}</h3>
                            <div>${data.actionStep.text}</div>
                            ${renderIf(data.actionStep.buttonText, `
                            <a href="${data.actionStep.buttonLink || '#'}" target="_blank" style="display: inline-block; background: #1a2a6c; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: 600; margin-top: 20px;">
                                ${data.actionStep.buttonText}
                            </a>
                            `)}
                        </div>
                        `)}

                        <div>${data.closing}</div>
                        
                        ${renderIf(data.ps, `
                        <div style="margin-top: 25px; padding-top: 25px; border-top: 1px solid #eee; font-style: italic; color: #666;">
                            ${data.ps}
                        </div>
                        `)}
                    </td>
                </tr>
                <!-- FOOTER -->
                <tr>
                    <td style="background: #f1f3f9; padding: 30px; text-align: center; color: #666; font-size: 0.9rem;">
                        <p style="margin: 0;">© 2024 Your Company. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0;"><a href="#" style="color: #1a2a6c; text-decoration: none;">Unsubscribe</a></p>
                    </td>
                </tr>
            </table>
        </div>
    </center>
</body>
</html>`;
};

export const generateStyledEmail = async (emailContent: string, day: number, courseTitle: string, artworkUrl: string): Promise<{ subject: string, htmlBody: string, parsedData: ParsedEmailData }> => {
    
    const systemPrompt = `
    You are an expert content strategist. Analyze the raw text for a single email and extract its content into a structured JSON format.
    
    **CRITICAL RULES:**
    1. Output MUST be valid JSON matching the schema.
    2. For fields that require HTML ('introduction', 'mainContent', 'closing', 'ps'), format text appropriately (e.g., <p>, <h2>, <ul>, <strong>).
    3. MANDATORY: Convert placeholders like "[First Name]" to \`{{firstName}}\`.
    4. Identify any "Action Step".
    5. 'headerCourseName' should be "Day ${day} of [Course Title]".

    Now, analyze the text provided by the user and populate the JSON.
    `;

    const userPrompt = `
    **RAW TEXT FOR THIS EMAIL:**
    ---
    ${emailContent}
    ---
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            subject: { type: Type.STRING, description: "The email's subject line." },
            headerBrand: { type: Type.STRING, description: "The name of the brand or the main course title." },
            headerCourseName: { type: Type.STRING, description: "The sub-heading for the course (e.g., '7-Day Course: Day 1')." },
            headerTitle: { type: Type.STRING, description: "The main title for this specific email." },
            headerSubtitle: { type: Type.STRING, description: "A brief subtitle." },
            greeting: { type: Type.STRING, description: "The opening greeting (e.g., 'Hi {{firstName}},')." },
            introduction: { type: Type.STRING, description: "Opening paragraph(s) as HTML." },
            mainContent: { type: Type.STRING, description: "Core content as HTML." },
            actionStep: {
                type: Type.OBJECT,
                description: "A clearly defined action step.",
                properties: {
                    heading: { type: Type.STRING },
                    text: { type: Type.STRING },
                    buttonText: { type: Type.STRING },
                    buttonLink: { type: Type.STRING }
                },
                required: ["heading", "text"]
            },
            closing: { type: Type.STRING, description: "Closing paragraphs as HTML." },
            ps: { type: Type.STRING, description: "Postscript (P.S.) as HTML." }
        },
        required: ["subject", "headerBrand", "headerCourseName", "headerTitle", "headerSubtitle", "greeting", "introduction", "mainContent", "actionStep", "closing"],
    };

    try {
        const jsonText = await callAI(systemPrompt, userPrompt, responseSchema, false);
        const parsedData: ParsedEmailData = JSON.parse(jsonText);
        const fullHtmlBody = buildEmailFromTemplate(parsedData, artworkUrl, courseTitle);

        return { subject: parsedData.subject, htmlBody: fullHtmlBody, parsedData };
    } catch (e: any) {
        console.error("Error in email generation:", e);
        if (e.message.includes("MISSING_KEY")) {
             throw new Error("API Key missing. Please check your Settings.");
        }
        if (e instanceof SyntaxError) {
             throw new Error("Failed to generate email. The AI returned malformed data. Please try again.");
        }
        throw new Error("Generation Error: " + (e as Error).message);
    }
};
