import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { formatCount, formatCountWithText } from '../../utils/formatCount';
import ReplyForm from './ReplyForm';
import './Comments.scss';

interface CommentItemProps {
  comment: Comment;
  onCommentUpdate?: () => void;
  onCommentDeleted?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onCommentUpdate, onCommentDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [repliesLoadedFromServer, setRepliesLoadedFromServer] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [realTimeReplies, setRealTimeReplies] = useState<Comment[]>([]);

  const { user } = useAuth();

  // Safely access comment properties with fallbacks
  const [currentComment, setCurrentComment] = useState<Comment>(() => ({
    ...comment,
    author: comment.author || { _id: '', username: 'Unknown User', avatar: undefined },
    likeCount: comment.likeCount || 0,
    dislikeCount: comment.dislikeCount || 0,
    replyCount: comment.replyCount || 0,
    isLikedByUser: comment.isLikedByUser || false,
    isDislikedByUser: comment.isDislikedByUser || false,
  }));

  // Update currentComment when prop changes
  useEffect(() => {
    setCurrentComment(prev => ({
      ...prev,
      ...comment,
      author: comment.author || prev.author,
    }));
    setEditContent(comment.content || '');
  }, [comment]);

  const isAuthor = useMemo(() => {
    return user?.id === currentComment.author?._id;
  }, [user?.id, currentComment.author]);

  const hasLiked = currentComment.isLikedByUser;
  const hasDisliked = currentComment.isDislikedByUser;

  // Optimized socket event handlers with useCallback
  const handleCommentUpdated = useCallback((updatedComment: Comment) => {
    if (updatedComment._id === currentComment._id) {
      setCurrentComment(prev => ({ ...prev, ...updatedComment }));
    }
  }, [currentComment._id]);

  const handleCommentReaction = useCallback((data: any) => {    
    if (data.commentId === currentComment._id) {
      setCurrentComment(prev => {
        const newComment = {
          ...prev,
          likeCount: data.likeCount,
          dislikeCount: data.dislikeCount,
        };

        if (data.userId === user?.id) {
          if (data.type === 'like') {
            newComment.isLikedByUser = true;
            newComment.isDislikedByUser = false;
          } else if (data.type === 'dislike') {
            newComment.isLikedByUser = false;
            newComment.isDislikedByUser = true;
          } else if (data.type === 'remove') {
            newComment.isLikedByUser = false;
            newComment.isDislikedByUser = false;
          }
        } else {

        }
        return newComment;
      });
    }
  }, [currentComment._id, user?.id]);

  const handleReplyUpdated = useCallback((updatedComment: Comment) => {
    setReplies(prev => 
      prev.map(reply => 
        reply._id === updatedComment._id ? updatedComment : reply
      )
    );
    setRealTimeReplies(prev =>
      prev.map(reply => 
        reply._id === updatedComment._id ? updatedComment : reply
      )
    );
  }, []);

  const handleReplyReaction = useCallback((data: any) => {
    // Skip if this is for the main comment, not a reply
    if (data.commentId === currentComment._id) {
      return;
    }
    
    const updateReplyReaction = (reply: Comment) => {
      if (reply._id === data.commentId) {
        const newReply = {
          ...reply,
          likeCount: data.likeCount,
          dislikeCount: data.dislikeCount,
        };

        if (data.userId === user?.id) {
          if (data.type === 'like') {
            newReply.isLikedByUser = true;
            newReply.isDislikedByUser = false;
          } else if (data.type === 'dislike') {
            newReply.isLikedByUser = false;
            newReply.isDislikedByUser = true;
          } else if (data.type === 'remove') {
            newReply.isLikedByUser = false;
            newReply.isDislikedByUser = false;
          }
        } else {
        }
        return newReply;
      }
      return reply;
    };

    setReplies(prev => prev.map(updateReplyReaction));
    setRealTimeReplies(prev => prev.map(updateReplyReaction));
  }, [user?.id, currentComment._id]);

  const handleNewReply = useCallback((newComment: Comment) => {
    if (newComment.parentComment === currentComment._id) {
      setRealTimeReplies(prev => {
        const exists = prev.some(reply => reply._id === newComment._id);
        if (!exists) {
          return [newComment, ...prev];
        }
        return prev;
      });
      // Update reply count
      setCurrentComment(prev => ({
        ...prev,
        replyCount: (prev.replyCount || 0) + 1
      }));
    }
  }, [currentComment._id]);

