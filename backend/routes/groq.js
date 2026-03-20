import express from 'express';

const router = express.Router();
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Generate interview question
router.post('/question', async (req, res) => {
  const { domain, previousQuestions = [] } = req.body;
  try {
    const previousList = previousQuestions.slice(-5).join('\n- ');
    const question = await callGroq(
      `Give me 1 unique easy to medium level technical interview question in the domain of ${domain}.
Do NOT repeat these previous questions:\n- ${previousList}
Return ONLY the question text, nothing else.`
    );
    res.json({ question: question.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

// Get feedback on answer
router.post('/feedback', async (req, res) => {
  const { question, answer } = req.body;
  try {
    const response = await callGroq(
      `You are an interview coach. Rate this answer (scale of 0 to 5) on correctness and completeness. Also give feedback and a perfect answer in this JSON format:
{"correctness": number, "completeness": number, "feedback": string, "correct_answer": string}
Question: ${question}
Answer: ${answer}
Return ONLY the JSON, no extra text.`
    );
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Generate MCQs
router.post('/mcqs', async (req, res) => {
  const { domain } = req.body;
  try {
    const text = await callGroq(
      `Generate 20 unique and diverse MCQs with 4 options and one correct answer in the domain of ${domain}.
IMPORTANT: The answer field must contain the EXACT full text of the correct option, NOT just A B C or D.
Return ONLY a plain JSON array, no markdown, no explanation. Example:
[{"question":"What is 2+2?","options":["1","2","3","4"],"answer":"4"},...]`
    );
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```(?:json)?/g, "").trim();
    }
    const mcqs = JSON.parse(cleaned);
    res.json(mcqs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate MCQs' });
  }
});

export default router;