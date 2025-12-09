import React, { useState } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ReplyForm from './ReplyForm';
import './Comments.scss';

interface CommentItemProps {
  comment: Comment;
  onCommentUpdate?: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onCommentUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);

  const { user } = useAuth();

  const isAuthor = user?.id === comment.author._id;
  const hasLiked = comment.likes.includes(user?.id || '');
  const hasDisliked = comment.dislikes.includes(user?.id || '');

  const handleLike = async () => {
    try {
      setError(null);
      if (hasLiked) {
        await commentsAPI.removeReaction(comment._id);
      } else {
        await commentsAPI.likeComment(comment._id);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reaction');
    }
  };

  const handleDislike = async () => {
    try {
      setError(null);
      if (hasDisliked) {
        await commentsAPI.removeReaction(comment._id);
      } else {
        await commentsAPI.dislikeComment(comment._id);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reaction');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
    setError(null);
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setError(null);
      setIsUpdating(true);
      await commentsAPI.updateComment(comment._id, editContent);
      setIsEditing(false);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setError(null);
      setIsDeleting(true);
      await commentsAPI.deleteComment(comment._id);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete comment');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
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
  };

  const loadReplies = async (page: number = 1) => {
    try {
      setLoadingReplies(true);
      const response = await commentsAPI.getReplies(comment._id, { page, limit: 5 });
      
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
  };

  const handleReply = () => {
    setShowReplyForm(!showReplyForm);
    if (!showReplyForm && !showReplies) {
      setShowReplies(true);
      loadReplies();
    }
  };

  const handleReplyCreated = (newReply: Comment) => {
    setReplies(prev => [newReply, ...prev]);
    setShowReplyForm(false);
    setShowReplies(true);
    if (onCommentUpdate) {
      onCommentUpdate();
    }
  };

  const handleToggleReplies = () => {
    if (!showReplies && replies.length === 0) {
      loadReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleLoadMoreReplies = () => {
    loadReplies(repliesPage + 1);
  };

  return (
    <div className="comment-item">
      <div className="comment-header">
        <div className="comment-author">
          <div className="author-avatar">
            {comment.author.avatar ? (
              <img src={comment.author.avatar} alt={comment.author.username} />
            ) : (
              <div className="avatar-placeholder">
                {comment.author.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="author-info">
            <span className="author-name">{comment.author.username}</span>
            <span className="comment-date">{formatDate(comment.createdAt)}</span>
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
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-action btn-delete"
                  title="Delete comment"
                  disabled={isDeleting}
                >
                  🗑️
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
            />
            <div className="edit-actions">
              <button
                onClick={handleUpdate}
                className="btn btn-primary btn-sm"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save'}
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
          <p className="comment-text">{comment.content}</p>
        )}
      </div>

      {error && (
        <div className="comment-error">
          {error}
        </div>
      )}

      <div className="comment-footer">
        <div className="comment-reactions">
          <button
            onClick={handleLike}
            className={`reaction-btn ${hasLiked ? 'liked' : ''}`}
            title={hasLiked ? 'Remove like' : 'Like comment'}
          >
            👍 {comment.likes.length}
          </button>
          <button
            onClick={handleDislike}
            className={`reaction-btn ${hasDisliked ? 'disliked' : ''}`}
            title={hasDisliked ? 'Remove dislike' : 'Dislike comment'}
          >
            👎 {comment.dislikes.length}
          </button>
          {user && (
            <button
              onClick={handleReply}
              className="reaction-btn"
              title="Reply to comment"
            >
              💬 Reply
            </button>
          )}
        </div>
        
        {comment.updatedAt !== comment.createdAt && !isEditing && (
          <span className="edited-indicator">edited</span>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && user && (
        <ReplyForm
          parentCommentId={comment._id}
          onReplyCreated={handleReplyCreated}
          onCancel={() => setShowReplyForm(false)}
        />
      )}

      {/* Replies Section */}
      {replies.length > 0 && (
        <div className="replies-section">
          <div className="replies-header">
            <button
              onClick={handleToggleReplies}
              className="replies-toggle"
            >
              {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </button>
          </div>
          
          {showReplies && (
            <div className="replies-list">
              {replies.map((reply) => (
                <div key={reply._id} className="reply-item">
                  <div className="reply-header">
                    <div className="reply-author">
                      <div className="reply-avatar">
                        {reply.author.avatar ? (
                          <img src={reply.author.avatar} alt={reply.author.username} />
                        ) : (
                          <div className="avatar-placeholder">
                            {reply.author.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="reply-name">{reply.author.username}</span>
                        <span className="reply-date">{formatDate(reply.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="reply-content">
                    {reply.content}
                  </div>
                  <div className="reply-reactions">
                    <button
                      className={`reply-reaction-btn ${reply.likes.includes(user?.id || '') ? 'liked' : ''}`}
                      title="Like reply"
                    >
                      👍 {reply.likes.length}
                    </button>
                    <button
                      className={`reply-reaction-btn ${reply.dislikes.includes(user?.id || '') ? 'disliked' : ''}`}
                      title="Dislike reply"
                    >
                      👎 {reply.dislikes.length}
                    </button>
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
                    {loadingReplies ? 'Loading...' : 'Load more replies'}
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
