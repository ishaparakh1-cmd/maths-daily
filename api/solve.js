export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "No question provided" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are a highly skilled maths tutor.

Solve step by step clearly.

Always show:
1. Given
2. Solution steps
3. Final answer

Question:
${question}
                  `,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("GEMINI RAW RESPONSE:", JSON.stringify(data));

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer || answer.trim().length === 0) {
      return res.status(200).json({
        answer:
          "AI could not generate a proper solution. Try rephrasing the question.",
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}