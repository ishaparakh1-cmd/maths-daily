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

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const now = Date.now();
      const freshQuestions = [];

      for (const docItem of snapshot.docs) {
        const data = docItem.data();

        if (
          data.createdAt &&
          now - data.createdAt.toMillis() > 24 * 60 * 60 * 1000
        ) {
          await deleteDoc(doc(db, "questions", docItem.id));
        } else {
          freshQuestions.push({
            id: docItem.id,
            ...data,
          });
        }
      }

      setQuestions(freshQuestions);
    });

    return () => unsubscribe();
  }, []);

  async function uploadImageToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error("Image upload failed");
    }

    return data.data.url;
  }

  async function postQuestion(e) {
    e.preventDefault();

    if (!question.trim() && !image) return;

    setLoading(true);

    try {
      let imageUrl = "";

      if (image) {
        imageUrl = await uploadImageToImgBB(image);
      }

      await addDoc(collection(db, "questions"), {
        text: question,
        imageUrl,
        solutions: [],
        createdAt: serverTimestamp(),
      });

      setQuestion("");
      setImage(null);
      alert("Question posted!");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addSolution(questionId) {
    const text = solutionText[questionId];

    if (!text || !text.trim()) return;

    try {
      await updateDoc(doc(db, "questions", questionId), {
        solutions: arrayUnion({
          text,
          createdAt: new Date().toISOString(),
        }),
      });

      setSolutionText({
        ...solutionText,
        [questionId]: "",
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function deleteQuestion(questionId) {
    const confirmDelete = confirm("Delete this question?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "questions", questionId));
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <div className="app">
      <h1>Daily Maths Questions</h1>
      <p>Post questions, add solutions, and discuss maths daily.</p>

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
          <div onClick={() => setOpenId(openId === q.id ? null : q.id)}>
            {q.text && <p>{q.text}</p>}
            {q.imageUrl && <img src={q.imageUrl} alt="Math question" />}
            <small>Click to view/add solutions</small>
          </div>

          {openId === q.id && (
            <div className="solutions">
              <h3>Solutions</h3>

              {q.solutions && q.solutions.length > 0 ? (
                q.solutions.map((s, index) => (
                  <div className="solution" key={index}>
                    {s.text}
                  </div>
                ))
              ) : (
                <p>No solutions yet.</p>
              )}

              <textarea
                placeholder="Write your solution..."
                value={solutionText[q.id] || ""}
                onChange={(e) =>
                  setSolutionText({
                    ...solutionText,
                    [q.id]: e.target.value,
                  })
                }
              />

              <button type="button" onClick={() => addSolution(q.id)}>
                Add Solution
              </button>

              <button
                type="button"
                className="deleteBtn"
                onClick={() => deleteQuestion(q.id)}
              >
                Delete Question
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}