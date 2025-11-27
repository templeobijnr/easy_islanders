import React, { useState } from 'react';
import { Send, MessageCircle, MoreHorizontal } from 'lucide-react';
import { SocialPost, SocialUser, SocialComment } from '../../types/social';
import { SocialService } from '../../services/socialService';

interface PostCardProps {
    post: SocialPost;
    currentUser: SocialUser | null;
    onVouch: (postId: string) => void;
    onViewProfile: (userId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onVouch, onViewProfile }) => {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentCount, setCommentCount] = useState(post.comments);

    const handleToggleComments = async () => {
        if (!showComments) {
            setLoadingComments(true);
            const fetched = await SocialService.getComments(post.id);
            setComments(fetched);
            setLoadingComments(false);
        }
        setShowComments(!showComments);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;

        const content = newComment;
        setNewComment('');

        // Optimistic update
        const tempComment: SocialComment = {
            id: `temp_${Date.now()}`,
            postId: post.id,
            authorId: currentUser.id,
            authorName: currentUser.name,
            authorAvatar: currentUser.avatar,
            content,
            timestamp: new Date().toISOString()
        };

        setComments([...comments, tempComment]);
        setCommentCount(prev => prev + 1);

        await SocialService.addComment(post.id, content);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <button onClick={() => onViewProfile(post.author.id)} className="flex items-center gap-3 text-left">
                    <img src={post.author.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <div className="font-bold text-slate-900 text-sm">{post.author.name}</div>
                        <div className="text-xs text-slate-500">{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </button>
                <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
            </div>

            {/* Content */}
            <p className="text-slate-800 mb-4 text-sm leading-relaxed">{post.content}</p>

            {post.hashtags && (
                <div className="flex gap-2 mb-3">
                    {post.hashtags.map(tag => (
                        <span key={tag} className="text-xs text-teal-600 font-bold">#{tag}</span>
                    ))}
                </div>
            )}

            {post.imageUrl && (
                <img src={post.imageUrl} className="w-full h-64 object-cover rounded-xl mb-4" />
            )}

            {post.type === 'check_in' && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">⚓</div>
                    <div className="text-xs text-blue-800">
                        <b>{post.author.name}</b> is currently here. Drop by to connect!
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 border-t border-slate-100 pt-3">
                <button onClick={() => onVouch(post.id)} className={`flex items-center gap-2 text-xs font-bold transition-colors ${post.isLiked ? 'text-teal-600' : 'text-slate-500 hover:text-teal-600'}`}>
                    <Send size={16} className={post.isLiked ? 'fill-teal-600' : ''} /> {post.likes} Vouches
                </button>
                <button onClick={handleToggleComments} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
                    <MessageCircle size={16} /> {commentCount} Comments
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in">
                    <div className="space-y-3 mb-4">
                        {loadingComments ? (
                            <div className="text-center text-xs text-slate-400 py-2">Loading comments...</div>
                        ) : comments.length > 0 ? (
                            comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={comment.authorAvatar} className="w-8 h-8 rounded-full object-cover" />
                                    <div className="bg-slate-50 rounded-xl p-3 flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-xs text-slate-900">{comment.authorName}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs text-slate-700">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-xs text-slate-400 py-2">No comments yet. Be the first!</div>
                        )}
                    </div>

                    {currentUser && (
                        <div className="flex gap-3 items-center">
                            <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    placeholder="Write a comment..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs outline-none focus:border-slate-400"
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-teal-600 disabled:opacity-50 hover:text-teal-700"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PostCard;
