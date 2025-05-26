export const MEDIA_LIMITS = {
  maxFiles: 4,
  maxSizePerFile: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 25 * 1024 * 1024, // 25MB
  supportedTypes: {
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    videos: ['mp4', 'webm']
  },
  maxVideoDuration: 60, // seconds
  maxImageDimensions: { width: 1920, height: 1080 }
};

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm'
];

export interface MediaFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  format: string;
  size: number;
  filename: string;
  storage_path: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

/**
 * Validates a single file for media upload
 */
export function validateFile(file: File, index: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check file size
  if (file.size > MEDIA_LIMITS.maxSizePerFile) {
    errors.push({
      field: `file_${index}`,
      message: `File "${file.name}" exceeds the 10MB size limit (${formatFileSize(file.size)})`
    });
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    errors.push({
      field: `file_${index}`,
      message: `File "${file.name}" has unsupported type: ${file.type}`
    });
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  const allSupportedExtensions = [
    ...MEDIA_LIMITS.supportedTypes.images,
    ...MEDIA_LIMITS.supportedTypes.videos
  ];
  
  if (!allSupportedExtensions.includes(extension)) {
    errors.push({
      field: `file_${index}`,
      message: `File "${file.name}" has unsupported extension: .${extension}`
    });
  }

  // File name validation
  if (file.name.length > 100) {
    warnings.push(`File "${file.name}" has a very long filename`);
  }

  // Empty file check
  if (file.size === 0) {
    errors.push({
      field: `file_${index}`,
      message: `File "${file.name}" is empty`
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates an array of files for media upload
 */
export function validateFiles(files: File[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check file count
  if (files.length === 0) {
    errors.push({
      field: 'files',
      message: 'At least one file is required'
    });
    return { isValid: false, errors };
  }

  if (files.length > MEDIA_LIMITS.maxFiles) {
    errors.push({
      field: 'files',
      message: `Maximum ${MEDIA_LIMITS.maxFiles} files allowed, but ${files.length} files provided`
    });
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MEDIA_LIMITS.maxTotalSize) {
    errors.push({
      field: 'files',
      message: `Total file size exceeds 25MB limit (${formatFileSize(totalSize)})`
    });
  }

  // Validate each file individually
  files.forEach((file, index) => {
    const fileValidation = validateFile(file, index);
    errors.push(...fileValidation.errors);
    warnings.push(...(fileValidation.warnings || []));
  });

  // Check for duplicate filenames
  const filenames = files.map(f => f.name.toLowerCase());
  const duplicates = filenames.filter((name, index) => filenames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate filenames detected: ${duplicates.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Determines the media type from MIME type
 */
export function getMediaType(mimeType: string): 'image' | 'video' | 'gif' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'image/gif') return 'gif';
  return 'image';
}

/**
 * Extracts file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || 'unknown';
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates a unique storage path for a file
 */
export function generateStoragePath(userFid: number, filename: string, index: number = 0): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = getFileExtension(filename);
  const baseName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize filename
  
  return `${userFid}/${timestamp}-${index}-${sanitizedBaseName}.${extension}`;
}

/**
 * Validates if a URL points to a supported media file
 */
export function isValidMediaUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const allExtensions = [
      ...MEDIA_LIMITS.supportedTypes.images,
      ...MEDIA_LIMITS.supportedTypes.videos
    ];
    
    return allExtensions.some(ext => pathname.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

/**
 * Estimates character count impact of media files for Farcaster cast limits
 */
export function estimateMediaCharacterImpact(mediaFiles: MediaFile[]): number {
  // Each media file typically consumes some character space in a cast
  // This is an estimation - actual impact may vary
  return mediaFiles.length * 23; // Approximate URL length impact
} 