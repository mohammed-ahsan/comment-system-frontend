import io from 'socket.io-client';
import { Comment } from './api';

interface SocketType {
  connected: boolean;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (data?: unknown) => void) => void;
  off: (event: string, callback?: (data?: unknown) => void) => void;
  disconnect: () => void;
  removeAllListeners: () => void;
}

interface CommentReactionData {
  commentId: string;
  type: 'like' | 'dislike' | 'remove';
  likeCount: number;
  dislikeCount: number;
  userId: string;
}

interface UserTypingData {
  username: string;
}

class SocketService {
  private socket: SocketType | null = null;
  private readonly SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(this.SERVER_URL, {
      auth: {
        token,
      },
    }) as SocketType;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('joinComments');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect_error', (error: unknown) => {
      console.error('Connection error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('leaveComments');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  onNewComment(callback: (data: { comment: Comment; totalCount?: number }) => void): void {
    this.socket?.on('newComment', (data: unknown) => {
      callback(data as { comment: Comment; totalCount?: number });
    });
  }

  onNewReply(callback: (comment: Comment) => void): void {
    this.socket?.on('newReply', (data: unknown) => {
      callback(data as Comment);
    });
  }

  onCommentUpdated(callback: (comment: Comment) => void): void {
    this.socket?.on('commentUpdated', (data: unknown) => {
      callback(data as Comment);
    });
  }

  onCommentDeleted(callback: (data: { id: string; totalCount?: number }) => void): void {
    this.socket?.on('commentDeleted', (data: unknown) => {
      callback(data as { id: string; totalCount?: number });
    });
  }

  onReplyUpdated(callback: (comment: Comment) => void): void {
    this.socket?.on('replyUpdated', (data: unknown) => {
      callback(data as Comment);
    });
  }

  onReplyDeleted(callback: (commentId: string) => void): void {
    this.socket?.on('replyDeleted', (data: unknown) => {
      callback((data as { id: string }).id);
    });
  }

  onCommentReaction(callback: (data: CommentReactionData) => void): void {
    this.socket?.on('commentReaction', (data: unknown) => {
      callback(data as CommentReactionData);
    });
  }

  onReplyReaction(callback: (data: CommentReactionData) => void): void {
    this.socket?.on('replyReaction', (data: unknown) => {
      callback(data as CommentReactionData);
    });
  }

  onCommentLiked(callback: (data: CommentReactionData) => void): void {
    this.socket?.on('commentLiked', (data: unknown) => {
      callback(data as CommentReactionData);
    });
  }

  onCommentDisliked(callback: (data: CommentReactionData) => void): void {
    this.socket?.on('commentDisliked', (data: unknown) => {
      callback(data as CommentReactionData);
    });
  }

  onUserTyping(callback: (data: UserTypingData) => void): void {
    this.socket?.on('userTyping', (data: unknown) => {
      callback(data as UserTypingData);
    });
  }

  onUserStopTyping(callback: (data: UserTypingData) => void): void {
    this.socket?.on('userStopTyping', (data: unknown) => {
      callback(data as UserTypingData);
    });
  }

  // Event emitters
  emitTyping(username: string): void {
    this.socket?.emit('typing', { username });
  }

  emitStopTyping(username: string): void {
    this.socket?.emit('stopTyping', { username });
  }

  // Remove event listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  // Generic socket event listener
  on(event: string, callback: (data?: unknown) => void): void {
    this.socket?.on(event, callback);
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;
