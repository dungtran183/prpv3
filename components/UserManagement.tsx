import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Trash2Icon } from './icons';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  passwords: Record<string, string>;
  setPasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, passwords, setPasswords, currentUser }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState(UserRole.USER);
  const [error, setError] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUsername || !newPassword) {
      setError('Username and password are required.');
      return;
    }

    if (users.some(u => u.username === newUsername)) {
      setError('Username already exists.');
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: newUsername,
      role: newRole,
    };

    setUsers(prev => [...prev, newUser]);
    setPasswords(prev => ({ ...prev, [newUsername]: newPassword }));

    setNewUsername('');
    setNewPassword('');
    setNewRole(UserRole.USER);
  };

  const handleRemoveUser = (userId: string, username: string) => {
    if (userId === currentUser.id) {
        setError("You cannot delete your own account.");
        return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    setPasswords(prev => {
        const newPasswords = {...prev};
        delete newPasswords[username];
        return newPasswords;
    });
  };

  return (
    <div className="p-1">
      <h3 className="text-lg font-bold text-gray-200 mb-4">User Management</h3>
      
      <form onSubmit={handleAddUser} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="New Username"
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
        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 transition-colors">
            Add User
        </button>
      </form>

      <h4 className="text-md font-semibold text-gray-300 mb-2">Existing Users</h4>
      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
        {users.map(user => (
          <div key={user.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
            <div>
                <p className="text-gray-200">{user.username}</p>
                <p className={`text-xs font-semibold ${user.role === UserRole.MASTER ? 'text-indigo-400' : 'text-gray-400'}`}>{user.role}</p>
            </div>
            <button 
                onClick={() => handleRemoveUser(user.id, user.username)} 
                disabled={user.id === currentUser.id}
                className="p-2 text-gray-400 hover:text-red-400 disabled:text-gray-600 disabled:cursor-not-allowed rounded-full hover:bg-gray-600 transition-colors"
                title={user.id === currentUser.id ? "Cannot delete self" : "Delete user"}
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
