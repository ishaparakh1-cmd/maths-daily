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

const firebaseConfig = {
  apiKey: "AIzaSyCEWs4QXJ9Sh9vAKKZWJ4VZRLpDjtH0-5Y",
  authDomain: "maths-daily-eb8b4.firebaseapp.com",
  projectId: "maths-daily-eb8b4",
  storageBucket: "maths-daily-eb8b4.firebasestorage.app",
  messagingSenderId: "69225994293",
  appId: "1:69225994293:web:f43c6c6834d4dadae0b97c",
  measurementId: "G-9SJXL6VT3Q"
};
const IMGBB_API_KEY = "298cc560d302d7ec8f682a759b5971af";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [solutionText, setSolutionText] = useState({});
  const [aiAnswers, setAiAnswers] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, async (snapshot) => {
      const now = Date.now();
      const fresh = [];

      for (const item of snapshot.docs) {
        const data = item.data();

        // auto delete after 24h
        if (
          data.createdAt &&
          now - data.createdAt.toMillis() > 24 * 60 * 60 * 1000
        ) {
          await deleteDoc(doc(db, "questions", item.id));
        } else {
          fresh.push({ id: item.id, ...data });
        }
      }

      setQuestions(fresh);
    });

    return () => unsub();
  }, []);

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!data.success) throw new Error("Image upload failed");

    return data.data.url;
  }

  async function postQuestion(e) {
    e.preventDefault();

    if (!question.trim() && !image) return;

    setLoading(true);

    try {
      let imageUrl = "";

      if (image) {
        imageUrl = await uploadImage(image);
      }

      const ref = await addDoc(collection(db, "questions"), {
        text: question,
        imageUrl,
        solutions: [],
        aiSolution: "",
        createdAt: serverTimestamp(),
      });

      // AUTO AI SOLUTION
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          imageUrl,
        }),
      });

      const data = await res.json();

      await updateDoc(doc(db, "questions", ref.id), {
        aiSolution: data.answer || "AI failed",
      });

      setQuestion("");
      setImage(null);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function deleteQuestion(id) {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "questions", id));
  }

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

      if (!res.ok) throw new Error(data.error);

      setAiAnswers((p) => ({ ...p, [id]: data.answer }));
    } catch (err) {
      alert(err.message);
    } finally {
      setAiLoading((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <div className="app">
      <h1>Daily Maths Questions</h1>

      <form onSubmit={postQuestion}>
        <textarea
          placeholder="Type your maths question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <button disabled={loading}>
          {loading ? "Posting..." : "Post Question + AI Solve"}
        </button>
      </form>

      <h2>Daily Questions</h2>

      {questions.map((q) => (
        <div className="card" key={q.id}>
          <div onClick={() => setOpenId(openId === q.id ? null : q.id)}>
            {q.text && <p>{q.text}</p>}
            {q.imageUrl && <img src={q.imageUrl} alt="question" />}
          </div>

          {/* AUTO AI RESULT */}
          {q.aiSolution && (
            <div className="solution">
              <strong>AI Solution:</strong>
              <br />
              {q.aiSolution}
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
                {aiLoading[q.id] ? "Generating..." : "Get AI Solution"}
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