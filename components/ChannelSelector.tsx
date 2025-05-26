'use client';

import { useState, useEffect, useMemo } from 'react';
import { Channel, ChannelsResponse, ChannelSelectorProps } from '@/types/channel';

export default function ChannelSelector({
  selectedChannelId,
  onChannelSelect,
  userFid,
  className = '',
  limit = 25,
  showSearch = true
}: ChannelSelectorProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelType, setChannelType] = useState<'followed' | 'active'>('followed');

  // Fetch channels when component mounts or userFid changes
  useEffect(() => {
    if (!userFid) return;

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
  }, [userFid, limit, channelType]);

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
    onChannelSelect(channelId);
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
          <div className="text-sm text-gray-500">Loading channels...</div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
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

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Channel Type Toggle */}
      <div className="flex items-center space-x-1 text-xs">
        <button
          onClick={() => setChannelType('followed')}
          className={`px-2 py-1 rounded ${
            channelType === 'followed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Following
        </button>
        <button
          onClick={() => setChannelType('active')}
          className={`px-2 py-1 rounded ${
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
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* No Channel Option */}
      <button
        onClick={() => handleChannelClick(null)}
        className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
          selectedChannelId === null || selectedChannelId === ''
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
        }`}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
          📢
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">Main Feed</div>
          <div className="text-sm text-gray-500">Post to your main timeline</div>
        </div>
        {(selectedChannelId === null || selectedChannelId === '') && (
          <div className="text-blue-500">✓</div>
        )}
      </button>

      {/* Channel List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredChannels.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {searchTerm ? 'No channels match your search' : 'No channels found'}
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                selectedChannelId === channel.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Channel Image */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
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

              {/* Channel Info */}
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">
                  /{channel.name}
                </div>
                {channel.description && (
                  <div className="text-sm text-gray-500 truncate">
                    {channel.description}
                  </div>
                )}
                {channel.follower_count && (
                  <div className="text-xs text-gray-400">
                    {channel.follower_count.toLocaleString()} followers
                  </div>
                )}
              </div>

              {/* Selected Indicator */}
              {selectedChannelId === channel.id && (
                <div className="text-blue-500">✓</div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Channel Count */}
      <div className="text-xs text-gray-500 text-center">
        Showing {filteredChannels.length} of {channels.length} channels
      </div>
    </div>
  );
} 