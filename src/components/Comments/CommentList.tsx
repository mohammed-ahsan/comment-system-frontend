import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import Pagination from './Pagination';
import SortOptions from './SortOptions';
import './Comments.scss';


type SortOption = 'newest' | 'mostLiked' | 'mostDisliked';

const CommentList: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalComments: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [sort, setSort] = useState<SortOption>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();

  const fetchComments = useCallback(async (page: number = 1, sortOption: SortOption = sort) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commentsAPI.getComments({
        page,
        limit: 10,
        sort: sortOption,
      });

      if (response.data.success) {
        setComments(response.data.data.comments);
        setPagination(response.data.data.pagination);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchComments();
    }
  }, [isAuthenticated, fetchComments]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);

      // Set up real-time event listeners
      socketService.onNewComment((newComment: Comment) => {
        setComments(prev => [newComment, ...prev]);
      });

      socketService.onCommentUpdated((updatedComment: Comment) => {
        setComments(prev => 
          prev.map(comment => 
            comment._id === updatedComment._id ? updatedComment : comment
          )
        );
      });

      socketService.onCommentDeleted((commentId: string) => {
        setComments(prev => prev.filter(comment => comment._id !== commentId));
      });

      socketService.onCommentLiked((data) => {
        setComments(prev =>
          prev.map(comment =>
            comment._id === data.commentId ? { ...comment, likes: data.likes } : comment
          )
        );
      });

      socketService.onCommentDisliked((data) => {
        setComments(prev =>
          prev.map(comment =>
            comment._id === data.commentId ? { ...comment, dislikes: data.dislikes } : comment
          )
        );
      });
    }

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [isAuthenticated, user]);

  const handleCommentCreated = (newComment: Comment) => {
    setComments(prev => [newComment, ...prev]);
  };

  const handlePageChange = (page: number) => {
    fetchComments(page, sort);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    fetchComments(1, newSort);
  };

  if (!isAuthenticated) {
    return (
      <div className="comments-container">
        <div className="auth-required">
          <h3>Please login to view and post comments</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="comments-container">
      <div className="comments-header">
        <h2>Comments ({pagination.totalComments})</h2>
        <SortOptions currentSort={sort} onSortChange={handleSortChange} />
      </div>

      <CommentForm onCommentCreated={handleCommentCreated} />

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="comments-loading">
          <div className="spinner"></div>
          <p>Loading comments...</p>
        </div>
      ) : (
        <>
          {comments.length === 0 ? (
            <div className="no-comments">
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <>
      <div className="comments-list">
        {comments.map((comment) => (
          <CommentItem 
            key={comment._id} 
            comment={comment} 
            onCommentUpdate={fetchComments}
          />
        ))}
      </div>

              {pagination.totalPages > 1 && (
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CommentList;
