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
  maxFiles = 2, // Updated to match Farcaster limitation
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  maxSizePerFile = 10 * 1024 * 1024, // 10MB
  className = ''
}: MediaUploadProps) {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Check total file count
    if (uploadedFiles.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed (Farcaster limitation). Currently have ${uploadedFiles.length}.`);
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
      {/* Upload Button - Matching Date/Time styling */}
      <div
        className={`
          relative cursor-pointer transition-all duration-200
          ${isDragging 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : ''
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={openFileDialog}
          disabled={uploading || uploadedFiles.length >= maxFiles}
          style={{ 
            backgroundColor: '#374151 !important', 
            color: '#ffffff !important', 
            borderColor: '#4b5563 !important', 
            fontSize: '16px', 
            minHeight: '48px' 
          }}
          className={`
            w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white 
            focus:ring-2 focus:ring-purple-500 focus:border-transparent box-border
            flex items-center justify-center space-x-2 transition-colors
            ${uploading || uploadedFiles.length >= maxFiles
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-600 active:bg-gray-500'
            }
          `}
        >
          {uploading ? (
            <>
              <span className="animate-spin">⚡</span>
              <span>Uploading...</span>
            </>
          ) : uploadedFiles.length >= maxFiles ? (
            <>
              <span>📎</span>
              <span>Maximum {maxFiles} files reached</span>
            </>
          ) : (
            <>
              <span>📎</span>
              <span>Click or drag files to upload</span>
            </>
          )}
        </button>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <div className="text-blue-600 dark:text-blue-400 font-medium">
              📤 Drop files here
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        Images & videos • Max {Math.round(maxSizePerFile / (1024 * 1024))}MB each • {maxFiles} files max • Supported: JPEG, PNG, GIF, WebP, MP4, WebM
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <div className="text-red-200 text-sm space-y-1">
            {errors.map((error, index) => (
              <div key={index}>❌ {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files Preview - Compact mobile-friendly design */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-300">
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
              >
                {/* File Preview - Properly sized for mobile */}
                <div className="aspect-square w-full bg-gray-800 flex items-center justify-center relative">
                  {file.type === 'image' ? (
                    <>
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<span class="text-2xl">🖼️</span>';
                          }
                        }}
                      />
                      {/* Remove button overlay */}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl">{getFileTypeIcon(file.type)}</span>
                      {/* Remove button overlay */}
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>

                {/* File Info - Compact */}
                <div className="p-2 bg-gray-700">
                  <div className="text-xs font-medium text-gray-200 truncate">
                    {file.filename.length > 15 ? `${file.filename.substring(0, 12)}...` : file.filename}
                  </div>
                  <div className="text-xs text-gray-400">
                    {file.format.toUpperCase()} • {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Impact Notice */}
      {uploadedFiles.length > 0 && (
        <div className="text-xs text-gray-400 bg-blue-900/20 p-2 rounded border border-blue-800">
          💡 Media files reduce available text space. Each file uses ~23 characters for the embed.
        </div>
      )}
    </div>
  );
} 