            console.log('Showing screen:', screen.id);
// Game state
        }
    }
    
    // Firestore Functions
    function loadRooms() {
        // Clear existing rooms
        const roomGrid = document.querySelector('.room-grid');
        
        // Get rooms from Firestore
        db.collection('rooms')
            .where('isActive', '==', true)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    // If no rooms exist, create default rooms
                    createDefaultRooms();
                    return;
                }
                
                // Add rooms to the UI
                snapshot.forEach(doc => {
                    const room = doc.data();
                    room.id = doc.id;
                    // You would update your UI with these rooms
                });
            })
            .catch(error => {
                console.error('Error loading rooms:', error);
            });
    }
    
    function createDefaultRooms() {
        const defaultRooms = [
            { name: 'Mathematics', type: 'study', code: 'MATH101', isActive: true },
            { name: 'Physics', type: 'study', code: 'PHYS102', isActive: true },
            { name: 'Chemistry', type: 'study', code: 'CHEM103', isActive: true },
            { name: 'Gaming Room', type: 'gaming', code: 'GAME104', isActive: true }
        ];
        
        // Add default rooms to Firestore
        const batch = db.batch();
        
        defaultRooms.forEach(room => {
            const roomRef = db.collection('rooms').doc();
            batch.set(roomRef, {
                ...room,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expireAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        return batch.commit();
    }
    
    function createNewRoom() {
        if (!currentUser) {
            return;
        }
        
        const name = roomNameInput.value.trim();
        const type = roomTypeSelect.value;
        
        if (!name) {
            createMessage.textContent = 'Please enter a room name.';
            createMessage.style.color = '#e74c3c';
            return;
        }
        
        // Generate a unique room code
        const code = generateRoomCode();
        
        // Create new room in Firestore
        db.collection('rooms').add({
            name: name,
            type: type,
            code: code,
            isActive: true,
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            expireAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        })
        .then(docRef => {
            // Show success message
            createMessage.textContent = `Room created successfully! Room code: ${code}`;
            createMessage.style.color = '#2ecc71';
            
            // Clear inputs
            roomNameInput.value = '';
            
            // Enter the newly created room after a brief delay
            setTimeout(() => {
                enterRoom({
                    id: docRef.id,
                    name: name,
                    type: type,
                    code: code
                });
                createMessage.textContent = '';
            }, 1500);
        })
        .catch(error => {
            createMessage.textContent = `Error creating room: ${error.message}`;
            createMessage.style.color = '#e74c3c';
        });
    }
    
    // Event Listeners for Auth
    loginTab.addEventListener('click', () => showAuthForm(loginForm));
    registerTab.addEventListener('click', () => showAuthForm(registerForm));
    forgotPasswordLink.addEventListener('click', e => {
        e.preventDefault();
        showAuthForm(forgotPasswordForm);
    });
    backToLoginLink.addEventListener('click', e => {
        e.preventDefault();
        showAuthForm(loginForm);
    });
    
    loginBtn.addEventListener('click', loginUser);
    registerBtn.addEventListener('click', registerUser);
    resetPasswordBtn.addEventListener('click', resetPassword);
    logoutBtn.addEventListener('click', logoutUser);
    
    // Handle enter key in auth forms
    loginEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginPassword.focus();
        }
    });
    
    loginPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginUser();
        }
    });
    
    // Rest of your existing event listeners and functions...
    
    // Functions for chat messages using Firestore
    function sendMessage() {
        if (!currentUser || !activeRoom) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Add message to Firestore
        db.collection('rooms').doc(activeRoom.id)
            .collection('messages').add({
                text: message,
                sender: currentUser.uid,
                senderName: currentUser.displayName || currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                messageInput.value = '';
            })
            .catch(error => {
                console.error('Error sending message:', error);
            });
    }
    
    function listenForMessages(roomId) {
        // Unsubscribe from previous listener if exists
        if (window.unsubscribeMessages) {
            window.unsubscribeMessages();
        }
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Add system welcome message
        addSystemMessage(`Welcome to the classroom! You can chat with others here.`);
        
        // Listen for new messages
        window.unsubscribeMessages = db.collection('rooms').doc(roomId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const isYou = message.sender === currentUser.uid;
                        
                        // Add message to UI
                        addMessage(message.senderName, message.text, isYou);
                    }
                });
            });
    }
    
    // Ensure you include your existing functions like generateRoomCode, etc.
    
    // Google Sign-In function
    function signInWithGoogle() {
        // Show loading state or disable button if needed
        document.getElementById('login-error').textContent = '';
        
        // On localhost, use popup to avoid refresh issues during development
        const isLocalhost = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            firebase.auth().signInWithPopup(googleProvider)
                .then(handleGoogleSignInSuccess)
                .catch(handleGoogleSignInError);
        } else {
            // For production, use redirect which works better on mobile
            firebase.auth().signInWithRedirect(googleProvider)
                .catch(handleGoogleSignInError);
        }
    }

    // Handle redirect result on page load
    function checkRedirectResult() {
        firebase.auth().getRedirectResult()
            .then(handleGoogleSignInSuccess)
            .catch(handleGoogleSignInError);
    }

    // Handle successful sign-in
    function handleGoogleSignInSuccess(result) {
        if (!result || !result.user) return;
        
        // Get user info
        const user = result.user;
        
        // Check if this is a new user
        if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
            // Create a user profile in Firestore
            db.collection('users').doc(user.uid).set({
                email: user.email,
                name: user.displayName || 'User',
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Track login event with analytics
        if (analytics) {
            analytics.logEvent('login', { method: 'google' });
        }
    }

    // Handle sign-in error
    function handleGoogleSignInError(error) {
        console.error("Google sign-in error:", error);
        
        let errorMessage = "An error occurred during sign in.";
        
        if (error.code === 'auth/unauthorized-domain') {
            errorMessage = "This domain is not authorized. Please contact the administrator.";
            console.log("Current domain:", window.location.hostname);
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups for this site.";
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Sign-in was cancelled. Please try again.";
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // Display error
        document.getElementById('login-error').textContent = errorMessage;
    }

    // Add to your DOMContentLoaded event
    document.addEventListener('DOMContentLoaded', function() {
        // Check for redirect result
        checkRedirectResult();
        
        // Your other event listeners...
        const googleSignInBtn = document.getElementById('google-signin-btn');
        const googleSignUpBtn = document.getElementById('google-signup-btn');
        
        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', signInWithGoogle);
        }
        
        if (googleSignUpBtn) {
            googleSignUpBtn.addEventListener('click', signInWithGoogle);
        }
        
        // Get login button element
        const loginBtn = document.getElementById('login-btn');
        
        // Check if button exists and add event listener
        if (loginBtn) {
            console.log('Login button found, adding event listener');
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent form submission if in a form
                loginUser();
            });
        } else {
            console.error('Login button not found in the DOM');
        }
        
        // Also handle Enter key in password field
        const loginPassword = document.getElementById('login-password');
        if (loginPassword) {
            loginPassword.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loginUser();
                }
            });
        }
    });

    // Fix joining rooms
    function joinRoom(roomId) {
        console.log('Attempting to join room:', roomId);
        // Find the room in our predefined rooms array
        const room = rooms.find(r => r.id === roomId);
        
        if (room) {
            console.log('Room found:', room);
            enterRoom(room);
        } else {
            console.error('Room not found:', roomId);
        }
    }

    // Add proper event listeners to join buttons
    document.addEventListener('DOMContentLoaded', function() {
        // Get all join buttons
        const joinButtons = document.querySelectorAll('.join-btn');
        
        // Add click event to each button
        joinButtons.forEach(button => {
            button.addEventListener('click', function() {
                const roomCard = this.closest('.room-card');
                if (roomCard) {
                    const roomId = roomCard.getAttribute('data-room');
                    console.log('Join button clicked for room:', roomId);
                    joinRoom(roomId);
                }
            });
        });
        
        // Add event listener for join room by code
        const joinRoomBtn = document.getElementById('join-room-btn');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', function() {
                const code = document.getElementById('room-code').value.trim();
                if (code) {
                    joinRoomByCode(code);
                } else {
                    document.getElementById('join-error').textContent = 'Please enter a room code';
                }
            });
        }
    });

    // Update Firebase auth persistence
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(() => {
            console.log('Firebase auth persistence set to session');
        })
        .catch(error => {
            console.error('Error setting Firebase auth persistence:', error);
        });

    // Add these debugging functions to help troubleshoot issues
    function debugFirebaseAuth() {
        const user = firebase.auth().currentUser;
        console.log('Current Firebase user:', user);
        return user;
    }

    function debugRooms() {
        console.log('Available rooms:', rooms);
        return rooms;
    }

    function debugActiveRoom() {
        console.log('Active room:', activeRoom);
        return activeRoom;
    }

    // Add console output for common operations
    function addSystemMessage(text) {
        console.log('System message:', text);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        
        const messageP = document.createElement('p');
        messageP.textContent = text;
        
        messageDiv.appendChild(messageP);
    }

    // Improve the loginUser function
    function loginUser() {
        console.log('Login function called');
        
        // Get input elements
        const loginEmail = document.getElementById('login-email');
        const loginPassword = document.getElementById('login-password');
        const loginError = document.getElementById('login-error');
        
        // Validate inputs exist
        if (!loginEmail || !loginPassword) {
            console.error('Login form elements not found');
            return;
        }
        
        // Get values
        const email = loginEmail.value;
        const password = loginPassword.value;
        
        // Implement login logic here
        // This is a placeholder and should be replaced with actual implementation
        console.log('Logging in with email:', email, 'and password:', password);
    }

    // Add this debugging function
    function checkFirebaseStatus() {
        console.log('Checking Firebase status');
        
        try {
            // Check if Firebase is defined
            if (typeof firebase !== 'undefined') {
                console.log('Firebase is defined');
            }
        } catch (error) {
            console.error('Error checking Firebase status:', error);
        }
    }

    // Function to create a test user (run this in the console if needed)
    function createTestUser() {
        const email = 'test@example.com';
        const password = 'password123';
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('Test user created successfully:', userCredential.user.email);
                alert('Test user created: ' + email + ' with password: ' + password);
            })
            .catch((error) => {
                console.error('Error creating test user:', error.code, error.message);
                alert('Error creating test user: ' + error.message);
            });
    }

    // Uncomment this line to create a test user when page loads (REMOVE AFTER TESTING)
    // document.addEventListener('DOMContentLoaded', function() { setTimeout(createTestUser, 2000); });
}); 