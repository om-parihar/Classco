// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5agwEFKOsS-ojMnYJNcvWYTuYwgytgq8",
  authDomain: "classco-49de1.firebaseapp.com",
  projectId: "classco-49de1",
  storageBucket: "classco-49de1.appspot.com",
  messagingSenderId: "387463824507",
  appId: "1:387463824507:web:95404cc1e6a19bdee44ede",
  measurementId: "G-FJ8DDHWJP7"
};

// Initialize Firebase
try {
  // Check if Firebase SDK is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK is not loaded');
    // Add a visible error on the page
    document.addEventListener('DOMContentLoaded', function() {
      const loginError = document.getElementById('login-error');
      if (loginError) {
        loginError.textContent = 'Firebase SDK failed to load. Please refresh the page or check console.';
      }
    });
  } else {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Initialize services
    let auth, db, analytics, googleProvider;
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Create Google auth provider
    googleProvider = new firebase.auth.GoogleAuthProvider();
    
    // Add scopes 
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    
    // Enable analytics if available
    if (firebase.analytics) {
      analytics = firebase.analytics();
    }
    
    // Set persistence to persist user sessions
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch(error => {
        console.error("Error setting persistence:", error);
      });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Add a visible error on the page
  document.addEventListener('DOMContentLoaded', function() {
    const loginError = document.getElementById('login-error');
    if (loginError) {
      loginError.textContent = 'Firebase initialization error: ' + error.message;
    }
  });
}

// Log current domain for debugging
console.log("Current domain:", window.location.hostname);

// Export the initialized services
// These will be available to your main script 