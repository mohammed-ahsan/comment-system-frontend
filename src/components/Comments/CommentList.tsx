import React, { useState, useEffect, useCallback } from 'react';
import { Comment } from '../../services/api';
import { commentsAPI } from '../../services/api';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import EnhancedPagination from './EnhancedPagination';
import SortOptions from './SortOptions';
import './Comments.scss';


type SortOption = 'newest' | 'mostLiked' | 'mostDisliked';

const CommentList: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false,
    isFirstPage: true,
    isLastPage: true,
    startIndex: 0,
    endIndex: 0,
    remainingItems: 0,
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
        // Map backend pagination to frontend pagination format
        const backendPagination = response.data.data.pagination as any;
        setPagination({
          currentPage: backendPagination.currentPage,
          totalPages: backendPagination.totalPages,
          total: backendPagination.totalComments,
          hasNextPage: backendPagination.hasNextPage,
          hasPrevPage: backendPagination.hasPrevPage,
          isFirstPage: backendPagination.isFirstPage || backendPagination.currentPage === 1,
          isLastPage: backendPagination.isLastPage || backendPagination.currentPage === backendPagination.totalPages,
          startIndex: backendPagination.startIndex || (backendPagination.currentPage - 1) * 10 + 1,
          endIndex: backendPagination.endIndex || Math.min(backendPagination.currentPage * 10, backendPagination.totalComments),
          remainingItems: backendPagination.remainingItems || Math.max(0, backendPagination.totalComments - backendPagination.currentPage * 10),
        });
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
        if (!newComment.parentComment) {
          setComments(prev => [newComment, ...prev]);
        }
      });

      socketService.onNewReply((newComment: Comment) => {
        if (newComment.parentComment) {
          setComments(prev => 
            prev.map(comment => 
              comment._id === newComment.parentComment 
                ? { ...comment, replyCount: (comment.replyCount || 0) + 1 }
                : comment
            )
          );
        }
      });

      socketService.onCommentUpdated((updatedComment: Comment) => {
        setComments(prev => 
          prev.map(comment => 
            comment._id === updatedComment._id ? updatedComment : comment
          )
        );
      });

      socketService.onCommentDeleted((commentId: string) => {
        setComments(prev => {
          const deletedComment = prev.find(c => c._id === commentId);
          if (deletedComment?.parentComment) {
            return prev.map(comment => 
              comment._id === deletedComment.parentComment 
                ? { ...comment, replyCount: Math.max(0, (comment.replyCount || 0) - 1) }
                : comment
            ).filter(comment => comment._id !== commentId);
          }
          return prev.filter(comment => comment._id !== commentId);
        });
      });

      socketService.on('deletedComment', (data: unknown) => {
        const commentId = (data as { id: string }).id;
        setComments(prev => {
          const deletedComment = prev.find(c => c._id === commentId);
          if (deletedComment?.parentComment) {
            return prev.map(comment => 
              comment._id === deletedComment.parentComment 
                ? { ...comment, replyCount: Math.max(0, (comment.replyCount || 0) - 1) }
                : comment
            ).filter(comment => comment._id !== commentId);
          }
          return prev.filter(comment => comment._id !== commentId);
        });
      });

      socketService.onCommentReaction((data) => {
        setComments(prev =>
          prev.map(comment =>
            comment._id === data.commentId 
              ? { 
                  ...comment, 
                  likeCount: data.likeCount, 
                  dislikeCount: data.dislikeCount,
                  isLikedByUser: data.userId === user?.id ? (data.type === 'like' ? true : data.type === 'remove' ? false : comment.isLikedByUser) : comment.isLikedByUser,
                  isDislikedByUser: data.userId === user?.id ? (data.type === 'dislike' ? true : data.type === 'remove' ? false : comment.isDislikedByUser) : comment.isDislikedByUser
                } 
              : comment
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

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId));
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
        <h2>Comments ({pagination.total})</h2>
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
            onCommentDeleted={handleCommentDeleted}
          />
        ))}
      </div>

              {pagination.totalPages > 1 && (
                <EnhancedPagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  loading={loading}
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