  const handleReplyDeleted = useCallback((commentId: string) => {
    setReplies(prev => {
      const replyToDelete = prev.find(reply => reply._id === commentId);
      if (replyToDelete) {
        // Update reply count
        setCurrentComment(prev => ({
          ...prev,
          replyCount: Math.max(0, (prev.replyCount || 0) - 1)
        }));
      }
      return prev.filter(reply => reply._id !== commentId);
    });
    setRealTimeReplies(prev => {
      const replyToDelete = prev.find(reply => reply._id === commentId);
      if (replyToDelete) {
        // Update reply count
        setCurrentComment(prev => ({
          ...prev,
          replyCount: Math.max(0, (prev.replyCount || 0) - 1)
        }));
      }
      return prev.filter(reply => reply._id !== commentId);
    });
  }, []);

  const handleMainCommentDeleted = useCallback((data: { id: string; totalCount?: number }) => {
    // This handler is for when the main comment (this comment) is deleted
    // We don't need to do anything here since the parent component will handle it
    // But we need this handler to satisfy the socket service interface
  }, []);

  useEffect(() => {
    socketService.onCommentUpdated(handleCommentUpdated);
    socketService.onCommentReaction(handleCommentReaction);
    socketService.onCommentDeleted(handleMainCommentDeleted);
    
    socketService.onNewReply(handleNewReply);
    socketService.onReplyUpdated(handleReplyUpdated);
    socketService.onReplyDeleted(handleReplyDeleted);
    socketService.onReplyReaction(handleReplyReaction);

    return () => {
    };
  }, [handleCommentUpdated, handleCommentReaction, handleNewReply, handleReplyDeleted, handleReplyUpdated, handleReplyReaction, handleMainCommentDeleted]);

  // Optimized reaction handlers with loading states
  const handleLike = useCallback(async () => {
    if (isLiking || isDisliking) return;
    
    try {
      setError(null);
      setIsLiking(true);
      
      if (hasLiked) {
        await commentsAPI.removeReaction(currentComment._id);
      } else {
        await commentsAPI.likeComment(currentComment._id);
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reaction';
      setError(errorMessage);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, isDisliking, hasLiked, currentComment._id]);

  const handleDislike = useCallback(async () => {
    if (isLiking || isDisliking) return;
    
    try {
      setError(null);
      setIsDisliking(true);
      
      if (hasDisliked) {
        await commentsAPI.removeReaction(currentComment._id);
      } else {
        await commentsAPI.dislikeComment(currentComment._id);
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reaction';
      setError(errorMessage);
    } finally {
      setIsDisliking(false);
    }
  }, [isLiking, isDisliking, hasDisliked, currentComment._id]);

  // Reply reaction handlers
  const handleReplyLike = useCallback(async (replyId: string) => {
    try {
      const reply = [...replies, ...realTimeReplies].find(r => r._id === replyId);
      if (!reply) return;

      if (reply.isLikedByUser) {
        await commentsAPI.removeReaction(replyId);
      } else {
        await commentsAPI.likeComment(replyId);
      }
    } catch (err: unknown) {
      console.error('Failed to update reply reaction:', err);
    }
  }, [replies, realTimeReplies]);

  const handleReplyDislike = useCallback(async (replyId: string) => {
    try {
      const reply = [...replies, ...realTimeReplies].find(r => r._id === replyId);
      if (!reply) return;

      if (reply.isDislikedByUser) {
        await commentsAPI.removeReaction(replyId);
      } else {
        await commentsAPI.dislikeComment(replyId);
      }
    } catch (err: unknown) {
      console.error('Failed to update reply reaction:', err);
    }
  }, [replies, realTimeReplies]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditContent(currentComment.content);
    setError(null);
  }, [currentComment.content]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(currentComment.content);
    setError(null);
  }, [currentComment.content]);

  const handleUpdate = useCallback(async () => {
    if (!editContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setError(null);
      setIsUpdating(true);
      await commentsAPI.updateComment(currentComment._id, editContent);
      setIsEditing(false);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update comment';
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [editContent, currentComment._id]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      setIsDeleting(true);
      await commentsAPI.deleteComment(currentComment._id);
      onCommentDeleted?.(currentComment._id);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete comment';
      setError(errorMessage);
      setIsDeleting(false);
    }
  }, [currentComment._id, onCommentDeleted]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }, []);

