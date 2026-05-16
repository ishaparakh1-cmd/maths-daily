export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { question, imageUrl } = req.body;

    const prompt = `
You are an expert maths teacher.

Solve step by step in simple clear format.

Question:
${question || ""}

If an image is provided, carefully analyze it and solve it.
`;

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
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("RAW GEMINI RESPONSE:", JSON.stringify(data));

    // SAFE extraction (important fix)
    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(200).json({
        answer:
          "AI failed to generate solution. Try a clearer question or image.",
      });
    }

    return res.status(200).json({ answer });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}