import React, { useState, useEffect } from 'react';
// Fix: Import ReviewStatus enum to use for job statuses.
import { User, UserRole, ApiKey, ReviewJob, ReviewStatus } from './types';
import { generateReview } from './services/geminiService';
import ReviewReport from './components/ReviewReport';
import FileUpload from './components/FileUpload';
import AdminDashboard from './components/AdminDashboard';
import UserManagement from './components/UserManagement';
import { BotIcon, UserIcon, UsersIcon, KeyIcon } from './components/icons';

// --- MOCK DATABASE / LOCAL STORAGE ---
// In a real app, this would be a backend service.
const INITIAL_USERS: User[] = [
  { id: 'master-01', username: 'dungtran', role: UserRole.MASTER },
  { id: 'user-01', username: 'user', role: UserRole.USER },
];
const INITIAL_PASSWORDS: Record<string, string> = {
  dungtran: '1',
  user: 'user123',
};

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};

// --- COMPONENTS ---

const Login: React.FC<{ onLogin: (user: User) => void; users: User[]; passwords: Record<string, string> }> = ({ onLogin, users, passwords }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username);
    if (user && passwords[username] === password) {
      onLogin(user);
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="text-center">
            <BotIcon className="w-12 h-12 mx-auto text-indigo-400"/>
            <h1 className="text-2xl font-bold text-white mt-2">Paper Reviewer Pro</h1>
            <p className="text-gray-400">Login to continue</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-bold text-gray-300" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-gray-100 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="dungtran / user"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-300" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-2 text-gray-100 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="1 / user123"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const NewReviewForm: React.FC<{
    user: User;
    apiKeys: ApiKey[];
    jobs: ReviewJob[];
    setJobs: React.Dispatch<React.SetStateAction<ReviewJob[]>>;
}> = ({ user, apiKeys, setJobs }) => {
    const [files, setFiles] = useState<import('./types').UploadFile[]>([]);
    const [journalLevel, setJournalLevel] = useState('Q1 journal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const PROMPT_TEMPLATE = `You're a [JOURNAL_LEVEL]'s reviewer in the field matching the content of the attached manuscript (attached files). Please read the attached manuscript carefully and research with other related approaches to make a comprehensive review of the paper. Make a comprehensive comparison between the proposed method or architechture and other state-of-the-art methods to the best of your knowledge and rate the paper on a scale of 100 points. Suggest a decision for the author and the editor. Suggest improvements if needed in: Novelty, Contribution, Technical Soundness, Methodology, Empirical Rigor and Evaluation (Sharpness and level of analysis, how well results are maintained,...), Presentation and Clarity (Clarity and effectiveness of slides, flow, and delivery, Logical flow and proper formatting of the presentation, Proper use and quality of references, extra references or missing important references, quality of writing, easy to follow, story telling, typo, grammar errors ...). Respond in Vietnamese.`;

    const handleStartReview = () => {
        if (files.length === 0) {
            setError('Please upload at least one file (manuscript).');
            return;
        }
        if (apiKeys.length === 0) {
            setError('No API keys configured. Master user needs to add at least one.');
            return;
        }

        setError('');
        setIsSubmitting(true);

        const manuscriptName = files[0].name;
        const prompt = PROMPT_TEMPLATE.replace('[JOURNAL_LEVEL]', journalLevel);

        const newJobs: ReviewJob[] = apiKeys.map(apiKey => ({
            id: crypto.randomUUID(),
            userId: user.id,
            apiKeyId: apiKey.id,
            apiKeyName: apiKey.name,
            manuscriptName,
            journalLevel,
            // Fix: Use ReviewStatus enum instead of string literal.
            status: ReviewStatus.PENDING,
            createdAt: new Date().toISOString(),
            files: files,
            chatHistory: [], // Initialize chat history
        }));
        
        setJobs(prevJobs => [...newJobs, ...prevJobs]);
        setFiles([]); // Clear files after submission

        // Process jobs asynchronously
        newJobs.forEach(job => {
            // Update status to RUNNING
            // Fix: Use ReviewStatus enum instead of string literal.
            setJobs(prev => prev.map(j => j.id === job.id ? {...j, status: ReviewStatus.RUNNING} : j));
            
            const apiKey = apiKeys.find(k => k.id === job.apiKeyId)?.key;
            if (!apiKey) {
                 // Fix: Use ReviewStatus enum instead of string literal.
                 setJobs(prev => prev.map(j => j.id === job.id ? {...j, status: ReviewStatus.FAILED, error: 'API Key not found.'} : j));
                 return;
            }

            generateReview(prompt, job.files, apiKey)
                .then(result => {
                    // Fix: Use ReviewStatus enum instead of string literal.
                    setJobs(prev => prev.map(j => j.id === job.id ? {...j, status: ReviewStatus.COMPLETED, result} : j));
                })
                .catch(err => {
                    // Fix: Use ReviewStatus enum instead of string literal.
                    setJobs(prev => prev.map(j => j.id === job.id ? {...j, status: ReviewStatus.FAILED, error: err.message} : j));
                });
        });
        
        setIsSubmitting(false);
    };

    return (
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <h2 className="text-xl font-bold text-indigo-400 mb-4">Start New Review</h2>
            <div className="space-y-6">
                <FileUpload files={files} setFiles={setFiles} />
                <div>
                    <label htmlFor="journal-level" className="block text-sm font-medium text-gray-300">Reviewer Profile</label>
                    <select
                        id="journal-level"
                        value={journalLevel}
                        onChange={(e) => setJournalLevel(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option>Q1 journal</option>
                        <option>Q2 Journal</option>
                        <option>A* Conference</option>
                        <option>International Conference</option>
                    </select>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                    onClick={handleStartReview}
                    disabled={isSubmitting || files.length === 0 || apiKeys.length === 0}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Starting...' : `Start ${apiKeys.length} Parallel Review(s)`}
                </button>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const [apiKeys, setApiKeys] = useLocalStorage<ApiKey[]>('prp-api-keys', []);
    const [jobs, setJobs] = useLocalStorage<ReviewJob[]>('prp-review-jobs', []);
    const [users, setUsers] = useLocalStorage<User[]>('prp-users', INITIAL_USERS);
    const [passwords, setPasswords] = useLocalStorage<Record<string, string>>('prp-passwords', INITIAL_PASSWORDS);

    const [activeAdminTab, setActiveAdminTab] = useState('apiKeys');

    const visibleJobs = user.role === UserRole.MASTER ? jobs : jobs.filter(job => job.userId === user.id);
    
    // Auto-logout user if they are deleted by an admin
    useEffect(() => {
        if (!users.find(u => u.id === user.id)) {
            onLogout();
        }
    }, [users, user.id, onLogout]);

    // Automatically refresh job statuses every 30 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            const runningJobs = jobs.filter(
                job => job.status === ReviewStatus.RUNNING || job.status === ReviewStatus.PENDING
            );

            if (runningJobs.length > 0) {
                console.log(`[Auto-Refresh] Checking status for ${runningJobs.length} active job(s). In a real application, this would poll a backend for updates.`);
                // In this frontend-only demo, the job status is updated reactively when the 
                // async 'generateReview' operation completes. This polling mechanism is included
                // to demonstrate how real-time updates would be handled in a full-stack application.
                // No state change is needed here as the promises will update the state themselves.
            }
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [jobs]);

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
                        <NewReviewForm user={user} apiKeys={apiKeys} jobs={jobs} setJobs={setJobs} />
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
                               {activeAdminTab === 'apiKeys' && <AdminDashboard apiKeys={apiKeys} setApiKeys={setApiKeys} />}
                               {activeAdminTab === 'users' && <UserManagement users={users} setUsers={setUsers} passwords={passwords} setPasswords={setPasswords} currentUser={user} />}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold text-gray-200 mb-4">Review History</h2>
                        <div className="space-y-4">
                            {visibleJobs.length > 0 ? (
                                visibleJobs.map(job => <ReviewReport key={job.id} job={job} setJobs={setJobs} apiKeys={apiKeys} />)
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
                    Note: This is a frontend-only demonstration. All data is stored in your browser's local storage and is not secure for production use.
                </footer>
            </main>
        </div>
    );
};

// --- App Component ---

const App: React.FC = () => {
  const [users, setUsers] = useLocalStorage<User[]>('prp-users', INITIAL_USERS);
  const [passwords, setPasswords] = useLocalStorage<Record<string, string>>('prp-passwords', INITIAL_PASSWORDS);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUsers = localStorage.getItem('prp-users');
    if (!storedUsers) {
      localStorage.setItem('prp-users', JSON.stringify(INITIAL_USERS));
    }
    const storedPasswords = localStorage.getItem('prp-passwords');
    if (!storedPasswords) {
      localStorage.setItem('prp-passwords', JSON.stringify(INITIAL_PASSWORDS));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return user ? <Dashboard user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} users={users} passwords={passwords} />;
};

export default App;