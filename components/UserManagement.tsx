import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Trash2Icon } from './icons';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";


interface UserManagementProps {
  users: User[];
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState(UserRole.USER);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!newEmail || !newPassword) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    if (users.some(u => u.username === newEmail)) {
      setError('An account with this email already exists.');
      setLoading(false);
      return;
    }

    try {
        // NOTE: In a production app, you'd use a Cloud Function to do this securely.
        // Creating users on the client requires relaxing Firebase Auth security rules.
        const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
        const newUser = userCredential.user;

        // Now, create the user document in Firestore
        await setDoc(doc(db, "users", newUser.uid), {
            username: newEmail,
            role: newRole,
        });

        setNewEmail('');
        setNewPassword('');
        setNewRole(UserRole.USER);

    } catch(err: any) {
        if(err.code === 'auth/email-already-in-use') {
            setError('This email is already registered.');
        } else if (err.code === 'auth/weak-password') {
            setError('Password should be at least 6 characters.');
        } else {
            setError('Failed to create user. Please check the console for details.');
            console.error(err);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === currentUser.uid) {
        setError("You cannot delete your own account.");
        return;
    }
    if (window.confirm("Are you sure you want to delete this user? This will remove their data but not their login credential (for security reasons).")) {
        try {
            // NOTE: Deleting a Firebase Auth user requires the Admin SDK, which can't run securely on the client.
            // We will only delete their record from the 'users' collection in Firestore.
            await deleteDoc(doc(db, 'users', userId));
        } catch (err) {
            setError("Failed to delete user data.");
            console.error(err);
        }
    }
  };

  return (
    <div className="p-1">
      <h3 className="text-lg font-bold text-gray-200 mb-4">User Management</h3>
      
      <form onSubmit={handleAddUser} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New User Email"
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value={UserRole.USER}>User</option>
                <option value={UserRole.MASTER}>Master</option>
            </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 transition-colors">
            {loading ? "Adding..." : "Add User"}
        </button>
      </form>

      <h4 className="text-md font-semibold text-gray-300 mb-2">Existing Users</h4>
      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
        {users.map(user => (
          <div key={user.uid} className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
            <div>
                <p className="text-gray-200 truncate">{user.username}</p>
                <p className={`text-xs font-semibold ${user.role === UserRole.MASTER ? 'text-indigo-400' : 'text-gray-400'}`}>{user.role}</p>
            </div>
            <button 
                onClick={() => handleRemoveUser(user.uid)} 
                disabled={user.uid === currentUser.uid}
                className="p-2 text-gray-400 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed rounded-full hover:bg-gray-600 transition-colors"
                title={user.uid === currentUser.uid ? "Cannot delete self" : "Delete user"}
            >
              <Trash2Icon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;