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
} from "firebase/firestore";
import "./App.css";

const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE",
};

const IMGBB_API_KEY = "298cc560d302d7ec8f682a759b5971af";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return unsub;
  }, []);

  async function uploadImageToImgBB(file) {
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
    return data.data.url;
  }

  async function postQuestion(e) {
    e.preventDefault();

    if (!question.trim() && !image) return;

    setLoading(true);

    let imageUrl = "";

    if (image) {
      imageUrl = await uploadImageToImgBB(image);
    }

    await addDoc(collection(db, "questions"), {
      text: question,
      imageUrl,
      createdAt: serverTimestamp(),
    });

    setQuestion("");
    setImage(null);
    setLoading(false);
  }

  return (
    <div className="app">
      <h1>Daily Maths Questions</h1>
      <p>Post maths questions as text or image.</p>

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
          {loading ? "Posting..." : "Post Question"}
        </button>
      </form>

      <h2>Questions</h2>

      {questions.map((q) => (
        <div className="card" key={q.id}>
          {q.text && <p>{q.text}</p>}
          {q.imageUrl && <img src={q.imageUrl} alt="Math question" />}
        </div>
      ))}
    </div>
  );
}