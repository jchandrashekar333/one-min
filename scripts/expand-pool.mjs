import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const WORDS_PATH = path.join(process.cwd(), 'src/data/words.json');

const CATEGORIES = ["General", "Tech", "Finance", "Interview", "Debate"];
const DIFFICULTIES = ["easy", "medium", "hard"];

async function expandCategory(difficulty, category, existingWords) {
  console.log(`Expanding \${difficulty} - \${category}...`);
  
  const prompt = `
    You are an expert curriculum designer for a public speaking app.
    Generate 10 UNIQUE topic objects for:
    Difficulty: \${difficulty.toUpperCase()}
    Category: \${category}

    EXISTING TOPICS (DO NOT REPEAT THESE): [\${existingWords.join(', ')}]

    RULES:
    1. "word": Single word or short phrase.
    2. "subtitle": A punchy, clever description (under 12 words).
    3. "prompts": 4 thought-provoking questions to help someone speak for 1 minute.
    
    Return ONLY a JSON array of objects:
    [
      { "word": "...", "subtitle": "...", "prompts": ["...", "...", "...", "..."] },
      ...
    ]
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const response = JSON.parse(chatCompletion.choices[0]?.message?.content || "[]");
    // Some models return { "topics": [...] } instead of raw array
    const newTopics = Array.isArray(response) ? response : (response.topics || response.data || []);
    
    return newTopics.filter(t => t.word && !existingWords.includes(t.word.toLowerCase()));
  } catch (err) {
    console.error(`Error for \${category}:`, err.message);
    return [];
  }
}

async function run() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY in .env.local");
    return;
  }

  const data = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  let totalAdded = 0;

  for (const diff of DIFFICULTIES) {
    for (const cat of CATEGORIES) {
      const existing = data[diff][cat].map(w => w.word.toLowerCase());
      const added = await expandCategory(diff, cat, existing);
      
      data[diff][cat] = [...data[diff][cat], ...added];
      totalAdded += added.length;
      
      // Save after every category to avoid data loss
      fs.writeFileSync(WORDS_PATH, JSON.stringify(data, null, 2));
      
      // Small pause to respect rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nDONE! Added \${totalAdded} new topics to words.json.`);
}

run();