  const loadReplies = useCallback(async (page: number = 1) => {
    try {
      setLoadingReplies(true);
      const response = await commentsAPI.getReplies(currentComment._id, { page, limit: 10 });
      
      if (page === 1) {
        // For first page, replace server replies
        setReplies(response.data.data.replies);
        setRepliesLoadedFromServer(true);
      } else {
        // For subsequent pages, append new replies
        setReplies(prev => [...prev, ...response.data.data.replies]);
      }
      
      setHasMoreReplies(response.data.data.pagination.hasNextPage);
      setRepliesPage(page);
    } catch (err: unknown) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  }, [currentComment._id]);

  const handleReply = useCallback(async () => {
    if (showReplyForm || showReplies) {
      // If either form or replies are showing, hide both
      setShowReplyForm(false);
      setShowReplies(false);
    } else {
      // Show loading state on button
      setIsReplying(true);
      
      try {
        // If nothing is showing, show both
        setShowReplyForm(true);
        setShowReplies(true);
        
        // Load replies from server if not already loaded
        if (!repliesLoadedFromServer) {
          await loadReplies();
        }
      } finally {
        setIsReplying(false);
      }
    }
  }, [showReplyForm, showReplies, loadReplies, repliesLoadedFromServer]);

  const handleReplyCreated = useCallback((newReply: Comment) => {
    // Keep the reply form visible for continuous replying
    setShowReplyForm(true);
    setShowReplies(true);
    // Don't call onCommentUpdate here since socket will handle the update
  }, []);

  const handleToggleReplies = useCallback(() => {
    if (!showReplies && !repliesLoadedFromServer) {
      loadReplies();
    }
    setShowReplies(!showReplies);
  }, [showReplies, repliesLoadedFromServer, loadReplies]);

  const handleLoadMoreReplies = useCallback(() => {
    loadReplies(repliesPage + 1);
  }, [loadReplies, repliesPage]);

  // Reply edit/delete handlers
  const handleEditReply = useCallback((replyId: string, content: string) => {
    // For now, we'll implement a simple inline edit
    const newContent = prompt('Edit your reply:', content);
    if (newContent && newContent.trim() !== content) {
      commentsAPI.updateComment(replyId, newContent.trim())
        .then(() => {
          // The update will be handled by socket events
        })
        .catch((err) => {
          console.error('Failed to update reply:', err);
          setError('Failed to update reply');
        });
    }
  }, []);

  const handleDeleteReply = useCallback((replyId: string) => {
    if (window.confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
      commentsAPI.deleteComment(replyId)
        .then(() => {
          // The deletion will be handled by socket events
        })
        .catch((err) => {
          console.error('Failed to delete reply:', err);
          setError('Failed to delete reply');
        });
    }
  }, []);

