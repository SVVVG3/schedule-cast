/**
 * TypeScript type definitions for Neynar API
 */

export interface NeynarSigner {
  signer_uuid: string;
  public_key: string;
  status: string;
  signer_approval_url?: string;
  fid: number;
}

export interface NeynarCastResponse {
  cast: {
    hash: string;
    thread_hash: string;
    parent_hash?: string;
    parent_url?: string;
    root_parent_url?: string;
    parent_author?: {
      fid: number;
    };
    author: {
      fid: number;
    };
    text: string;
    timestamp: string;
    embeds?: any[];
    reactions: {
      likes: number;
      recasts: number;
    };
    replies: {
      count: number;
    };
    mentioned_profiles?: any[];
    viewer_context?: any;
  };
} 