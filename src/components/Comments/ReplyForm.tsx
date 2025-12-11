import React, { useState } from 'react';
import { commentsAPI } from '../../services/api';
import { Comment } from '../../services/api';
import './Comments.scss';

interface ReplyFormProps {
  parentCommentId: string;
  onReplyCreated: (reply: Comment) => void;
  onCancel: () => void;
  placeholder?: string;
}

const ReplyForm: React.FC<ReplyFormProps> = ({
  parentCommentId,
  onReplyCreated,
  onCancel,
  placeholder = 'Write a reply...'
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length <= 500) {
      setContent(newValue);
      setError(null);
    } else {
      setError('Reply cannot exceed 500 characters');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    if (content.length > 500) {
      setError('Reply cannot exceed 500 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await commentsAPI.createReply(content.trim(), parentCommentId);
      onReplyCreated(response.data.data);
      setContent('');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reply-form">
      <form onSubmit={handleSubmit} className="reply-form__form">
        <div className="reply-form__textarea-wrapper">
          <textarea
            value={content}
            onChange={handleChange}
            placeholder={placeholder}
            className="reply-form__textarea"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
        
        {error && <div className="reply-form__error">{error}</div>}
        
        <div className="reply-form__actions">
          <button
            type="button"
            onClick={onCancel}
            className="reply-form__cancel-btn"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="reply-form__submit-btn"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Reply'}
          </button>
          
          <span className="reply-char-count">
            {content.length}/500 characters
          </span>
        </div>
      </form>
    </div>
  );
};

export default ReplyForm;