  // Combine real-time replies with server replies for display
  const allReplies = useMemo(() => {
    // Get IDs of server replies to avoid duplicates
    const serverReplyIds = new Set(replies.map(r => r._id));
    
    // Filter real-time replies to only include those not in server replies
    const uniqueRealTimeReplies = realTimeReplies.filter(reply => !serverReplyIds.has(reply._id));
    
    // Combine real-time replies (newest) with server replies (paginated)
    return [...uniqueRealTimeReplies, ...replies].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [replies, realTimeReplies]);

  // Memoize author display name to prevent unnecessary re-renders
  const authorDisplayName = useMemo(() => {
    return currentComment.author?.username || 'Unknown User';
  }, [currentComment.author]);

  // Memoize avatar display
  const avatarDisplay = useMemo(() => {
    if (currentComment.author?.avatar) {
      return <img src={currentComment.author.avatar} alt={authorDisplayName} />;
    }
    return (
      <div className="avatar-placeholder">
        {authorDisplayName.charAt(0).toUpperCase()}
      </div>
    );
  }, [currentComment.author?.avatar, authorDisplayName]);

  if (!currentComment._id) {
    return null;
  }

  return (
    <div className="comment-item">
      <div className="comment-header">
        <div className="comment-author">
          <div className="author-avatar">
            {avatarDisplay}
          </div>
          <div className="author-info">
            <span className="author-name">{authorDisplayName}</span>
            <span className="comment-date">{formatDate(currentComment.createdAt)}</span>
          </div>
        </div>
        
        {isAuthor && (
          <div className="comment-actions">
            {!isEditing && (
              <>
                <button
                  onClick={handleEdit}
                  className="btn-action btn-edit"
                  title="Edit comment"
                  disabled={isDeleting || isUpdating}
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-action btn-delete"
                  title="Delete comment"
                  disabled={isDeleting || isUpdating || isLiking || isDisliking}
                >
                  {isDeleting ? (
                    <span className="btn-spinner">⏳</span>
                  ) : (
                    '🗑️'
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="comment-content">
        {isEditing ? (
          <div className="comment-edit">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="edit-textarea"
              rows={3}
              disabled={isUpdating}
              placeholder="Edit your comment..."
            />
            <div className="edit-actions">
              <button
                onClick={handleUpdate}
                className="btn btn-primary btn-sm"
                disabled={isUpdating || !editContent.trim()}
              >
                {isUpdating ? (
                  <>
                    <span className="btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="comment-text">{currentComment.content}</p>
        )}
      </div>

      {error && (
        <div className="comment-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="comment-footer">
        <div className="comment-reactions">
          <button
            onClick={handleLike}
            className={`reaction-btn ${hasLiked ? 'liked' : ''}`}
            title={hasLiked ? 'Remove like' : 'Like comment'}
            disabled={isLiking || isDisliking || isDeleting || isUpdating}
          >
            {isLiking ? (
              <span className="btn-spinner">⏳</span>
            ) : (
              '👍'
            )}
            <span className="reaction-count">{formatCount(currentComment.likeCount)}</span>
          </button>
          <button
            onClick={handleDislike}
            className={`reaction-btn ${hasDisliked ? 'disliked' : ''}`}
            title={hasDisliked ? 'Remove dislike' : 'Dislike comment'}
            disabled={isLiking || isDisliking || isDeleting || isUpdating}
          >
            {isDisliking ? (
              <span className="btn-spinner">⏳</span>
            ) : (
              '👎'
            )}
            <span className="reaction-count">{formatCount(currentComment.dislikeCount)}</span>
          </button>
          {user && (
            <button
              onClick={handleReply}
              className="reaction-btn"
              title="Reply to comment"
              disabled={isDeleting || isUpdating || isReplying}
            >
              💬 {isReplying ? (
                <>
                  <span className="btn-spinner"></span>
                  Loading...
                </>
              ) : (
                formatCountWithText(currentComment.replyCount || 0, 'Reply', 'Replies')
              )}
            </button>
          )}
          {(currentComment.replyCount || 0) > 0 && !user && (
            <button
              onClick={handleToggleReplies}
              className="reaction-btn"
              title="View replies"
              disabled={isDeleting || isUpdating}
            >
              💬 {formatCountWithText(currentComment.replyCount || 0, 'Reply', 'Replies')}
            </button>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && user && (
        <div className="reply-form-container">
          <ReplyForm
            parentCommentId={currentComment._id}
            onReplyCreated={handleReplyCreated}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Replies Section */}
      {allReplies.length > 0 && showReplies && (
        <div className="replies-section">
          <div className="replies-list">
            {allReplies.map((reply) => (
              <div key={reply._id} className="reply-item">
                <div className="reply-header">
                  <div className="reply-author">
                    <div className="reply-avatar">
                      {reply.author?.avatar ? (
                        <img src={reply.author.avatar} alt={reply.author.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {(reply.author?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="reply-name">{reply.author?.username || 'Unknown User'}</span>
                      <span className="reply-date">{"  "+formatDate(reply.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="reply-content">
                  {reply.content}
                </div>
                <div className="reply-reactions">
                  <button
                    onClick={() => handleReplyLike(reply._id)}
                    className={`reply-reaction-btn ${reply.isLikedByUser ? 'liked' : ''}`}
                    title="Like reply"
                  >
                    👍 {reply.likeCount}
                  </button>
                  <button
                    onClick={() => handleReplyDislike(reply._id)}
                    className={`reply-reaction-btn ${reply.isDislikedByUser ? 'disliked' : ''}`}
                    title="Dislike reply"
                  >
                    👎 {reply.dislikeCount}
                  </button>
                  {user?.id === reply.author?._id && (
                    <>
                      <button
                        onClick={() => handleEditReply(reply._id, reply.content)}
                        className="reply-reaction-btn"
                        title="Edit reply"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply._id)}
                        className="reply-reaction-btn"
                        title="Delete reply"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {hasMoreReplies && (
              <div className="load-more-replies">
                <button
                  onClick={handleLoadMoreReplies}
                  className="load-more-btn"
                  disabled={loadingReplies}
                >
                  {loadingReplies ? (
                    <>
                      <span className="btn-spinner"></span>
                      Loading...
                    </>
                  ) : (
                    'Load more replies'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentItem;
