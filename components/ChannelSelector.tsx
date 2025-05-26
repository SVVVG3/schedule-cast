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

  // Fetch channels only when user searches (debounced)
  useEffect(() => {
    if (!userFid || !searchTerm.trim()) {
      setChannels([]);
      setHasLoadedChannels(false);
      return;
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(async () => {
      if (hasLoadedChannels && searchTerm.trim()) return; // Already loaded for this search session

      setLoading(true);
      setError(null);
      
      try {
        let allChannels: Channel[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        
        // Fetch ALL user channels using pagination (only when searching)
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
        
        console.log(`Loaded ${allChannels.length} total channels for search`);
        setChannels(allChannels);
        setHasLoadedChannels(true);
      } catch (err) {
        console.error('Failed to fetch channels:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [userFid, searchTerm, hasLoadedChannels]);

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
    // After selection, collapse the list for cleaner UX
    setIsExpanded(false);
    setSearchTerm('');
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
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">Selected Channel:</div>
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 rounded-lg">
          <div className="flex items-center space-x-2">
                         {/* Uniform circular image */}
             <div className="w-3 h-3 min-w-[12px] min-h-[12px] max-w-[12px] max-h-[12px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
               {selectedChannel.image_url ? (
                 <img
                   src={selectedChannel.image_url}
                   alt={selectedChannel.name}
                   className="w-full h-full object-cover max-w-[12px] max-h-[12px]"
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
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 rounded-lg">
                     <div className="flex items-center space-x-2">
             <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
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
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
        className="w-full flex items-center space-x-2 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
      >
                 <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
           📢
         </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-white">Main Feed</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Post to your main timeline</div>
        </div>
      </button>

      {/* Channel List */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {filteredChannels.length === 0 && !loading ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {searchTerm ? 'No channels match your search' : 'No channels found'}
          </div>
        ) : (
          filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel.id)}
              className="w-full flex items-center space-x-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
                             {/* Uniform circular image */}
               <div className="w-3 h-3 min-w-[12px] min-h-[12px] max-w-[12px] max-h-[12px] rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                 {channel.image_url ? (
                   <img
                     src={channel.image_url}
                     alt={channel.name}
                     className="w-full h-full object-cover max-w-[12px] max-h-[12px]"
                   />
                 ) : (
                   <div className="text-gray-500 text-xs font-bold">
                     #{channel.name.charAt(0).toUpperCase()}
                   </div>
                 )}
               </div>

              {/* Channel Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  /{channel.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
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