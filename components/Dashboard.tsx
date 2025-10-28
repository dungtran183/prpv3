import React, { useState, useEffect } from 'react';
import { User, UserRole, ApiKey, ReviewJob } from '../types';
import NewReviewForm from './NewReviewForm';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import ReviewReport from './ReviewReport';
import { BotIcon, UserIcon, UsersIcon, KeyIcon } from './icons';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [jobs, setJobs] = useState<ReviewJob[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeAdminTab, setActiveAdminTab] = useState('apiKeys');

    useEffect(() => {
        const jobsQuery = user.role === UserRole.MASTER
            ? query(collection(db, 'reviewJobs'), orderBy('createdAt', 'desc'))
            : query(collection(db, 'reviewJobs'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

        const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewJob));
            setJobs(jobsData);
            setLoading(false);
        });

        const unsubscribeApiKeys = onSnapshot(collection(db, 'apiKeys'), (snapshot) => {
            const keysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiKey));
            setApiKeys(keysData);
        });
        
        let unsubscribeUsers = () => {};
        if (user.role === UserRole.MASTER) {
            unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
                setUsers(usersData);
            });
        }


        return () => {
            unsubscribeJobs();
            unsubscribeApiKeys();
            unsubscribeUsers();
        };
    }, [user.uid, user.role]);
    
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                         <div className="flex items-center gap-3">
                            <BotIcon className="w-8 h-8 text-indigo-400"/>
                            <h1 className="text-xl font-bold">Paper Reviewer Pro</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-gray-400"/>
                                <span className="text-sm font-medium">{user.username} ({user.role})</span>
                            </div>
                            <button onClick={onLogout} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">Logout</button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <NewReviewForm user={user} apiKeys={apiKeys} />
                        {user.role === UserRole.MASTER && (
                            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                               <h2 className="text-xl font-bold text-indigo-400 mb-4">Admin Panel</h2>
                               <div className="flex space-x-2 border-b border-gray-600 mb-4">
                                    <button onClick={() => setActiveAdminTab('apiKeys')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeAdminTab === 'apiKeys' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                                        <KeyIcon className="w-4 h-4" />
                                        API Keys
                                    </button>
                                    <button onClick={() => setActiveAdminTab('users')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeAdminTab === 'users' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                                        <UsersIcon className="w-4 h-4" />
                                        Users
                                    </button>
                               </div>
                               {activeAdminTab === 'apiKeys' && <AdminDashboard apiKeys={apiKeys} />}
                               {activeAdminTab === 'users' && <UserManagement users={users} currentUser={user} />}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold text-gray-200 mb-4">Review History</h2>
                        <div className="space-y-4">
                            {loading ? (
                                <p className="text-center text-gray-400">Loading reviews...</p>
                            ) : jobs.length > 0 ? (
                                jobs.map(job => <ReviewReport key={job.id} job={job} apiKeys={apiKeys} />)
                            ) : (
                                <div className="text-center py-10 px-6 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
                                    <p className="text-gray-400">No review jobs found.</p>
                                    <p className="text-sm text-gray-500">Start a new review to see its progress here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 <footer className="text-center text-sm text-gray-500 mt-12 pb-6">
                    All application data is securely stored in Google Firebase.
                </footer>
            </main>
        </div>
    );
};

export default Dashboard;