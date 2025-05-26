import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateUser } from '@/lib/auth';
import { 
  validateFiles, 
  getMediaType, 
  getFileExtension, 
  generateStoragePath,
  type MediaFile 
} from '@/lib/media-validation';

export async function POST(request: NextRequest) {
  try {
    console.log('[upload] Processing file upload request');

    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const user = authResult.user;
    console.log('[upload] Authenticated user:', user.fid);

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate files using validation utility
    const validation = validateFiles(files);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'File validation failed', 
          details: validation.errors.map(e => e.message),
          warnings: validation.warnings 
        },
        { status: 400 }
      );
    }

    // Upload files to Supabase Storage
    const uploadedFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Generate unique file path using utility
        const storagePath = generateStoragePath(user.fid, file.name, i);

        console.log('[upload] Uploading file to storage:', storagePath);

        // Convert File to ArrayBuffer for Supabase
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('scheduled-cast-media')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error('[upload] Supabase upload error:', uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('scheduled-cast-media')
          .getPublicUrl(storagePath);

        // Create uploaded file object
        const uploadedFile: MediaFile = {
          id: crypto.randomUUID(),
          url: urlData.publicUrl,
          type: getMediaType(file.type),
          format: getFileExtension(file.name),
          size: file.size,
          filename: file.name,
          storage_path: storagePath
        };

        uploadedFiles.push(uploadedFile);
        console.log('[upload] Successfully uploaded file:', uploadedFile.id);

      } catch (error) {
        console.error('[upload] Error uploading file:', file.name, error);
        console.error('[upload] File details:', {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        });
        
        // Clean up any already uploaded files
        for (const uploaded of uploadedFiles) {
          await supabase.storage
            .from('scheduled-cast-media')
            .remove([uploaded.storage_path]);
        }
        
        return NextResponse.json(
          { error: `Failed to upload file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    console.log('[upload] All files uploaded successfully:', uploadedFiles.length);

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`
    });

  } catch (error) {
    console.error('[upload] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Upload failed due to server error' },
      { status: 500 }
    );
  }
}

// Helper functions are now imported from media-validation utility 