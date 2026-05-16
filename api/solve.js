export default async function handler(req, res) {
  try {
    const { question, imageUrl } = req.body;

    let parts = [];

    // TEXT INPUT
    if (question) {
      parts.push({
        text: `You are a helpful maths tutor. Solve step by step:\n${question}`,
      });
    }

    // IMAGE INPUT (VISION)
    if (imageUrl) {
      const imageBuffer = await fetch(imageUrl).then((r) =>
        r.arrayBuffer()
      );

      const base64 = Buffer.from(imageBuffer).toString("base64");

      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      }
    );

    const data = await response.json();

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI could not solve this problem.";

    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}