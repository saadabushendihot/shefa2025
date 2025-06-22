// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

// Function to save lecture summary to Firestore
function saveLectureSummary(email, lectureName, summary) {
  const summariesRef = db.collection("summaries");
  
  summariesRef.add({
    email: email,
    lectureName: lectureName,
    summary: summary,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    console.log("Summary saved successfully!");
  }).catch((error) => {
    console.error("Error saving summary: ", error);
  });
}
