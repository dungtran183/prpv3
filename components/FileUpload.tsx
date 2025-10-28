
import React, { useState, useCallback } from 'react';
import type { UploadFile } from '../types';
import { UploadCloudIcon, FileIcon, XIcon } from './icons';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface FileUploadProps {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  maxFiles?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles, maxFiles = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setError(null);
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Cannot upload more than ${maxFiles} files in total.`);
      return;
    }

    setUploading(true);

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      try {
        const storagePath = `uploads/${crypto.randomUUID()}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);

        return {
          name: file.name,
          type: file.type,
          size: file.size,
          url,
          storagePath,
        };
      } catch (err) {
        console.error("Error uploading file to Firebase Storage", err);
        setError(`Failed to upload file: ${file.name}`);
        return null; // Return null for failed uploads
      }
    });

    const newUploadFiles = (await Promise.all(uploadPromises)).filter(Boolean) as UploadFile[];
    setFiles(prev => [...prev, ...newUploadFiles]);
    setUploading(false);

  }, [files.length, maxFiles, setFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    // Note: This only removes the file from the UI state.
    // A robust implementation would also delete the file from Firebase Storage.
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 hover:border-gray-500'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-400">
            {uploading ? 'Uploading...' : 
                <><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</>
            }
        </p>
        <p className="text-xs text-gray-500">Up to {maxFiles} files. DOCX, PDF, HTML, or images.</p>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {files.length > 0 && (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Uploaded Files ({files.length}/{maxFiles}):</h3>
          <ul className="max-h-48 overflow-y-auto space-y-2 pr-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-200 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <button onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-400">
                  <XIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;