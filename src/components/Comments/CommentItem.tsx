import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
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

  const { user } = useAuth();

  // Safely access comment properties with fallbacks
  const [currentComment, setCurrentComment] = useState<Comment>(() => ({
    ...comment,
    author: comment.author || { _id: '', username: 'Unknown User', avatar: undefined },
    likeCount: comment.likeCount || 0,
    dislikeCount: comment.dislikeCount || 0,
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
      setCurrentComment(prev => ({
        ...prev,
        likeCount: data.likeCount,
        dislikeCount: data.dislikeCount,
        isLikedByUser: data.type === 'like',
        isDislikedByUser: data.type === 'dislike'
      }));
    }
  }, [currentComment._id]);

  const handleReplyUpdated = useCallback((updatedComment: Comment) => {
    setReplies(prev => 
      prev.map(reply => 
        reply._id === updatedComment._id ? updatedComment : reply
      )
    );
  }, []);

  const handleReplyReaction = useCallback((data: any) => {
    setReplies(prev =>
      prev.map(reply =>
        reply._id === data.commentId
          ? {
              ...reply,
              likeCount: data.likeCount,
              dislikeCount: data.dislikeCount,
              isLikedByUser: data.type === 'like',
              isDislikedByUser: data.type === 'dislike'
            }
          : reply
      )
    );
  }, []);

  const handleNewReply = useCallback((newComment: Comment) => {
    if (newComment.parentComment === currentComment._id) {
      setReplies(prev => [newComment, ...prev]);
    }
  }, [currentComment._id]);

  const handleReplyDeleted = useCallback((commentId: string) => {
    setReplies(prev => prev.filter(reply => reply._id !== commentId));
  }, []);

  // Set up socket listeners
  useEffect(() => {
    socketService.onCommentUpdated(handleCommentUpdated);
    socketService.onCommentReaction(handleCommentReaction);
    socketService.onNewComment(handleNewReply);
    socketService.onCommentDeleted(handleReplyDeleted);

    return () => {
      // Cleanup is handled by socketService.removeAllListeners() in the parent component
    };
  }, [handleCommentUpdated, handleCommentReaction, handleNewReply, handleReplyDeleted]);

  // Set up reply-specific listeners
  useEffect(() => {
    socketService.onCommentUpdated(handleReplyUpdated);
    socketService.onCommentReaction(handleReplyReaction);

    return () => {
      // Cleanup is handled by socketService.removeAllListeners() in the parent component
    };
  }, [handleReplyUpdated, handleReplyReaction]);

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
      const reply = replies.find(r => r._id === replyId);
      if (!reply) return;

      if (reply.isLikedByUser) {
        await commentsAPI.removeReaction(replyId);
      } else {
        await commentsAPI.likeComment(replyId);
      }
    } catch (err: unknown) {
      console.error('Failed to update reply reaction:', err);
    }
  }, [replies]);

  const handleReplyDislike = useCallback(async (replyId: string) => {
    try {
      const reply = replies.find(r => r._id === replyId);
      if (!reply) return;

      if (reply.isDislikedByUser) {
        await commentsAPI.removeReaction(replyId);
      } else {
        await commentsAPI.dislikeComment(replyId);
      }
    } catch (err: unknown) {
      console.error('Failed to update reply reaction:', err);
    }
  }, [replies]);

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
        setReplies(response.data.data.replies);
      } else {
        setReplies(prev => [...prev, ...response.data.data.replies]);
      }
      
      setHasMoreReplies(response.data.data.pagination.hasNext);
      setRepliesPage(page);
    } catch (err: unknown) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  }, [currentComment._id]);

  const handleReply = useCallback(() => {
    setShowReplyForm(!showReplyForm);
    if (!showReplyForm && !showReplies) {
      setShowReplies(true);
      loadReplies();
    }
  }, [showReplyForm, showReplies, loadReplies]);

  const handleReplyCreated = useCallback((newReply: Comment) => {
    setReplies(prev => [newReply, ...prev]);
    setShowReplyForm(false);
    setShowReplies(true);
    onCommentUpdate?.();
  }, [onCommentUpdate]);

  const handleToggleReplies = useCallback(() => {
    if (!showReplies && replies.length === 0) {
      loadReplies();
    }
    setShowReplies(!showReplies);
  }, [showReplies, replies.length, loadReplies]);

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
            <span className="reaction-count">{currentComment.likeCount}</span>
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
            <span className="reaction-count">{currentComment.dislikeCount}</span>
          </button>
          {user && (
            <button
              onClick={handleReply}
              className="reaction-btn"
              title="Reply to comment"
              disabled={isDeleting || isUpdating}
            >
              💬 Reply
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
      {replies.length > 0 && (
        <div className="replies-section">
          <div className="replies-header">
            <button
              onClick={handleToggleReplies}
              className="replies-toggle"
              disabled={loadingReplies}
            >
              {loadingReplies ? (
                <>
                  <span className="btn-spinner"></span>
                  Loading...
                </>
              ) : (
                <>
                  {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </>
              )}
            </button>
          </div>
          
          {showReplies && (
            <div className="replies-list">
              {replies.map((reply) => (
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
                        <span className="reply-date">{formatDate(reply.createdAt)}</span>
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
          )}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
