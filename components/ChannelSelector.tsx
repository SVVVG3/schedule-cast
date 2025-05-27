'use client';

import { useState, useEffect, useMemo } from 'react';
import { Channel, ChannelsResponse, ChannelSelectorProps } from '@/types/channel';

// Nuclear CSS to override all styling - MAXIMUM FORCE
const buttonStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  borderColor: '#4b5563', 
  color: '#ffffff',
  background: '#374151',
  backgroundImage: 'none',
  backgroundClip: 'border-box',
  border: '1px solid #4b5563',
  minHeight: '56px',
  padding: '16px',
  borderRadius: '8px',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'all 0.2s ease',
  boxSizing: 'border-box',
  outline: 'none',
  // Nuclear overrides - remove !important as it doesn't work in inline styles
  // Instead use multiple properties to force the styling
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none'
};

const hoverStyle: React.CSSProperties = {
  backgroundColor: '#4b5563',
  borderColor: '#6b7280',
  background: '#4b5563'
};

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

  // Preload channels immediately when component mounts (if user is authenticated)
  useEffect(() => {
    if (!userFid || hasLoadedChannels) return;

    // Load channels in background immediately - no UI disruption
    const preloadChannels = async () => {
      try {
        let allChannels: Channel[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        
        // Fetch ALL user channels using pagination
        while (hasMore) {
          const url = new URL('/api/channels', window.location.origin);
          url.searchParams.set('fid', userFid.toString());
          url.searchParams.set('limit', '100'); // Maximum per request
          url.searchParams.set('type', 'followed');
          if (cursor) {
            url.searchParams.set('cursor', cursor);
          }
          
          const response = await fetch(url.toString());
          const data: ChannelsResponse = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch channels');
          }
          
          // Add channels to our collection
          allChannels = [...allChannels, ...(data.channels || [])];
          
          // Check if there's more data
          cursor = data.next?.cursor || null;
          hasMore = !!cursor;
        }
        
        console.log(`Preloaded ${allChannels.length} total channels in background`);
        setChannels(allChannels);
        setHasLoadedChannels(true);
      } catch (err) {
        console.error('Failed to preload channels:', err);
        setError((err as Error).message);
      }
    };

    // Start preloading immediately in background
    preloadChannels();
  }, [userFid, hasLoadedChannels]);

  // Filter and sort channels based on search term - show only top 10 relevant results
  const filteredChannels = useMemo(() => {
    if (!searchTerm.trim()) {
      // Don't show any channels when no search term
      return [];
    }
    
    const query = searchTerm.toLowerCase();
    
    // Categorize matches by relevance
    const exactMatches = channels.filter(channel =>
      channel.name.toLowerCase() === query
    );
    
    const startsWithMatches = channels.filter(channel =>
      channel.name.toLowerCase().startsWith(query) && 
      channel.name.toLowerCase() !== query // Exclude exact matches already included
    );
    
    const containsMatches = channels.filter(channel =>
      channel.name.toLowerCase().includes(query) &&
      !channel.name.toLowerCase().startsWith(query) // Exclude already included matches
    );
    
    // Combine in order of relevance: exact → starts with → contains
    // Limit to top 10 results for better UX
    const relevantResults = [
      ...exactMatches,
      ...startsWithMatches.sort((a, b) => a.name.localeCompare(b.name)),
      ...containsMatches.sort((a, b) => a.name.localeCompare(b.name))
    ].slice(0, 10);
    
    return relevantResults;
  }, [channels, searchTerm]);

  // Handle channel selection
  const handleChannelClick = (channelId: string | null) => {
    console.log('Channel selected:', channelId);
    onChannelSelect(channelId);
    // Don't clear search term immediately - let user see their selection
    setIsExpanded(false);
    // Clear search term after a short delay to show selection feedback
    setTimeout(() => {
      setSearchTerm('');
    }, 100);
  };

  // Handle search input changes (no API calls, just filtering)
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Always show channels when there's a search term or when user starts typing
    setIsExpanded(true);
  };

  // Handle clearing selection
  const handleClearSelection = () => {
    onChannelSelect(null);
    setIsExpanded(false);
    setSearchTerm('');
  };

  // Remove loading state - channels are preloaded in background

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
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Selected Channel:</div>
        <div className="flex items-center justify-between p-4 bg-blue-900/30 border-2 border-blue-400 rounded-lg"
             style={{ backgroundColor: '#1e3a8a !important', borderColor: '#60a5fa !important', minHeight: '56px' }}>
          <div className="flex items-center space-x-2">
                         {/* Uniform circular image */}
             <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
               {selectedChannel.image_url ? (
                 <img
                   src={selectedChannel.image_url}
                   alt={selectedChannel.name}
                   className="w-full h-full object-cover max-w-[24px] max-h-[24px]"
                 />
               ) : (
                 <div className="text-gray-500 text-xs font-bold">
                   #{selectedChannel.name.charAt(0).toUpperCase()}
                 </div>
               )}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">/{selectedChannel.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
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
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Selected Channel:</div>
        <div className="flex items-center justify-between p-4 bg-blue-900/30 border-2 border-blue-400 rounded-lg"
             style={{ backgroundColor: '#1e3a8a !important', borderColor: '#60a5fa !important', minHeight: '56px' }}>
                     <div className="flex items-center space-x-2">
             <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm">
               📢
             </div>
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Main Feed</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Post to your main timeline</div>
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
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{ backgroundColor: '#374151 !important', color: '#ffffff !important', borderColor: '#4b5563 !important', fontSize: '16px', minHeight: '48px', maxWidth: '100%' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Main Feed Option */}
      <button
        type="button"
        onClick={() => handleChannelClick(null)}
        style={buttonStyle}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, hoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, buttonStyle);
        }}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          flexShrink: 0
        }}>
          📢
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#ffffff',
            lineHeight: '1.4'
          }}>
            Main Feed
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#d1d5db',
            lineHeight: '1.3'
          }}>
            Post to your main timeline
          </div>
        </div>
      </button>

      {/* Channel List */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {filteredChannels.length === 0 && searchTerm && (
          <div className="text-sm text-center py-4" style={{ color: '#9ca3af !important' }}>
            No channels match your search
          </div>
        )}
        {filteredChannels.length > 0 && (
          filteredChannels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => handleChannelClick(channel.id)}
              style={buttonStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, hoverStyle);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, buttonStyle);
              }}
            >
              {/* Uniform circular image */}
              <div style={{
                width: '24px',
                height: '24px',
                minWidth: '24px',
                minHeight: '24px',
                maxWidth: '24px',
                maxHeight: '24px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {channel.image_url ? (
                  <img
                    src={channel.image_url}
                    alt={channel.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      maxWidth: '24px',
                      maxHeight: '24px'
                    }}
                  />
                ) : (
                  <div style={{
                    color: '#6b7280',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    #{channel.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Channel Info */}
              <div style={{ 
                flex: 1, 
                textAlign: 'left', 
                minWidth: 0 
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#ffffff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  /{channel.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#d1d5db'
                }}>
                  {channel.follower_count?.toLocaleString()} followers
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Channel Count */}
      {filteredChannels.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {searchTerm 
            ? `Found ${filteredChannels.length} matching channels`
            : `${filteredChannels.length} total channels`
          }
        </div>
      )}
    </div>
  );
} 