import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCurrentUser({
                uid: firebaseUser.uid,
                username: firebaseUser.email || 'Unknown',
                role: userData.role || UserRole.USER,
            });
        } else {
            // This case might happen if a user is created in Auth but not in Firestore.
            // Let's create a default user document for them.
            const newUser: User = {
                uid: firebaseUser.uid,
                username: firebaseUser.email!,
                role: UserRole.USER, // Default role
            };
            await setDoc(userDocRef, { role: UserRole.USER, username: firebaseUser.email });
            setCurrentUser(newUser);
        }

      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };
  
  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            Loading Application...
        </div>
    );
  }

  if (!currentUser) {
      return <Login />;
  }

  return (
    <Dashboard
        user={currentUser}
        onLogout={handleLogout}
    />
  );
};

export default App;