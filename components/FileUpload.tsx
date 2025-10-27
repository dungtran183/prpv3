
import React, { useState, useCallback } from 'react';
import type { UploadFile } from '../types';
import { UploadCloudIcon, FileIcon, XIcon } from './icons';

interface FileUploadProps {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  maxFiles?: number;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // remove the "data:mime/type;base64," part
    };
    reader.onerror = error => reject(error);
  });
};

const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles, maxFiles = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setError(null);
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Cannot upload more than ${maxFiles} files in total.`);
      return;
    }

    const newUploadFiles: UploadFile[] = [];
    for (const file of Array.from(selectedFiles)) {
      try {
        const base64 = await fileToBase64(file);
        newUploadFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          base64,
        });
      } catch (err) {
        console.error("Error converting file to base64", err);
        setError(`Failed to process file: ${file.name}`);
      }
    }

    setFiles(prev => [...prev, ...newUploadFiles]);
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
        }`}
      >
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-400">
          <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">Up to {maxFiles} files. DOCX, PDF, HTML, or images.</p>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
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

   