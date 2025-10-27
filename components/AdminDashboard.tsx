import React, { useState } from 'react';
import { ApiKey } from '../types';
import { Trash2Icon } from './icons';

interface AdminDashboardProps {
  apiKeys: ApiKey[];
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKey[]>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ apiKeys, setApiKeys }) => {
    const [keyNamePrefix, setKeyNamePrefix] = useState('');
    const [keyValues, setKeyValues] = useState(''); // Textarea for multiple keys
    const [error, setError] = useState('');

    const addApiKeys = () => {
        setError('');
        const keysToAdd = keyValues.split('\n').map(k => k.trim()).filter(Boolean);

        if (!keyNamePrefix || keysToAdd.length === 0) {
            setError('Please provide a name prefix and at least one API key.');
            return;
        }

        if (apiKeys.length + keysToAdd.length > 10) {
            setError(`You can only add ${10 - apiKeys.length} more keys. Maximum is 10.`);
            return;
        }

        const newApiKeys = keysToAdd.map((key, index) => ({
            id: crypto.randomUUID(),
            name: `${keyNamePrefix}-${apiKeys.length + index + 1}`,
            key: key,
        }));

        setApiKeys(prev => [...prev, ...newApiKeys]);
        setKeyNamePrefix('');
        setKeyValues('');
    };

    const removeApiKey = (id: string) => {
        setApiKeys(apiKeys.filter(key => key.id !== id));
    };
  
    return (
      <div className="p-1">
        <h3 className="text-lg font-bold text-gray-200 mb-4">API Key Management</h3>
         <div className="space-y-4 mb-4">
            <input
                type="text"
                value={keyNamePrefix}
                onChange={(e) => setKeyNamePrefix(e.target.value)}
                placeholder="Key Name Prefix (e.g., 'MyProKeys')"
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
             <textarea
                value={keyValues}
                onChange={(e) => setKeyValues(e.target.value)}
                placeholder="Paste Gemini API Keys here, one per line."
                className="w-full h-24 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <button onClick={addApiKeys} disabled={apiKeys.length >= 10 || !keyNamePrefix || !keyValues} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
            Add API Key(s) ({apiKeys.length}/10)
        </button>

        <h4 className="text-md font-semibold text-gray-300 mt-6 mb-2">Active Keys</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {apiKeys.map(key => (
                <div key={key.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
                    <div>
                         <p className="text-gray-200 truncate pr-4 font-semibold">{key.name}</p>
                         <p className="text-xs text-gray-400">Key: ...{key.key.slice(-4)}</p>
                    </div>
                    <button onClick={() => removeApiKey(key.id)} className="p-2 text-gray-400 hover:text-red-400 rounded-full hover:bg-gray-600 transition-colors" title="Delete key">
                        <Trash2Icon className="w-5 h-5" />
                    </button>
                </div>
            ))}
             {apiKeys.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No API keys added yet.</p>}
        </div>
      </div>
    );
};

export default AdminDashboard;
