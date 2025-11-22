
import React, { useState } from 'react';
import { MapPin, Calendar, Star, Heart, MessageCircle, Send, UserPlus, Users, Trophy, Award, CheckCircle, Edit3, Image as ImageIcon, MoreHorizontal, Hash, Users as UsersIcon, Plus } from 'lucide-react';
import { MOCK_SOCIAL_FEED, MOCK_SOCIAL_USERS, CURRENT_USER, MOCK_GROUPS } from '../constants';
import { SocialPost, SocialUser, SocialGroup } from '../types';

const INTERESTS = ['All', 'Hiking', 'Tech', 'Crypto', 'Dining', 'Nightlife', 'Sailing', 'Tennis', 'Gaming', 'Photography', 'Nature'];

const Connect: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>(MOCK_SOCIAL_FEED);
  const [postType, setPostType] = useState<'status' | 'plan' | 'review'>('status');
  const [newPostContent, setNewPostContent] = useState('');
  const [activeInterest, setActiveInterest] = useState('All');
  const [groups, setGroups] = useState<SocialGroup[]>(MOCK_GROUPS);

  const handlePost = () => {
    if (!newPostContent.trim()) return;
    
    const newPost: SocialPost = {
      id: `p-${Date.now()}`,
      author: CURRENT_USER,
      type: postType,
      content: newPostContent,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      attendees: postType === 'plan' ? [CURRENT_USER] : undefined,
      location: postType === 'review' || postType === 'plan' ? 'North Cyprus' : undefined,
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const handleJoinEvent = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId && p.attendees) {
        const isAlreadyAttending = p.attendees.some(u => u.id === CURRENT_USER.id);
        if (isAlreadyAttending) return p;
        return { ...p, attendees: [...p.attendees, CURRENT_USER] };
      }
      return p;
    }));
  };

  const handleJoinGroup = (groupId: string) => {
     setGroups(groups.map(g => {
        if (g.id === groupId) {
           return { ...g, isMember: !g.isMember, members: g.isMember ? g.members - 1 : g.members + 1 };
        }
        return g;
     }));
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked };
      }
      return p;
    }));
  };

  const renderBadges = (badges: string[]) => (
    <div className="flex gap-1 flex-wrap">
      {badges.map(b => (
        <span key={b} className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-100">{b}</span>
      ))}
    </div>
  );

  // Filter logic
  const visiblePosts = activeInterest === 'All' ? posts : posts.filter(p => {
     // Mock filter logic: In a real app, posts would have tags. 
     // Here we check if the author has the interest or if the content mentions it.
     const interestLower = activeInterest.toLowerCase();
     return p.author.interests.some(i => i.toLowerCase() === interestLower) || p.content.toLowerCase().includes(interestLower);
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-6">
         
         {/* HEADER HERO */}
         <div className="mb-8 text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Islanders Connect</h1>
            <p className="text-slate-500 text-lg">Meet locals, join tribes, and experience the island together.</p>
         </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT SIDEBAR - USER PROFILE & GROUPS */}
          <div className="hidden lg:block space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                  <div className="absolute bottom-0 right-0 bg-yellow-400 rounded-full p-1.5 border-2 border-white text-white" title={CURRENT_USER.rank}>
                     <Trophy size={14} />
                  </div>
                </div>
                <h2 className="font-bold text-lg text-slate-900">{CURRENT_USER.name}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">{CURRENT_USER.rank}</p>
                {renderBadges(CURRENT_USER.badges)}
                
                <div className="w-full mt-6 bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                   <div className="bg-teal-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <div className="flex justify-between w-full text-xs text-slate-500">
                   <span>{CURRENT_USER.points} pts</span>
                   <span>Next Level: 1000</span>
                </div>
              </div>
            </div>

            {/* My Tribes (Groups) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
               <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <UsersIcon size={18} /> My Tribes
               </h3>
               <div className="space-y-3">
                  {groups.filter(g => g.isMember).map(group => (
                     <div key={group.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                        <img src={group.image} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 overflow-hidden">
                           <div className="font-bold text-sm truncate">{group.name}</div>
                           <div className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> 12 active
                           </div>
                        </div>
                     </div>
                  ))}
                  {groups.filter(g => g.isMember).length === 0 && (
                     <div className="text-xs text-slate-400 text-center py-4">You haven't joined any groups yet.</div>
                  )}
               </div>
            </div>
          </div>

          {/* CENTER FEED */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INTEREST FILTERS */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
               {INTERESTS.map(interest => (
                  <button 
                     key={interest}
                     onClick={() => setActiveInterest(interest)}
                     className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        activeInterest === interest 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                     }`}
                  >
                     {interest === 'All' ? 'For You' : `#${interest}`}
                  </button>
               ))}
            </div>

            {/* POST CREATOR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
               <div className="flex gap-4 mb-4">
                  <img src={CURRENT_USER.avatar} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1">
                     <textarea 
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder={
                          postType === 'plan' ? "What are you planning? (e.g. Going to beach...)" :
                          postType === 'review' ? "Where did you eat? How was it?" :
                          "Share an update with islanders..."
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-sm min-h-[80px]"
                     />
                  </div>
               </div>
               
               <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex gap-2">
                     <button 
                       onClick={() => setPostType('status')}
                       className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${postType === 'status' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Edit3 size={14} /> Post
                     </button>
                     <button 
                       onClick={() => setPostType('plan')}
                       className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${postType === 'plan' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Calendar size={14} /> Plan Meetup
                     </button>
                     <button 
                       onClick={() => setPostType('review')}
                       className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${postType === 'review' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Star size={14} /> Review
                     </button>
                  </div>
                  <button 
                    onClick={handlePost}
                    disabled={!newPostContent.trim()}
                    className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                     Post <Send size={12} />
                  </button>
               </div>
            </div>

            {/* FEED ITEMS */}
            {visiblePosts.map(post => (
               <div key={post.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
                  {/* Header */}
                  <div className="p-4 flex justify-between items-start">
                     <div className="flex gap-3">
                        <img src={post.author.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                        <div>
                           <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{post.author.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{post.author.rank}</span>
                           </div>
                           <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {post.location && (
                                 <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-teal-600 font-medium"><MapPin size={10}/> {post.location}</span>
                                 </>
                              )}
                           </div>
                        </div>
                     </div>
                     <button className="text-slate-300 hover:text-slate-600"><MoreHorizontal size={18}/></button>
                  </div>

                  {/* Content Body */}
                  <div className="px-4 pb-4">
                     
                     {/* PLAN CARD */}
                     {post.type === 'plan' && (
                        <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                           <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase mb-2">
                              <Calendar size={14} /> Upcoming Meetup
                           </div>
                           <p className="text-slate-800 text-sm mb-3">{post.content}</p>
                           
                           {post.eventDate && (
                              <div className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-2">
                                 <Calendar size={12} /> {post.eventDate}
                              </div>
                           )}

                           <div className="flex items-center justify-between border-t border-blue-100 pt-3">
                              <div className="flex -space-x-2">
                                 {post.attendees?.map((u, i) => (
                                    <img key={i} src={u.avatar} className="w-6 h-6 rounded-full border-2 border-white" title={u.name} />
                                 ))}
                                 {post.attendees && post.attendees.length < (post.maxAttendees || 10) && (
                                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700 border-2 border-white">
                                       +
                                    </div>
                                 )}
                              </div>
                              <button 
                                 onClick={() => handleJoinEvent(post.id)}
                                 className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors"
                              >
                                 I'm In!
                              </button>
                           </div>
                        </div>
                     )}

                     {/* REVIEW / STATUS */}
                     {post.type !== 'plan' && (
                        <>
                           <p className="text-slate-800 text-sm leading-relaxed mb-3">{post.content}</p>
                           {post.imageUrl && (
                              <div className="rounded-xl overflow-hidden mb-3 border border-slate-100">
                                 <img src={post.imageUrl} className="w-full object-cover max-h-64" />
                              </div>
                           )}
                           {post.rating && (
                              <div className="flex gap-1 mb-3">
                                 {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} className={i < (post.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
                                 ))}
                              </div>
                           )}
                        </>
                     )}
                     
                     {/* Interest Tags */}
                     {post.author.interests && post.author.interests.length > 0 && (
                         <div className="flex gap-1 mt-2">
                            {post.author.interests.slice(0, 2).map(i => (
                               <span key={i} className="text-[10px] text-slate-400">#{i}</span>
                            ))}
                         </div>
                     )}
                  </div>

                  {/* Actions Footer */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-6">
                     <button 
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-slate-800'}`}
                     >
                        <Heart size={16} className={post.isLiked ? 'fill-pink-500' : ''} /> 
                        {post.likes}
                     </button>
                     <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        <MessageCircle size={16} /> {post.comments}
                     </button>
                     <div className="flex-1"></div>
                     {post.type === 'check_in' && (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                           <CheckCircle size={14} /> Checked In
                        </div>
                     )}
                  </div>
               </div>
            ))}
          </div>

          {/* RIGHT SIDEBAR - DISCOVERY */}
          <div className="hidden lg:block space-y-6">
             
             {/* Trending Groups */}
             <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-24">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <Hash size={18} /> Trending Communities
                </h3>
                <div className="space-y-4">
                   {groups.filter(g => !g.isMember).slice(0, 3).map(group => (
                      <div key={group.id} className="flex gap-3">
                         <img src={group.image} className="w-12 h-12 rounded-xl object-cover" />
                         <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900 leading-tight">{group.name}</div>
                            <div className="text-[10px] text-slate-500 mb-1">{group.members} members • #{group.interest}</div>
                            <button onClick={() => handleJoinGroup(group.id)} className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100">
                               + Join Group
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
                <button className="w-full mt-4 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50">
                   Explore All Groups
                </button>
             </div>

             {/* People to Follow (Interest Based) */}
             <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <UserPlus size={18} /> People to Follow
                </h3>
                <div className="space-y-4">
                   {MOCK_SOCIAL_USERS.map(user => {
                      // Find common interest
                      const common = user.interests.find(i => CURRENT_USER.interests.includes(i));
                      
                      return (
                        <div key={user.id} className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                              <div>
                                 <div className="font-bold text-sm text-slate-900">{user.name}</div>
                                 {common ? (
                                    <div className="text-[10px] text-teal-600 font-medium flex items-center gap-1">
                                       <Star size={8} className="fill-teal-600"/> Also likes {common}
                                    </div>
                                 ) : (
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">{user.rank}</div>
                                 )}
                              </div>
                           </div>
                           <button className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                              <UserPlus size={16} />
                           </button>
                        </div>
                      );
                   })}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Connect;
