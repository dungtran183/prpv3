import React, { useState } from 'react';
import { User, ApiKey, ReviewJob, ReviewStatus, UploadFile } from '../types';
import { generateReview } from '../services/geminiService';
import FileUpload from './FileUpload';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

interface NewReviewFormProps {
    user: User;
    apiKeys: ApiKey[];
}

const NewReviewForm: React.FC<NewReviewFormProps> = ({ user, apiKeys }) => {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [journalLevel, setJournalLevel] = useState('Q1 journal');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const PROMPT_TEMPLATE = `You're a [JOURNAL_LEVEL]'s reviewer in the field matching the content of the attached manuscript (attached files). Please read the attached manuscript carefully and research with other related approaches to make a comprehensive review of the paper. Make a comprehensive comparison between the proposed method or architechture and other state-of-the-art methods to the best of your knowledge and rate the paper on a scale of 100 points. Suggest a decision for the author and the editor. Suggest improvements if needed in: Novelty, Contribution, Technical Soundness, Methodology, Empirical Rigor and Evaluation (Sharpness and level of analysis, how well results are maintained,...), Presentation and Clarity (Clarity and effectiveness of slides, flow, and delivery, Logical flow and proper formatting of the presentation, Proper use and quality of references, extra references or missing important references, quality of writing, easy to follow, story telling, typo, grammar errors ...). Respond in Vietnamese.`;

    const processJobWithProgress = async (jobId: string, jobData: Omit<ReviewJob, 'id'>, prompt: string) => {
      try {
        const apiKey = apiKeys.find(k => k.id === jobData.apiKeyId)?.key;
        if (!apiKey) {
          throw new Error('API Key not found for this job.');
        }

        const jobDocRef = doc(db, 'reviewJobs', jobId);

        const updateJobState = async (status: ReviewStatus, progressState: string, progressPercentage: number) => {
            await updateDoc(jobDocRef, { status, progressState, progressPercentage });
        };
        
        // --- Start of Progress Simulation ---
        await updateJobState(ReviewStatus.RUNNING, 'Initializing...', 10);
        await delay(500);

        await updateJobState(ReviewStatus.RUNNING, 'Uploading Files...', 25);
        await delay(500);

        await updateJobState(ReviewStatus.RUNNING, 'Analyzing Content & Searching Web...', 50);
        const result = await generateReview(prompt, jobData.files, apiKey);
        
        await updateJobState(ReviewStatus.RUNNING, 'Generating Report...', 90);
        await delay(1000);
        // --- End of Progress Simulation ---

        await updateDoc(jobDocRef, {
            status: ReviewStatus.COMPLETED,
            result,
            progressState: 'Completed',
            progressPercentage: 100
        });

      } catch (err: any) {
         await updateDoc(doc(db, 'reviewJobs', jobId), {
            status: ReviewStatus.FAILED,
            error: err.message || 'An unknown error occurred.',
            progressState: 'Failed',
            progressPercentage: 0
        });
      }
    };

    const handleStartReview = async () => {
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

        const jobCreationPromises = apiKeys.map(async (apiKey) => {
            const newJobData: Omit<ReviewJob, 'id'> = {
                userId: user.uid,
                apiKeyId: apiKey.id,
                apiKeyName: apiKey.name,
                manuscriptName,
                journalLevel,
                status: ReviewStatus.PENDING,
                createdAt: new Date().toISOString(), // serverTimestamp() is better for consistency
                files: files,
                chatHistory: [],
                progressState: 'Queued',
                progressPercentage: 0,
            };
            const docRef = await addDoc(collection(db, 'reviewJobs'), newJobData);
            return { jobId: docRef.id, jobData: newJobData };
        });
        
        try {
            const createdJobs = await Promise.all(jobCreationPromises);
            setFiles([]); // Clear files for the next submission
            
            // Start processing each job asynchronously
            createdJobs.forEach(({ jobId, jobData }) => {
                processJobWithProgress(jobId, jobData, prompt);
            });

        } catch (err) {
            console.error("Error creating jobs:", err);
            setError("Could not create review jobs. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
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
                    disabled={files.length === 0 || apiKeys.length === 0 || isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Starting...' : `Start ${apiKeys.length} Parallel Review(s)`}
                </button>
            </div>
        </div>
    );
};

export default NewReviewForm;