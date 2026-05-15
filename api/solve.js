export default async function handler(req, res) {
  try {
    const { question } = req.body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                  text: `Solve this maths question step by step:\n${question}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No solution generated.";

    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}
