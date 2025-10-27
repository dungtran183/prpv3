import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { ReviewJob, ApiKey, ChatMessage, UploadFile } from '../types';
import { continueChat } from '../services/geminiService';
import FileUpload from './FileUpload';
import { DownloadIcon, CheckCircleIcon, AlertTriangleIcon, UserIcon, BotIcon } from './icons';

// ChatFollowUp Component
interface ChatFollowUpProps {
    job: ReviewJob;
    apiKey: ApiKey | undefined;
    setJobs: React.Dispatch<React.SetStateAction<ReviewJob[]>>;
}

const ChatFollowUp: React.FC<ChatFollowUpProps> = ({ job, apiKey, setJobs }) => {
    const [newMessage, setNewMessage] = useState('');
    const [chatFiles, setChatFiles] = useState<UploadFile[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [chatError, setChatError] = useState('');

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !apiKey) {
            setChatError("Cannot send an empty message.");
            return;
        }
        setChatError('');
        setIsThinking(true);

        const userMessage: ChatMessage = {
            role: 'user',
            text: newMessage,
            files: chatFiles,
        };

        // Immediately update UI with user's message
        const updatedHistory = [...(job.chatHistory || []), userMessage];
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, chatHistory: updatedHistory } : j));

        setNewMessage('');
        setChatFiles([]);

        try {
            const modelResponseText = await continueChat(apiKey.key, updatedHistory, userMessage);
            const modelMessage: ChatMessage = {
                role: 'model',
                text: modelResponseText,
            };
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, chatHistory: [...updatedHistory, modelMessage] } : j));
        } catch (err: any) {
            setChatError(err.message || "Failed to get a response.");
             const errorMessage: ChatMessage = {
                role: 'model',
                text: `Error: ${err.message || "Failed to get a response."}`,
            };
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, chatHistory: [...updatedHistory, errorMessage] } : j));
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-gray-600">
            <h4 className="font-semibold text-gray-200 mb-3">Follow-up Conversation</h4>
            <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
                <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {/* Initial Report as first model message */}
                     <div className="flex items-start gap-3">
                        <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                        <div className="bg-gray-800 p-3 rounded-lg flex-grow">
                            <p className="text-gray-300 whitespace-pre-wrap">{job.result?.report}</p>
                        </div>
                    </div>
                    {/* Chat History */}
                    {job.chatHistory?.map((msg, index) => (
                         <div key={index} className="flex items-start gap-3">
                            {msg.role === 'user' ? <UserIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" /> : <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />}
                            <div className={`${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-800'} p-3 rounded-lg flex-grow`}>
                                <p className="text-gray-300 whitespace-pre-wrap">{msg.text}</p>
                                {msg.files && msg.files.length > 0 && (
                                    <div className="mt-2 border-t border-gray-600 pt-2">
                                        <p className="text-xs text-gray-400">Attached: {msg.files.map(f => f.name).join(', ')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex items-center gap-3">
                             <BotIcon className="w-6 h-6 text-indigo-400 flex-shrink-0 animate-pulse" />
                             <div className="bg-gray-800 p-3 rounded-lg"><p className="text-gray-400">Thinking...</p></div>
                        </div>
                    )}
                </div>
                 {chatError && <p className="text-sm text-red-400">{chatError}</p>}
                <div className="space-y-3">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                    />
                    <FileUpload files={chatFiles} setFiles={setChatFiles} maxFiles={5} />
                    <button onClick={handleSendMessage} disabled={isThinking} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 transition-colors">
                        Send Message
                    </button>
                </div>
            </div>
        </div>
    );
};


interface ReviewReportProps {
  job: ReviewJob;
  setJobs: React.Dispatch<React.SetStateAction<ReviewJob[]>>;
  apiKeys: ApiKey[];
}

const ReviewReport: React.FC<ReviewReportProps> = ({ job, setJobs, apiKeys }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    if (job.status === 'RUNNING') {
        setProgress(0);
        const duration = 90000; // Simulate 90 seconds for review
        const startTime = Date.now();

        interval = window.setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const newProgress = Math.min(95, (elapsedTime / duration) * 100);
            setProgress(newProgress);
            if (newProgress >= 95) {
                clearInterval(interval);
            }
        }, 250);
    } else if (job.status === 'COMPLETED') {
        setProgress(100);
    } else {
        setProgress(0);
    }
    return () => clearInterval(interval);
  }, [job.status]);

  const handleDownloadPDF = () => {
    // ... (PDF download logic remains the same)
  };

  const handleDownloadHTML = () => {
    // ... (HTML download logic remains the same)
  };
  
  const StatusIcon = () => {
    if (job.status === 'COMPLETED') return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    if (job.status === 'FAILED') return <AlertTriangleIcon className="w-5 h-5 text-red-400" />;
    return <div className="w-4 h-4 bg-indigo-500 rounded-full animate-spin"></div>;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 transition-all hover:border-indigo-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-indigo-400">{job.manuscriptName}</h3>
          <p className="text-sm text-gray-400">
            Reviewed by "{job.apiKeyName}" as {job.journalLevel} on {new Date(job.createdAt).toLocaleDateString()}
          </p>
           <div className="flex items-center gap-2 mt-1 text-sm text-gray-300">
            <StatusIcon />
            <span>Status: {job.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadHTML} className="p-2 bg-gray-700 hover:bg-indigo-600 rounded-md transition-colors" title="Download HTML" disabled={job.status !== 'COMPLETED'}><DownloadIcon className="w-5 h-5" /></button>
          <button onClick={handleDownloadPDF} className="p-2 bg-gray-700 hover:bg-indigo-600 rounded-md transition-colors" title="Download PDF" disabled={job.status !== 'COMPLETED'}><DownloadIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {job.status === 'RUNNING' && (
         <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{width: `${progress}%`}}></div>
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">Review in progress ({Math.round(progress)}%)... You can safely leave this page.</p>
        </div>
      )}

      {job.status === 'COMPLETED' && job.result && (
        <>
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="font-semibold text-gray-200 mb-2">Review Summary:</h4>
          <details>
            <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">Click to view full report</summary>
            <p className="mt-2 text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto p-2 bg-gray-900 rounded-md">{job.result.report}</p>
          </details>

          {job.result.sources && job.result.sources.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-gray-200 mb-2">Sources:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {job.result.sources.map((source, index) => source.web && (
                  <a key={index} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-400 hover:underline truncate bg-gray-900 p-2 rounded-md">
                    {source.web.title || source.web.uri}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <ChatFollowUp 
          job={job} 
          setJobs={setJobs} 
          apiKey={apiKeys.find(k => k.id === job.apiKeyId)}
        />
        </>
      )}

      {job.status === 'FAILED' && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="font-semibold text-red-400 mb-2">Review Failed</h4>
          <p className="text-red-300 bg-red-900/50 p-3 rounded-md text-sm">{job.error || 'An unknown error occurred.'}</p>
        </div>
      )}
    </div>
  );
};

export default ReviewReport;
