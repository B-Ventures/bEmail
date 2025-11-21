
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedEmailData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helpers for Document Processing ---

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

// This function handles the intelligent parsing of files (PDF, DOCX, TXT) into a structured course outline
export const processDocument = async (file: File): Promise<{ title: string; contentChunks: string[] }> => {
    let promptContent: any[] = [];

    // 1. Prepare content based on file type
    if (file.type === 'application/pdf') {
         // Gemini can read PDFs directly via base64
         const part = await fileToGenerativePart(file);
         promptContent = [part];
    } 
    else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
    ) {
         // Use Mammoth.js (loaded via CDN in index.html) to extract text from DOCX
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

    // 2. Ask Gemini to analyze and structure the content
    const prompt = `
        You are an expert educational content structurer. 
        Analyze the attached document. It contains content for a mini-course.
        
        Your goals:
        1. Identify the main Course Title.
        2. Break the content down into logical, distinct daily lessons/emails.
        
        If the content is already separated (e.g., by "Day 1", "Day 2"), respect that structure.
        If the content is a continuous block of text, intelligently divide it into 3-7 logical "Days" or "Lessons" based on topic changes.
        
        Return ONLY a valid JSON object.
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [...promptContent, { text: prompt }]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2,
            }
        });

        const text = response.text;
        if(!text) throw new Error("No response from AI");
        
        return JSON.parse(text);
    } catch (e) {
        console.error("Error parsing document:", e);
        throw new Error("Failed to analyze document structure. " + (e as Error).message);
    }
};

// --- Existing Email Generation Logic ---

// This function builds the final HTML from a structured data object and a sophisticated template.
const buildEmailFromTemplate = (data: ParsedEmailData, artworkUrl: string, courseTitle: string): string => {
  // Helper to conditionally render a block if data exists
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
    
    const prompt = `
    You are an expert content strategist and copywriter. Your task is to analyze the raw text for a single email from a mini-course and extract its content into a structured JSON format. You must identify and separate the distinct parts of the email message.

    **CRITICAL RULES:**
    1.  Your output MUST be a single, valid JSON object.
    2.  The JSON object must conform to the provided schema.
    3.  For fields that require HTML ('introduction', 'mainContent', 'closing', 'ps'), you must format the text appropriately. Use standard HTML tags like <p>, <h2>, <ul>, <li>, <strong>, etc. Use inline CSS for basic styling where appropriate (e.g., margins for spacing). Headings (like <h2>) should use the 'Playfair Display' font. Paragraphs should use 'Inter'.
    4.  **MANDATORY:** Convert all placeholders like "[First Name]", "[Name]", "{{contact.FIRSTNAME}}" or similar to the standard placeholder \`{{firstName}}\`. The output MUST use \`{{firstName}}\`.
    5.  Identify any "Action Step" or key takeaway and structure it into the 'actionStep' object. If there is a call to action link or button, extract its text and a placeholder '#' link.
    6.  The 'headerCourseName' should reflect the current day of the course (e.g., "Day ${day} of X" or "Welcome Email").

    **RAW TEXT FOR THIS EMAIL:**
    ---
    ${emailContent}
    ---

    Now, analyze the text and populate the following JSON structure. Be thorough and logical in how you break down the content.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            subject: { type: Type.STRING, description: "The email's subject line." },
            headerBrand: { type: Type.STRING, description: "The name of the brand or the main course title." },
            headerCourseName: { type: Type.STRING, description: "The sub-heading for the course, including the day number (e.g., '7-Day Course: Day 1')." },
            headerTitle: { type: Type.STRING, description: "The main, compelling title for this specific email, to be displayed prominently in the header." },
            headerSubtitle: { type: Type.STRING, description: "A brief, one-line subtitle that expands on the main title." },
            greeting: { type: Type.STRING, description: "The opening greeting. MUST use '{{firstName}}' as the placeholder (e.g., 'Hi {{firstName}},')." },
            introduction: { type: Type.STRING, description: "The opening paragraph(s) of the email body, formatted as an HTML string." },
            mainContent: { type: Type.STRING, description: "The core content of the email, including any subheadings, lists, or detailed explanations, formatted as an HTML string." },
            actionStep: {
                type: Type.OBJECT,
                description: "A clearly defined action step or key takeaway for the reader.",
                properties: {
                    heading: { type: Type.STRING, description: "The title for the action step box (e.g., 'Your Action Step for Today')." },
                    text: { type: Type.STRING, description: "The instructional text within the action step box, formatted as an HTML string." },
                    buttonText: { type: Type.STRING, description: "Optional text for a call-to-action button (e.g., 'Download Worksheet')." },
                    buttonLink: { type: Type.STRING, description: "Optional URL for the button. Use '#' if not specified." }
                },
                required: ["heading", "text"]
            },
            closing: { type: Type.STRING, description: "The closing paragraphs and sign-off, formatted as an HTML string." },
            ps: { type: Type.STRING, description: "An optional postscript (P.S.) section, formatted as an HTML string." }
        },
        required: ["subject", "headerBrand", "headerCourseName", "headerTitle", "headerSubtitle", "greeting", "introduction", "mainContent", "actionStep", "closing"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });

        const jsonText = response.text.trim();
        const parsedData: ParsedEmailData = JSON.parse(jsonText);
        
        const fullHtmlBody = buildEmailFromTemplate(parsedData, artworkUrl, courseTitle);

        return { subject: parsedData.subject, htmlBody: fullHtmlBody, parsedData };
    } catch (e) {
        console.error("Error calling or parsing Gemini response:", e);
        if (e instanceof SyntaxError) {
             throw new Error("Failed to generate email. The AI returned malformed data. Please try refining your PDF content.");
        }
        throw new Error("An unexpected error occurred while generating the email from the AI response.");
    }
};
