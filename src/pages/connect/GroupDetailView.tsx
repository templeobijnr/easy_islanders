
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Send, Image as ImageIcon, MoreHorizontal, Heart, MessageCircle, ShieldAlert, Pin } from 'lucide-react';
import { SocialGroup, SocialPost, SocialUser } from '../../types';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { CURRENT_USER } from '../../components/constants';
import { formatDate } from '../../utils/formatters';

interface GroupDetailViewProps {
   group: SocialGroup;
   onBack: () => void;
   onJoinToggle: (group: SocialGroup) => void;
}

const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, onBack, onJoinToggle }) => {
   const [posts, setPosts] = useState<SocialPost[]>([]);
   const [newPostContent, setNewPostContent] = useState('');
   const [isPosting, setIsPosting] = useState(false);

   useEffect(() => {
      const loadGroupPosts = async () => {
         const allPosts = await StorageService.getSocialPosts();
         // Filter posts for this group (mock logic: in real app query by groupId)
         // For demo, if no posts have this groupId, we show generic ones or allow creating new ones
         const groupPosts = allPosts.filter(p => p.groupId === group.id);
         setPosts(groupPosts);
      };
      loadGroupPosts();
   }, [group.id]);

   const handlePost = async () => {
      if (!newPostContent.trim()) return;
      setIsPosting(true);

      const newPost: SocialPost = {
         id: `p-${Date.now()}`,
         author: CURRENT_USER,
         type: 'status',
         content: newPostContent,
         timestamp: new Date().toISOString(),
         likes: 0,
         comments: 0,
         groupId: group.id // Link to this group
      };

      await StorageService.saveSocialPost(newPost);
      setPosts([newPost, ...posts]);
      setNewPostContent('');
      setIsPosting(false);
   };

   const handleLike = (postId: string) => {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1, isLiked: true } : p));
   };

   return (
      <div className="min-h-screen bg-slate-50 pb-20 animate-in slide-in-from-right duration-300">
         {/* Hero Header */}
         <div className="h-64 w-full relative">
            <img src={group.image} className="w-full h-full object-cover" alt={group.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

            <div className="absolute top-6 left-4 md:left-8 z-20">
               <button
                  onClick={onBack}
                  className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
               >
                  <ArrowLeft size={20} />
               </button>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-10">
               <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div>
                     <span className="inline-block px-3 py-1 bg-teal-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full mb-2">
                        {group.interest} Tribe
                     </span>
                     <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{group.name}</h1>
                     <div className="flex items-center gap-4 text-slate-300 text-sm">
                        <span className="flex items-center gap-1"><Users size={14} /> {group.members} Members</span>
                        <span>•</span>
                        <span>{group.description}</span>
                     </div>
                  </div>
                  <button
                     onClick={() => onJoinToggle(group)}
                     className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all ${group.isMember
                           ? 'bg-white/20 backdrop-blur text-white hover:bg-red-500/20 hover:text-red-200'
                           : 'bg-white text-slate-900 hover:bg-teal-50'
                        }`}
                  >
                     {group.isMember ? 'Joined' : 'Join Group'}
                  </button>
               </div>
            </div>
         </div>

         <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* Left: Group Rules / Info */}
               <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Community Rules</h3>
                     <ul className="space-y-3 text-sm text-slate-600">
                        <li className="flex gap-2">
                           <span className="text-teal-600 font-bold">1.</span> Be kind and respectful.
                        </li>
                        <li className="flex gap-2">
                           <span className="text-teal-600 font-bold">2.</span> No spam or self-promotion.
                        </li>
                        <li className="flex gap-2">
                           <span className="text-teal-600 font-bold">3.</span> Keep posts relevant to {group.interest}.
                        </li>
                     </ul>
                     <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                              <ShieldAlert size={20} />
                           </div>
                           <div>
                              <div className="text-xs font-bold text-slate-500 uppercase">Moderated By</div>
                              <div className="font-bold text-slate-900">Mateo (Concierge)</div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Center: Feed */}
               <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">

                  {/* Create Post */}
                  {group.isMember ? (
                     <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex gap-4">
                           <img src={CURRENT_USER.avatar} className="w-10 h-10 rounded-full object-cover" />
                           <div className="flex-1">
                              <textarea
                                 value={newPostContent}
                                 onChange={(e) => setNewPostContent(e.target.value)}
                                 placeholder={`Ask the ${group.name} community...`}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-sm min-h-[80px]"
                              />
                              <div className="flex justify-between items-center mt-3">
                                 <div className="flex gap-2">
                                    <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><ImageIcon size={18} /></button>
                                 </div>
                                 <button
                                    onClick={handlePost}
                                    disabled={!newPostContent.trim() || isPosting}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                                 >
                                    Post <Send size={12} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
                        <h3 className="font-bold text-blue-900 mb-2">Join to Participate</h3>
                        <p className="text-blue-700 text-sm mb-4">Join the {group.name} to post questions, share photos, and connect with members.</p>
                        <button onClick={() => onJoinToggle(group)} className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-700">Join Now</button>
                     </div>
                  )}

                  {/* Pinned Post (Agent) */}
                  <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden relative">
                     <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                     <div className="p-4">
                        <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase mb-3">
                           <Pin size={14} /> Pinned by Admin
                        </div>
                        <div className="flex gap-3">
                           <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold shadow-sm">M</div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <h4 className="font-bold text-slate-900 text-sm">Mateo (Concierge)</h4>
                                 <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 rounded font-bold">MOD</span>
                              </div>
                              <p className="text-xs text-slate-400">2 days ago</p>
                              <p className="text-sm text-slate-700 mt-2">Welcome to {group.name}! Please introduce yourself in the comments below. If you need urgent help, you can direct message me from the Home screen.</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Posts Feed */}
                  {posts.map(post => (
                     <div key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4">
                           <div className="flex justify-between items-start mb-3">
                              <div className="flex gap-3">
                                 <img src={post.author.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                                 <div>
                                    <div className="flex items-center gap-2">
                                       <h4 className="font-bold text-slate-900 text-sm">{post.author.name}</h4>
                                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{post.author.rank}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                       {formatDate(post.timestamp, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                 </div>
                              </div>
                              <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={18} /></button>
                           </div>
                           <p className="text-slate-800 text-sm leading-relaxed mb-3">{post.content}</p>
                           {post.imageUrl && (
                              <div className="rounded-xl overflow-hidden mb-3 border border-slate-100">
                                 <img src={post.imageUrl} className="w-full object-cover max-h-80" />
                              </div>
                           )}
                        </div>
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-6">
                           <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-slate-800'}`}>
                              <Heart size={16} className={post.isLiked ? 'fill-pink-500' : ''} /> {post.likes}
                           </button>
                           <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                              <MessageCircle size={16} /> {post.comments}
                           </button>
                        </div>
                     </div>
                  ))}

                  {posts.length === 0 && (
                     <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-500">No posts yet. Be the first to start a discussion!</p>
                     </div>
                  )}

               </div>
            </div>
         </div>
      </div>
   );
};

export default GroupDetailView;
