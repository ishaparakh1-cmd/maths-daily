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
  const [page, setPage] = useState("daily");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [dailyQuestions, setDailyQuestions] = useState([]);
  const [libraryQuestions, setLibraryQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [solutionText, setSolutionText] = useState({});

  useEffect(() => {
    const dailyQuery = query(
      collection(db, "questions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeDaily = onSnapshot(dailyQuery, async (snapshot) => {
      const now = Date.now();
      const fresh = [];

      for (const docItem of snapshot.docs) {
        const data = docItem.data();

        if (
          data.createdAt &&
          now - data.createdAt.toMillis() > 24 * 60 * 60 * 1000
        ) {
          await deleteDoc(doc(db, "questions", docItem.id));
        } else {
          fresh.push({ id: docItem.id, ...data });
        }
      }

      setDailyQuestions(fresh);
    });

    const libraryQuery = query(
      collection(db, "library"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeLibrary = onSnapshot(libraryQuery, (snapshot) => {
      setLibraryQuestions(
        snapshot.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
      );
    });

    return () => {
      unsubscribeDaily();
      unsubscribeLibrary();
    };
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

  async function addSolution(collectionName, questionId) {
    const text = solutionText[questionId];

    if (!text || !text.trim()) return;

    try {
      await updateDoc(doc(db, collectionName, questionId), {
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

  async function deleteQuestion(collectionName, questionId) {
    const confirmDelete = confirm("Delete this question?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, collectionName, questionId));
  }

  async function saveToLibrary(q) {
    try {
      await addDoc(collection(db, "library"), {
        text: q.text || "",
        imageUrl: q.imageUrl || "",
        solutions: q.solutions || [],
        createdAt: serverTimestamp(),
      });

      alert("Saved to Library!");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  const list = page === "daily" ? dailyQuestions : libraryQuestions;
  const collectionName = page === "daily" ? "questions" : "library";

  return (
    <div className="app">
      <h1>Daily Maths Questions</h1>

      <div className="tabs">
        <button onClick={() => setPage("daily")}>Daily Questions</button>
        <button onClick={() => setPage("library")}>Library</button>
      </div>

      {page === "daily" && (
        <>
          <p>Post questions. They delete after 24 hours unless saved to Library.</p>

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
        </>
      )}

      <h2>{page === "daily" ? "Today’s Questions" : "Question Library"}</h2>

      {list.map((q) => (
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

              <button type="button" onClick={() => addSolution(collectionName, q.id)}>
                Add Solution
              </button>

              {page === "daily" && (
                <button type="button" onClick={() => saveToLibrary(q)}>
                  Save to Library
                </button>
              )}

              <button
                type="button"
                className="deleteBtn"
                onClick={() => deleteQuestion(collectionName, q.id)}
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