'use client';

import { useState, useEffect, useMemo } from 'react';
import { Channel, ChannelsResponse, ChannelSelectorProps } from '@/types/channel';

export default function ChannelSelector({
  selectedChannelId,
  onChannelSelect,
  userFid,
  className = '',
  limit = 100, // Maximum allowed by Neynar API
  showSearch = true
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoadedChannels, setHasLoadedChannels] = useState(false);

  // Find selected channel for display
  const selectedChannel = channels.find(ch => ch.id === selectedChannelId);

  // Fetch channels only once when expanded or searched
  useEffect(() => {
    if (!userFid || hasLoadedChannels) return;
    
    // Only fetch if user has expanded or started searching
    if (!isExpanded && !searchTerm.trim()) return;

    const fetchChannels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/channels?fid=${userFid}&limit=${limit}&type=followed`);
        const data: ChannelsResponse = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch channels');
        }
        
        setChannels(data.channels || []);
        setHasLoadedChannels(true);
      } catch (err) {
        console.error('Failed to fetch channels:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [userFid, limit, isExpanded, searchTerm, hasLoadedChannels]);

  // Filter channels based on search term (client-side only)
  const filteredChannels = useMemo(() => {
    if (!searchTerm.trim()) return channels;
    
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channels, searchTerm]);

  // Handle channel selection
  const handleChannelClick = (channelId: string | null) => {
    console.log('Channel selected:', channelId);
    onChannelSelect(channelId);
    // After selection, collapse the list for cleaner UX
    setIsExpanded(false);
    setSearchTerm('');
  };

  // Handle search input changes (no API calls, just filtering)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim() && !isExpanded) {
      setIsExpanded(true); // Expand to show channels when user starts typing
    }
  };

  // Handle expanding to show all channels
  const handleShowChannels = () => {
    setIsExpanded(true);
  };

  // Handle clearing selection
  const handleClearSelection = () => {
    onChannelSelect(null);
    setIsExpanded(false);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          <div className="text-sm text-gray-500">Loading channels...</div>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <div className="text-sm">⚠️ Failed to load channels: {error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // If a channel is selected, show compact selected state
  if (selectedChannelId && selectedChannel) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-xs text-gray-600 font-medium">Selected Channel:</div>
        <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-500 rounded-lg">
          <div className="flex items-center space-x-3">
            {/* Uniform circular image */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
              {selectedChannel.image_url ? (
                <img
                  src={selectedChannel.image_url}
                  alt={selectedChannel.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-500 text-sm font-bold">
                  #{selectedChannel.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">/{selectedChannel.name}</div>
              <div className="text-xs text-gray-500">
                {selectedChannel.follower_count?.toLocaleString()} followers
              </div>
            </div>
          </div>
          <button
            onClick={handleClearSelection}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // If main feed is selected, show compact selected state
  if (selectedChannelId === null || selectedChannelId === '') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="text-xs text-gray-600 font-medium">Selected Channel:</div>
        <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-500 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
              📢
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Main Feed</div>
              <div className="text-xs text-gray-500">Post to your main timeline</div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // Selection interface
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search channels or browse below..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Main Feed Option */}
      <button
        onClick={() => handleChannelClick(null)}
        className="w-full flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-all"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
          📢
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">Main Feed</div>
          <div className="text-xs text-gray-500">Post to your main timeline</div>
        </div>
      </button>

      {/* Channel List */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {!isExpanded && !searchTerm ? (
          <div className="text-center py-4">
            <button
              onClick={handleShowChannels}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Browse your channels ({limit} max)
            </button>
          </div>
        ) : filteredChannels.length === 0 && !loading ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {searchTerm ? 'No channels match your search' : 'No channels found'}
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel.id)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              {/* Uniform circular image */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                {channel.image_url ? (
                  <img
                    src={channel.image_url}
                    alt={channel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-sm font-bold">
                    #{channel.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Channel Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  /{channel.name}
                </div>
                <div className="text-xs text-gray-500">
                  {channel.follower_count?.toLocaleString()} followers
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Channel Count */}
      {(isExpanded || searchTerm) && filteredChannels.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {searchTerm 
            ? `Found ${filteredChannels.length} matching channels`
            : `Showing ${filteredChannels.length} channels`
          }
        </div>
      )}
    </div>
  );
} 