'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

export interface UploadedFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  format: string;
  size: number;
  filename: string;
  storage_path: string;
}

interface MediaUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizePerFile?: number;
  className?: string;
}

export default function MediaUpload({
  onFilesChange,
  maxFiles = 4,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  maxSizePerFile = 10 * 1024 * 1024, // 10MB
  className = ''
}: MediaUploadProps) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Check total file count
    if (uploadedFiles.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed. Currently have ${uploadedFiles.length}.`);
      return { valid, errors };
    }

    for (const file of files) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type. Allowed: images and videos.`);
        continue;
      }

      // Check file size
      if (file.size > maxSizePerFile) {
        const maxSizeMB = Math.round(maxSizePerFile / (1024 * 1024));
        errors.push(`${file.name}: File too large. Maximum ${maxSizeMB}MB allowed.`);
        continue;
      }

      valid.push(file);
    }

    return { valid, errors };
  }, [uploadedFiles.length, maxFiles, acceptedTypes, maxSizePerFile]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!user?.fid) {
      setErrors(['Please sign in to upload files']);
      return;
    }
    
    console.log('[MediaUpload] Starting upload with user FID:', user.fid);

    const { valid, errors: validationErrors } = validateFiles(files);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (valid.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      const formData = new FormData();
      valid.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/upload?fid=${user.fid}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success && result.files) {
        const newFiles = [...uploadedFiles, ...result.files];
        setUploadedFiles(newFiles);
        onFilesChange(newFiles);
      } else {
        throw new Error('Invalid response from upload endpoint');
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Upload failed');
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [user?.fid, validateFiles, uploadedFiles, onFilesChange]);

  const removeFile = useCallback((fileId: string) => {
    const newFiles = uploadedFiles.filter(file => file.id !== fileId);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  }, [uploadedFiles, onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFiles]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="text-blue-600 dark:text-blue-400">📤 Uploading...</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Please wait</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-gray-600 dark:text-gray-400">
              {isDragging ? '📤 Drop files here' : '📎 Click or drag files to upload'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Images & videos • Max {Math.round(maxSizePerFile / (1024 * 1024))}MB each • {maxFiles} files max
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-600">
              Supported: JPEG, PNG, GIF, WebP, MP4, WebM
            </div>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="text-red-800 dark:text-red-200 text-sm space-y-1">
            {errors.map((error, index) => (
              <div key={index}>❌ {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* File Preview */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const sibling = target.nextElementSibling as HTMLElement;
                        if (sibling) {
                          sibling.style.display = 'block';
                        }
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{getFileTypeIcon(file.type)}</span>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.filename}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {file.format.toUpperCase()} • {formatFileSize(file.size)}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Impact Notice */}
      {uploadedFiles.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          💡 Media files reduce available text space. Each file uses ~23 characters for the embed.
        </div>
      )}
    </div>
  );
} 