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
      temperature: 0.5
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
    const isCodeAnswer = answer.includes('def ') || answer.includes('function ') || answer.includes('class ') || answer.includes('int main') || answer.includes('public static') || answer.includes('```');

    const prompt = isCodeAnswer
      ? `You are an expert code reviewer. Analyze this code carefully and give honest feedback.

Question: ${question}

User's Code:
${answer}

Instructions:
- Analyze if the code correctly solves the problem
- Check time and space complexity
- If code is CORRECT: set correctness 4-5, feedback should say "Your code is correct!" and mention the complexity. In "ideal_answer" put the EXACT same code unchanged.
- If code is WRONG or has bugs: set correctness 0-2, explain the bug clearly. In "ideal_answer" provide the fixed correct code.
- If code is correct but can be slightly optimized: set correctness 3-4, mention the optimization suggestion. In "ideal_answer" show the optimized version.
- "ideal_answer" must ALWAYS contain code — never leave it empty or vague.

Return ONLY this JSON with no markdown or extra text:
{"correctness": <0-5>, "completeness": <0-5>, "feedback": "<your feedback with complexity analysis>", "ideal_answer": "<code here>"}`

      : `You are an expert interview coach. Evaluate this answer honestly.

Question: ${question}

User's Answer: ${answer}

Instructions:
- If answer is correct and complete: set correctness 4-5, give positive feedback, ideal_answer should summarize the best answer.
- If answer is partially correct: set correctness 2-3, point out what is missing.
- If answer is wrong: set correctness 0-1, explain what the correct answer should be.
- "ideal_answer" must ALWAYS contain a complete ideal answer — never leave it empty.

Return ONLY this JSON with no markdown or extra text:
{"correctness": <0-5>, "completeness": <0-5>, "feedback": "<your feedback>", "ideal_answer": "<ideal answer here>"}`;

    const response = await callGroq(prompt);

    // Parse JSON safely
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');

    const parsed = JSON.parse(response.slice(jsonStart, jsonEnd + 1));

    // Normalize field — support both correct_answer and ideal_answer
    const result = {
      correctness: parsed.correctness ?? 0,
      completeness: parsed.completeness ?? 0,
      feedback: parsed.feedback || 'No feedback generated.',
      correct_answer: parsed.ideal_answer || parsed.correct_answer || 'Could not generate ideal answer.'
    };

    res.json(result);
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({
      correctness: 0,
      completeness: 0,
      feedback: 'Error generating feedback. Please try again.',
      correct_answer: 'Could not generate ideal answer.'
    });
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