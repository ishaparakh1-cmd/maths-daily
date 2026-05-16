import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import "./App.css";

/* ---------------- FIREBASE ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCEWs4QXJ9Sh9vAKKZWJ4VZRLpDjtH0-5Y",
  authDomain: "maths-daily-eb8b4.firebaseapp.com",
  projectId: "maths-daily-eb8b4",
  storageBucket: "maths-daily-eb8b4.firebasestorage.app",
  messagingSenderId: "69225994293",
  appId: "1:69225994293:web:f43c6c6834d4dadae0b97c",
  measurementId: "G-9SJXL6VT3Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------- IMG BB ---------------- */
const IMGBB_API_KEY = "298cc560d302d7ec8f682a759b5971af";

/* ---------------- APP ---------------- */
export default function App() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [solutionText, setSolutionText] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [aiAnswers, setAiAnswers] = useState({});

  /* ---------------- REALTIME FETCH ---------------- */
  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, async (snap) => {
      const now = Date.now();
      const list = [];

      for (const d of snap.docs) {
        const data = d.data();

        // auto delete after 24h
        if (
          data.createdAt &&
          now - data.createdAt.toMillis() > 24 * 60 * 60 * 1000
        ) {
          await deleteDoc(doc(db, "questions", d.id));
        } else {
          list.push({ id: d.id, ...data });
        }
      }

      setQuestions(list);
    });

    return () => unsub();
  }, []);

  /* ---------------- IMAGE UPLOAD ---------------- */
  async function uploadImage(file) {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      { method: "POST", body: form }
    );

    const data = await res.json();

    if (!data.success) throw new Error("Image upload failed");

    return data.data.url;
  }

  /* ---------------- POST QUESTION + AUTO AI ---------------- */
  async function postQuestion(e) {
    e.preventDefault();

    if (!question.trim() && !image) return;

    setLoading(true);

    try {
      let imageUrl = "";

      if (image) {
        imageUrl = await uploadImage(image);
      }

      // save question first
      const ref = await addDoc(collection(db, "questions"), {
        text: question,
        imageUrl,
        aiSolution: "",
        solutions: [],
        createdAt: serverTimestamp(),
      });

      // call AI
      const aiRes = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          imageUrl,
        }),
      });

      const aiData = await aiRes.json();

      // save AI answer
      await updateDoc(doc(db, "questions", ref.id), {
        aiSolution: aiData.answer || "AI failed to generate solution",
      });

      setQuestion("");
      setImage(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- USER SOLUTION ---------------- */
  async function addSolution(id) {
    const text = solutionText[id];
    if (!text?.trim()) return;

    await updateDoc(doc(db, "questions", id), {
      solutions: arrayUnion({
        text,
        createdAt: new Date().toISOString(),
      }),
    });

    setSolutionText((p) => ({ ...p, [id]: "" }));
  }

  /* ---------------- DELETE ---------------- */
  async function deleteQuestion(id) {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "questions", id));
  }

  /* ---------------- AI RE-SOLVE BUTTON ---------------- */
  async function getAiSolution(id, text, imageUrl) {
    try {
      setAiLoading((p) => ({ ...p, [id]: true }));

      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          imageUrl,
        }),
      });

      const data = await res.json();

      setAiAnswers((p) => ({
        ...p,
        [id]: data.answer || "No AI response",
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading((p) => ({ ...p, [id]: false }));
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="app">
      <h1>📘 Daily Maths AI Solver</h1>

      <form onSubmit={postQuestion}>
        <textarea
          placeholder="Ask your maths question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <button disabled={loading}>
          {loading ? "Processing..." : "Post Question + AI Solve"}
        </button>
      </form>

      <h2>🔥 Daily Questions</h2>

      {questions.length === 0 && <p>No questions yet</p>}

      {questions.map((q) => (
        <div className="card" key={q.id}>
          <div onClick={() => setOpenId(openId === q.id ? null : q.id)}>
            {q.text && <p>{q.text}</p>}
            {q.imageUrl && <img src={q.imageUrl} alt="" />}
          </div>

          {/* AUTO AI ANSWER */}
          {q.aiSolution && (
            <div className="solution">
              <strong>AI Solution:</strong>
              <p>{q.aiSolution}</p>
            </div>
          )}

          {openId === q.id && (
            <div className="solutions">
              <h3>User Solutions</h3>

              {q.solutions?.map((s, i) => (
                <div key={i} className="solution">
                  {s.text}
                </div>
              ))}

              <textarea
                placeholder="Write solution..."
                value={solutionText[q.id] || ""}
                onChange={(e) =>
                  setSolutionText((p) => ({
                    ...p,
                    [q.id]: e.target.value,
                  }))
                }
              />

              <button onClick={() => addSolution(q.id)}>
                Add Solution
              </button>

              <button
                onClick={() =>
                  getAiSolution(q.id, q.text, q.imageUrl)
                }
              >
                {aiLoading[q.id] ? "Thinking..." : "Get AI Solution"}
              </button>

              <button
                className="deleteBtn"
                onClick={() => deleteQuestion(q.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}