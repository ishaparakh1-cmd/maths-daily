export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { question, imageUrl } = req.body;

    let parts = [];

    // TEXT INPUT
    if (question) {
      parts.push({
        text: `
You are an expert maths teacher.

Solve step by step clearly.

Question:
${question}
        `,
      });
    }

    // IMAGE INPUT (REAL VISION FIX)
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
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
          "AI could not clearly read this question. Try a clearer image or typed text.",
      });
    }

    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}