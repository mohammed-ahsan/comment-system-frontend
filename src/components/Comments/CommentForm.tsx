import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import './Comments.scss';

interface CommentFormProps {
  onCommentCreated: (comment: Comment) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ onCommentCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const { user } = useAuth();

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length <= 500) {
      setContent(newValue);
      setError(null);
    } else {
      setError('Comment cannot exceed 500 characters');
    }

    // Handle typing indicator
    if (!isTyping && newValue.length > 0) {
      setIsTyping(true);
      socketService.emitTyping(user?.username || '');
    } else if (isTyping && newValue.length === 0) {
      setIsTyping(false);
      socketService.emitStopTyping(user?.username || '');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const response = await commentsAPI.createComment(content);

      if (response.data.success) {
        setContent('');
        onCommentCreated(response.data.data);
        
        // Stop typing indicator
        if (isTyping) {
          setIsTyping(false);
          socketService.emitStopTyping(user?.username || '');
        }
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = () => {
    if (isTyping) {
      setIsTyping(false);
      socketService.emitStopTyping(user?.username || '');
    }
  };

  return (
    <div className="comment-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Share your thoughts..."
            className="comment-textarea"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="comment-error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Posting...
              </>
            ) : (
              'Post Comment'
            )}
          </button>
          
          <span className="comment-count">
            {content.length}/500 characters
          </span>
        </div>
      </form>
    </div>
  );
};

export default CommentForm;
