import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioBlob = formData.get("audio") as Blob;
    const mysteryWord = formData.get("word") as string;
    const difficulty = formData.get("difficulty") as string;

    if (!audioBlob || audioBlob.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // 1. Transcribe the audio using Whisper
    const buffer = Buffer.from(await audioBlob.arrayBuffer());
    
    // Convert buffer to a File-like object that Groq's SDK accepts
    const file = new File([buffer], 'audio.webm', { type: audioBlob.type });

    console.log("Transcribing with Whisper-large-v3...");
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: "en",
      response_format: "verbose_json", // Using verbose_json for more reliable results
    });

    // Handle different response formats from Whisper
    const transcript = (typeof transcription === 'string') 
      ? transcription 
      : (transcription as { text?: string }).text || "";

    if (!transcript.trim()) {
      return NextResponse.json({ 
        score: 0, 
        feedback: "Speech was too quiet or not detected. Please try recording again with a louder voice." 
      }, { status: 400 });
    }

    console.log("Transcript received:", transcript);

    // 2. Analyze the transcript using Llama
    const prompt = `
      You are an expert English language coach. 
      A student just practiced a 1-minute speech about the mystery word: "${mysteryWord}".
      The student's target level is "${difficulty}".
      
      Here is the transcript of their speech:
      "${transcript}"

      Analyze the speech for:
      1. A Fluency Score (1-10) based on their vocabulary use, grammar, and flow.
      2. Constructive feedback (max 3 sentences). Mention if they used the mystery word correctly.
      3. A natural, grammatically correct version of what they said (the "Improved Version").
      4. Detect and count all "filler words" or verbal crutches (e.g., "um", "ah", "like", "you know", "so", "basically").
      5. Evaluate their **CEFR Language Level** (A1, A2, B1, B2, C1, or C2) based on the sophistication of their transcript.
      6. A "Grammar Spotlight": Identify one specific grammar rule they can improve (e.g., "Use of past perfect" or "Subject-verb agreement").
      
      Return ONLY a raw JSON object (no markdown, no backticks):
      {
        "score": number,
        "feedback": "string",
        "improvedText": "string",
        "cefrLevel": "string",
        "grammarFocus": "string",
        "fillerWords": [
          { "word": "string", "count": number }
        ],
        "followUpQuestion": "string (A thought-provoking question to ask the user)",
        "bonusVocabulary": {
          "word": "string (a high-level related word)",
          "definition": "string",
          "example": "string"
        }
      }
    `;

    console.log("Analyzing with Llama-3.3-70b...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Lower temperature for more consistent JSON
      response_format: { type: "json_object" },
    });

    let resultText = chatCompletion.choices[0]?.message?.content || "";
    
    // Clean JSON in case Llama adds backticks (though json_object mode should prevent this)
    resultText = resultText.replace(/```json\n?|\n?```/g, '').trim();
    
    const analysis = JSON.parse(resultText);
    
    // Normalize keys in case Llama hallucinates slightly different property names
    analysis.improvedText = analysis.improvedText || analysis.improved_text || analysis.improvedVersion || analysis.improved_version || analysis["Improved Version"] || "We couldn't generate a polished version for this specific transcript.";
    
    // Attach the exact spoken transcript
    analysis.transcript = transcript || "Transcription empty or failed.";

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Groq Analysis Error:", error);
    return NextResponse.json(
      { 
        score: 0, 
        feedback: `Analysis error: ${error.message || "Unknown error"}.`,
        debugError: error.stack 
      },
      { status: 500 }
    );
  }
}
