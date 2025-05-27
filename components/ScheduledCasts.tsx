'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUser } from '@/lib/user-context';
import { useAuth } from '@/lib/auth-context';
import EditCastModal from './EditCastModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ScheduledCast {
  id: string;
  content: string;
  scheduled_at: string;
  channel_id: string | null;
  posted: boolean;
  posted_at: string | null;
  error: string | null;
  media_urls: string[] | null;
  media_types: string[] | null;
  has_media: boolean;
}

interface ScheduledCastsProps {
  refreshTrigger?: number; // Increment this to trigger a refresh
}

export default function ScheduledCasts({ refreshTrigger }: ScheduledCastsProps) {
  const { supabaseUser } = useUser();
  const { user: authUser } = useAuth();
  const [casts, setCasts] = useState<ScheduledCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCast, setSelectedCast] = useState<ScheduledCast | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debug modal states
  useEffect(() => {
    console.log('Modal states:', { 
      editModalOpen, 
      deleteModalOpen, 
      selectedCast: selectedCast?.id,
      isDeleting 
    });
  }, [editModalOpen, deleteModalOpen, selectedCast, isDeleting]);

  // Reusable fetchCasts function
  const fetchCasts = async () => {
    if (!supabaseUser || !authUser?.fid) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/casts?fid=${authUser.fid}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch scheduled casts');
      }

      // Filter to only show upcoming casts (not posted) and sort by scheduled_at (next one first)
      const upcomingCasts = (result.data || [])
        .filter((cast: ScheduledCast) => !cast.posted)
        .sort((a: ScheduledCast, b: ScheduledCast) => 
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );
      setCasts(upcomingCasts);
    } catch (err) {
      console.error('Error fetching casts:', err);
      setError((err as Error)?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (supabaseUser && authUser?.fid) {
      fetchCasts();
    }
  }, [supabaseUser, authUser]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && supabaseUser && authUser?.fid) {
      fetchCasts();
    }
  }, [refreshTrigger, supabaseUser, authUser]);

  // Handler functions
  const handleEditCast = (cast: ScheduledCast) => {
    console.log('handleEditCast called with cast:', cast);
    // Close any other modals first
    setDeleteModalOpen(false);
    setSelectedCast(cast);
    setEditModalOpen(true);
    console.log('Edit modal should now be open');
  };

  const handleDeleteCast = (cast: ScheduledCast) => {
    console.log('handleDeleteCast called with cast:', cast);
    // Close any other modals first
    setEditModalOpen(false);
    setSelectedCast(cast);
    setDeleteModalOpen(true);
    console.log('Delete modal should now be open');
  };

  const confirmDelete = async () => {
    if (!selectedCast || !authUser?.fid) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/casts/${selectedCast.id}?fid=${authUser.fid}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete cast');
      }

      // Remove the cast from the list
      setCasts(prev => prev.filter(cast => cast.id !== selectedCast.id));
      setDeleteModalOpen(false);
      setSelectedCast(null);
    } catch (error) {
      console.error('Error deleting cast:', error);
      setError((error as Error)?.message || 'Failed to delete cast');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    // Refresh the casts list after successful edit
    fetchCasts();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-300 text-xl">Loading your scheduled casts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 p-8 rounded-xl border border-red-700 w-full" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <p className="text-red-200 text-xl">Error: {error}</p>
      </div>
    );
  }

  if (casts.length === 0) {
    return (
      <div className="bg-gray-800 p-10 rounded-xl text-center border border-gray-700 w-full" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important', maxWidth: '1000px', margin: '0 auto' }}>
        <p className="text-gray-300 text-xl">No upcoming scheduled casts.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 w-full" style={{ backgroundColor: '#1f2937 !important', color: '#ffffff !important', borderColor: '#374151 !important', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Centered layout without bullet points - updated */}
      <h3 className="text-3xl font-semibold p-8 border-b border-gray-700 text-white text-center">Upcoming Casts</h3>
      <div className="divide-y divide-gray-700">
        {casts.map(cast => (
          <div key={cast.id} className="p-8 hover:bg-gray-750">
            <div className="flex flex-col">
              {/* Edit and Delete Buttons - Back at top with spacing above */}
              {!cast.posted && (
                <div className="flex justify-center space-x-4" style={{ paddingTop: '32px' }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Edit button clicked for cast:', cast.id);
                      handleEditCast(cast);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    type="button"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Delete button clicked for cast:', cast.id);
                      handleDeleteCast(cast);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    type="button"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}

              {/* Date and Time - Centered */}
              <div className="text-center mt-6">
                <p className="font-medium text-xl text-gray-200">
                  {format(new Date(cast.scheduled_at), 'PPP')} at {format(new Date(cast.scheduled_at), 'p')}
                </p>
              </div>

              {/* Channel - Centered, with reduced spacing from date/time (75% less) */}
              {cast.channel_id && (
                <div className="text-center -mt-3">
                  <p className="text-lg text-gray-400">
                    Channel: {cast.channel_id}
                  </p>
                </div>
              )}
              
              {/* Content - Centered, with reduced spacing from channel (25% less) */}
              <div className="text-center mt-4" style={{ marginTop: cast.channel_id ? '0.75rem' : '1.5rem' }}>
                <p className="text-white whitespace-pre-wrap text-lg leading-relaxed">{cast.content}</p>
              </div>
                
              {/* Media Preview - Centered with doubled size and spacing below */}
              {cast.has_media && cast.media_urls && cast.media_urls.length > 0 && (
                <div className="flex justify-center px-4" style={{ marginBottom: '32px' }}>
                  <div className="flex flex-wrap gap-3 justify-center max-w-full">
                    {cast.media_urls.slice(0, 2).map((url, index) => {
                      const isImage = cast.media_types?.[index]?.startsWith('image/') || 
                                     cast.media_types?.[index] === 'gif' ||
                                     url.toLowerCase().includes('.gif') ||
                                     url.toLowerCase().includes('.jpg') ||
                                     url.toLowerCase().includes('.jpeg') ||
                                     url.toLowerCase().includes('.png') ||
                                     url.toLowerCase().includes('.webp');
                      
                      return (
                        <div key={index} className="relative flex-shrink-0">
                          {isImage ? (
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-32 h-32 object-cover rounded-lg border border-gray-600"
                              style={{ 
                                maxWidth: '128px', 
                                maxHeight: '128px',
                                width: '128px',
                                height: '128px',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div 
                              className="w-32 h-32 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"
                              style={{ 
                                width: '128px',
                                height: '128px',
                                minWidth: '128px',
                                minHeight: '128px'
                              }}
                            >
                              <span className="text-4xl">🎥</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cast.media_urls.length > 2 && (
                      <div 
                        className="w-32 h-32 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"
                        style={{ 
                          width: '128px',
                          height: '128px',
                          minWidth: '128px',
                          minHeight: '128px'
                        }}
                      >
                        <span className="text-sm text-gray-300">+{cast.media_urls.length - 2}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            {cast.error && (
              <div className="mt-6 p-6 bg-red-900 text-lg text-red-200 rounded-lg border border-red-700">
                Error: {cast.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <EditCastModal
        isOpen={editModalOpen && selectedCast !== null}
        onClose={() => {
          console.log('Edit modal closing');
          setEditModalOpen(false);
          setSelectedCast(null);
        }}
        cast={selectedCast!}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen && selectedCast !== null}
        onClose={() => {
          console.log('Delete modal closing');
          setDeleteModalOpen(false);
          setSelectedCast(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        castContent={selectedCast?.content || ''}
      />
    </div>
  );
}