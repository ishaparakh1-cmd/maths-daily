export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const prompt = `
You are an expert maths teacher and problem solver.

Solve the question step by step in a very clear way.

Rules:
- Show steps clearly
- Give final answer at the end
- Do not skip steps
- Use simple language

Question:
${question}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(200).json({
        answer:
          "AI failed to generate solution. Try a simpler or clearer question.",
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}