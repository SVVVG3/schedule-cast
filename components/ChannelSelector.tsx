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
  const [loading, setLoading] = useState(false); // Start with false - only load when user searches or expands
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelType, setChannelType] = useState<'followed' | 'active'>('followed');
  const [isExpanded, setIsExpanded] = useState(false); // Track if user wants to see channels

  // Fetch channels when user searches or expands
  useEffect(() => {
    if (!userFid) return;
    
    // Only fetch if user has searched, expanded, or changed channel type
    if (!isExpanded && !searchTerm.trim()) return;

    const fetchChannels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/channels?fid=${userFid}&limit=${limit}&type=${channelType}`);
        const data: ChannelsResponse = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch channels');
        }
        
        setChannels(data.channels || []);
      } catch (err) {
        console.error('Failed to fetch channels:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [userFid, limit, channelType, isExpanded, searchTerm]);

  // Filter channels based on search term
  const filteredChannels = useMemo(() => {
    if (!searchTerm) return channels;
    
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (channel.description && channel.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channels, searchTerm]);

  // Handle channel selection
  const handleChannelClick = (channelId: string | null) => {
    console.log('Channel selected:', channelId); // Debug logging
    onChannelSelect(channelId);
  };

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim() && !isExpanded) {
      setIsExpanded(true); // Expand to load channels when user starts typing
    }
  };

  // Handle expanding to show all channels
  const handleShowChannels = () => {
    setIsExpanded(true);
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

  // Debug logging
  console.log('ChannelSelector render:', { selectedChannelId, channelsLength: channels.length, isExpanded, searchTerm });

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Channel Type Toggle */}
      <div className="flex items-center space-x-1 text-xs">
        <button
          onClick={() => setChannelType('followed')}
          className={`px-2 py-1 rounded text-xs ${
            channelType === 'followed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setChannelType('active')}
          className={`px-2 py-1 rounded text-xs ${
            channelType === 'active'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active In
        </button>
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            placeholder="Type to search channels..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* No Channel Option */}
      <button
        onClick={() => handleChannelClick(null)}
        className={`w-full flex items-center space-x-2 p-2 rounded-lg border-2 transition-all ${
          selectedChannelId === null || selectedChannelId === ''
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
        }`}
      >
        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded flex items-center justify-center text-white text-xs">
          📢
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900">Main Feed</div>
        </div>
        {(selectedChannelId === null || selectedChannelId === '') && (
          <div className="text-blue-500 text-sm">✓</div>
        )}
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
              className={`w-full flex items-center space-x-2 p-2 rounded-lg border-2 transition-all ${
                selectedChannelId === channel.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              {/* Channel Image */}
              <div className="w-6 h-6 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                {channel.image_url ? (
                  <img
                    src={channel.image_url}
                    alt={channel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-xs font-bold">#{channel.name.charAt(0).toUpperCase()}</div>
                )}
              </div>

              {/* Channel Info - Single line only */}
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  /{channel.name}
                </div>
              </div>

              {/* Selected Indicator */}
              {selectedChannelId === channel.id && (
                <div className="text-blue-500 text-sm flex-shrink-0">✓</div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Channel Count */}
      {(isExpanded || searchTerm) && (
        <div className="text-xs text-gray-500 text-center">
          {searchTerm 
            ? `Found ${filteredChannels.length} matching channels`
            : `Showing ${filteredChannels.length} of ${channels.length} channels`
          }
        </div>
      )}
    </div>
  );
} 