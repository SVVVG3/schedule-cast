export interface Channel {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  follower_count?: number;
  url?: string;
  parent_url?: string;
  lead?: {
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
  };
}

export interface ChannelsResponse {
  success: boolean;
  channels: Channel[];
  count: number;
  type: 'followed' | 'active';
  fid: number;
  error?: string;
}

export interface ChannelSelectorProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string | null) => void;
  userFid: number;
  className?: string;
  limit?: number;
  showSearch?: boolean;
} 