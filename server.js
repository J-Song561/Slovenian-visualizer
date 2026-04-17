import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/analyze', async (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ error: 'No sentence provided' });

  try {
    const prompt = `You are a Slovenian linguistics expert. Analyze this English sentence and return ONLY valid JSON, no markdown, no explanation, no backticks.

English: "${sentence}"

Return this exact JSON structure:
{
  "english": "the original english sentence",
  "slovenian": "the full slovenian translation",
  "chunks": [
    {
      "role": "predicate|subject|object|recipient|other",
      "words": [
        {
          "slovenian": "word as it appears in the sentence",
          "base_form": "dictionary/infinitive form",
          "pos": "verb|noun|adjective|pronoun|preposition|adverb|particle",
          "case": "nominative|accusative|dative|genitive|locative|instrumental|none",
          "number": "singular|dual|plural|none",
          "gender": "masculine|feminine|neuter|none",
          "person": "1st|2nd|3rd|none",
          "tense": "present|past|future|none",
          "analysis": "short grammatical description max 8 words",
          "change": "base_form → this_form: reason max 12 words"
        }
      ]
    }
  ],
  "grammar_notes": ["short interesting rule note 1", "short interesting rule note 2"]
}

Rules:
- dropped pronouns like I should NOT appear as words
- chunk roles: predicate=verb, subject=nominative subject, object=direct object, recipient=dative, other=everything else
- return ONLY the JSON, nothing else`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));