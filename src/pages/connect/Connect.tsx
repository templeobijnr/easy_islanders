import React, { useState, useEffect, useRef } from 'react';
import { MapIcon, List, ImageIcon, Send, MapPin, MoreHorizontal, ShieldCheck, MessageCircle, Star, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SocialService } from '../../services/socialService';
import { SocialPost, SocialUser, SocialGroup, HotZone } from '../../types/social';
import { EventItem } from '../../types';
import IslandMap from './IslandMap';
import PassportCard from './PassportCard';
import PulseBar from './PulseBar';
import Radar from './Radar';
import StampsModal from './StampsModal';
import PostCard from './PostCard';

const INTERESTS = ['All', 'Nightlife', 'Nature', 'Food', 'Beach', 'History'];

const Connect: React.FC = () => {
   const { t } = useLanguage();
   const { user } = useAuth();
   const [currentUserProfile, setCurrentUserProfile] = useState<SocialUser | null>(null);
   const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
   const [posts, setPosts] = useState<SocialPost[]>([]);
   const [users, setUsers] = useState<SocialUser[]>([]);
   const [groups, setGroups] = useState<SocialGroup[]>([]);
   const [myTribes, setMyTribes] = useState<SocialGroup[]>([]);
   const [hotZones, setHotZones] = useState<HotZone[]>([]);
   const [events, setEvents] = useState<EventItem[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [showStamps, setShowStamps] = useState(false);

   const [newPostContent, setNewPostContent] = useState('');
   const [activeInterest, setActiveInterest] = useState('All');
   const [activeTribe, setActiveTribe] = useState<SocialGroup | null>(null);
   const [currentZone, setCurrentZone] = useState<HotZone | null>(null);
   const [selectedImage, setSelectedImage] = useState<File | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [tribeQuery, setTribeQuery] = useState('');
   const [isJoiningTribe, setIsJoiningTribe] = useState(false);
   const [selectedProfile, setSelectedProfile] = useState<SocialUser | null>(null);
   const [selectedTribeForPost, setSelectedTribeForPost] = useState<SocialGroup | null>(null);
   const [waveStatus, setWaveStatus] = useState<'connected' | 'pending' | 'none'>('none');

   // Reactive Loader
   const loadData = async (tribeId?: string) => {
      try {
         let [fetchedPosts, fetchedGroups, fetchedUsers, fetchedZones, fetchedEvents] = await Promise.all([
            SocialService.getFeed(20, tribeId),
            SocialService.getGroups(),
            SocialService.getTopExplorers(),
            SocialService.getHotZones(),
            SocialService.getEvents()
         ]);

         // Auto-seed if empty
         if (fetchedPosts.length === 0 && !tribeId) {
            await SocialService.seedDatabase();
            // Re-fetch
            [fetchedPosts, fetchedGroups, fetchedUsers, fetchedZones, fetchedEvents] = await Promise.all([
               SocialService.getFeed(),
               SocialService.getGroups(),
               SocialService.getTopExplorers(),
               SocialService.getHotZones(),
               SocialService.getEvents()
            ]);
         }

         if (user) {
            const profile = await SocialService.ensureUserProfile(user);
            setCurrentUserProfile(profile);

            // Fetch user's tribes
            const userTribes = await SocialService.getGroupsForUser(user.id);
            setMyTribes(userTribes);
         }

         if (user) {
            fetchedGroups = fetchedGroups.map(g => ({
               ...g,
               isMember: (g as any).memberIds?.includes(user.id)
            }));
         }

         setPosts(fetchedPosts);
         setGroups(fetchedGroups);
         setUsers(fetchedUsers);
         setHotZones(fetchedZones);
         setEvents(fetchedEvents);
      } catch (err) {
         console.error("Failed to load social data", err);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      loadData();
   }, [user]);

   const handleDropAnchor = (zone: HotZone) => {
      if (currentZone?.id === zone.id) return;
      if (!currentUserProfile) return;

      setCurrentZone(zone);

      const checkInPost: Omit<SocialPost, 'id' | 'timestamp' | 'likes' | 'comments'> = {
         author: currentUserProfile,
         type: 'check_in',
         content: `Dropped anchor at ${zone.name}. Come say hi!`,
         location: zone.name,
      };

      SocialService.createPost(checkInPost).then(async () => {
         await SocialService.awardStamp(currentUserProfile.id, zone);
         loadData();
      });
   };

   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setSelectedImage(file);
         setImagePreview(URL.createObjectURL(file));
      }
   };

   const handlePost = async () => {
      if ((!newPostContent.trim() && !selectedImage) || !currentUserProfile) return;

      let imageUrl;
      if (selectedImage) {
         try {
            imageUrl = await SocialService.uploadImage(selectedImage);
         } catch (e) {
            console.error("Failed to upload image", e);
            alert("Failed to upload image");
            return;
         }
      }

      const newPost: Omit<SocialPost, 'id' | 'timestamp' | 'likes' | 'comments'> = {
         author: currentUserProfile,
         type: 'status',
         content: newPostContent,
         location: currentZone ? currentZone.name : undefined,
         imageUrl,
         groupId: selectedTribeForPost?.id,
         tribeName: selectedTribeForPost?.interest
      };

      setNewPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedTribeForPost(null);
      await SocialService.createPost(newPost);
      loadData(activeTribe?.id);
   };

   const handleJoinTribe = async (groupId: string, interest?: string) => {
      try {
         await SocialService.joinGroup(groupId);
         setIsJoiningTribe(false);
         setActiveInterest(interest ? interest.charAt(0).toUpperCase() + interest.slice(1) : 'All');
         loadData(activeTribe?.id);
      } catch (err) {
         console.error('Failed to join tribe', err);
      }
   };

   const handleSelectTribe = async (tribe: SocialGroup | null) => {
      setActiveTribe(tribe);
      setActiveInterest('All');
      loadData(tribe?.id);
   };

   const handleCreateTribe = async () => {
      const tag = tribeQuery.trim();
      if (!tag) return;
      try {
         const tribe = await SocialService.createOrJoinGroup(`${tag} Tribe`, tag);
         setTribeQuery('');
         setActiveInterest(tag.charAt(0).toUpperCase() + tag.slice(1));
         loadData();
      } catch (err) {
         console.error('Failed to create tribe', err);
      }
   };

   const handleVouch = async (postId: string) => {
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost) {
         const isLiked = !targetPost.isLiked;
         setPosts(posts.map(p => p.id === postId ? { ...p, isLiked, likes: p.likes + (isLiked ? 1 : -1) } : p));
         await SocialService.toggleLike(postId, isLiked);
      }
   };

   const handleWave = async (targetUser: SocialUser) => {
      if (!currentUserProfile) return;
      await SocialService.wave(currentUserProfile, targetUser.id);
      const newStatus = await SocialService.getConnectionStatus(currentUserProfile.id, targetUser.id);
      setWaveStatus(newStatus);

      if (newStatus === 'connected') {
         alert(`You're now connected with ${targetUser.name}! 🤝`);
      } else {
         alert(`You waved at ${targetUser.name}! 👋`);
      }
   };

   const handleGetTickets = (event: EventItem) => {
      alert(`Opening ticket page for ${event.title}...`);
   };

   const handleViewProfile = async (userId: string) => {
      const profile = await SocialService.getUserProfile(userId);
      if (profile) {
         setSelectedProfile(profile);
         if (currentUserProfile) {
            const status = await SocialService.getConnectionStatus(currentUserProfile.id, userId);
            setWaveStatus(status);
         }
      }
   };

   // Filter logic
   const visiblePosts = activeInterest === 'All' ? posts : posts.filter(p => {
      const interestLower = activeInterest.toLowerCase();
      const matchesAuthor = p.author.interests?.some(i => i.toLowerCase() === interestLower);
      const matchesContent = p.content.toLowerCase().includes(interestLower);
      const matchesHashtag = p.hashtags?.some(h => h.toLowerCase() === interestLower);
      return matchesAuthor || matchesContent || matchesHashtag;
   });

   return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-20">
         <div className="container mx-auto px-4 md:px-6 max-w-7xl">

            {/* HEADER HERO */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
               <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{t('connect_title')}</h1>
                  <p className="text-slate-500 text-lg max-w-2xl">{t('connect_subtitle')}</p>
               </div>

               {/* VIEW TOGGLE */}
               <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
                  <button
                     onClick={() => setViewMode('feed')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'feed' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                     <List size={16} /> Feed
                  </button>
                  <button
                     onClick={() => setViewMode('map')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                     <MapIcon size={16} /> Map
                  </button>
               </div>
            </div>

            {viewMode === 'map' ? (
               <div className="animate-in fade-in slide-in-from-bottom-4">
                  {currentUserProfile && <IslandMap currentUser={currentUserProfile} />}
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">

                  {/* LEFT COLUMN: PASSPORT (Sticky) */}
                  <div className="hidden lg:block lg:col-span-1">
                     {currentUserProfile && (
                        <PassportCard
                           user={currentUserProfile}
                           onViewStamps={() => setShowStamps(true)}
                        />
                     )}
                  </div>

                  {/* CENTER COLUMN: FEED & VIBE MAP */}
                  <div className="lg:col-span-2 space-y-6">

                     {/* Vibe Map (Pulse Bar) */}
                     <div>
                        <div className="flex justify-between items-end mb-3 px-1">
                           <h3 className="font-bold text-slate-900 text-lg">Island Pulse</h3>
                           <button onClick={() => setViewMode('map')} className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1">
                              View Full Map <MapIcon size={12} />
                           </button>
                        </div>
                        <PulseBar
                           hotZones={hotZones}
                           onDropAnchor={handleDropAnchor}
                           currentZoneId={currentZone?.id}
                        />
                     </div>

                     {/* My Tribes - Horizontal Scroll */}
                     {myTribes.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                           <h3 className="font-bold text-slate-900 text-sm mb-3">My Tribes</h3>
                           <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                              <button
                                 onClick={() => handleSelectTribe(null)}
                                 className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!activeTribe
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                              >
                                 All Tribes
                              </button>
                              {myTribes.map(tribe => (
                                 <button
                                    key={tribe.id}
                                    onClick={() => handleSelectTribe(tribe)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTribe?.id === tribe.id
                                       ? 'bg-slate-900 text-white shadow-md'
                                       : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                                       }`}
                                 >
                                    <img src={tribe.image} className="w-5 h-5 rounded-full object-cover" alt={tribe.name} />
                                    #{tribe.interest}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     {/* Interest Filters */}
                     {!activeTribe && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                           {INTERESTS.map(interest => (
                              <button
                                 key={interest}
                                 onClick={() => setActiveInterest(interest)}
                                 className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeInterest === interest
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                              >
                                 {interest === 'All' ? 'For You' : `#${interest}`}
                              </button>
                           ))}
                        </div>
                     )}

                     {/* Post Creator */}
                     {currentUserProfile && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative z-10">
                           <div className="flex gap-4 mb-4">
                              <img src={currentUserProfile.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100" />
                              <div className="flex-1">
                                 <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder={currentZone ? `Share a moment at ${currentZone.name}...` : "What's happening on the island?"}
                                    className="w-full bg-transparent border-none outline-none text-sm min-h-[60px] placeholder:text-slate-400"
                                 />
                                 {imagePreview && (
                                    <div className="relative mt-2 inline-block">
                                       <img src={imagePreview} className="h-20 rounded-lg border border-slate-200" />
                                       <button
                                          onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                          className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-0.5"
                                       >
                                          <X size={12} />
                                       </button>
                                    </div>
                                 )}
                                 <div className="flex flex-wrap gap-2 mt-2">
                                    {currentZone && (
                                       <div className="inline-flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-lg font-medium">
                                          <MapPin size={12} /> Anchored at {currentZone.name}
                                       </div>
                                    )}
                                    {selectedTribeForPost && (
                                       <div className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg font-medium">
                                          #{selectedTribeForPost.interest}
                                          <button onClick={() => setSelectedTribeForPost(null)} className="ml-1">
                                             <X size={10} />
                                          </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <div className="flex gap-2 items-center">
                                 <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                 />
                                 <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"
                                 >
                                    <ImageIcon size={18} />
                                 </button>
                                 {myTribes.length > 0 && !selectedTribeForPost && (
                                    <div className="relative group">
                                       <button className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 hover:bg-slate-50 rounded-lg">
                                          + Add to Tribe
                                       </button>
                                       <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[160px] z-20">
                                          {myTribes.map(tribe => (
                                             <button
                                                key={tribe.id}
                                                onClick={() => setSelectedTribeForPost(tribe)}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2"
                                             >
                                                <img src={tribe.image} className="w-4 h-4 rounded-full object-cover" alt="" />
                                                #{tribe.interest}
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                              <button
                                 onClick={handlePost}
                                 disabled={!newPostContent.trim() && !selectedImage}
                                 className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                              >
                                 Post <Send size={12} />
                              </button>
                           </div>
                        </div>
                     )}

                     {/* Feed */}
                     <div className="space-y-4">
                        {visiblePosts.map(post => (
                          <PostCard
                             key={post.id}
                             post={post}
                             currentUser={currentUserProfile}
                             onVouch={handleVouch}
                             onViewProfile={handleViewProfile}
                          />
                       ))}
                    </div>
                 </div>

                  {/* RIGHT COLUMN: Tribes + RADAR (Sticky) */}
                  <div className="hidden lg:flex lg:col-span-1 flex-col gap-4">
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                           <h3 className="font-bold text-slate-900 text-sm">Tribes</h3>
                           <button onClick={() => setIsJoiningTribe(!isJoiningTribe)} className="text-xs font-bold text-teal-600">Join/Create</button>
                        </div>
                        {isJoiningTribe && (
                           <div className="flex gap-2 mb-3">
                              <input
                                 value={tribeQuery}
                                 onChange={(e) => setTribeQuery(e.target.value)}
                                 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                                 placeholder="Hashtag or interest (e.g. Nightlife)"
                              />
                              <button onClick={handleCreateTribe} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Create</button>
                           </div>
                        )}
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                           {groups.map(g => (
                              <div key={g.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                                 <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100">
                                    <img src={g.image} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-900 truncate">{g.name}</div>
                                    <div className="text-[11px] text-slate-500">{g.members} members • #{g.interest}</div>
                                 </div>
                                 {!g.isMember && (
                                    <button onClick={() => handleJoinTribe(g.id, g.interest)} className="text-[11px] font-bold text-teal-600 px-2 py-1 rounded-full border border-teal-200 hover:bg-teal-50">
                                       Join
                                    </button>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>

                     <Radar
                        topExplorers={users}
                        upcomingEvents={events}
                        onWave={handleWave}
                        onGetTickets={handleGetTickets}
                     />
                  </div>
               </div>
            )}

            {/* MODALS */}
            {showStamps && currentUserProfile && (
               <StampsModal user={currentUserProfile} onClose={() => setShowStamps(false)} />
            )}

            {selectedProfile && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProfile(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                     <button onClick={() => setSelectedProfile(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                     </button>

                     {/* Profile Header */}
                     <div className="flex items-center gap-3 mb-4">
                        <img src={selectedProfile.avatar} className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-100" />
                        <div className="flex-1">
                           <div className="text-lg font-bold text-slate-900">{selectedProfile.name}</div>
                           <div className="text-xs text-slate-500">Rank: {selectedProfile.rank}</div>
                           <div className="text-xs text-slate-500">Vouches: {selectedProfile.vouches} • Trust: {selectedProfile.trustScore}</div>
                        </div>
                     </div>

                     {/* Wave Button */}
                     {currentUserProfile && currentUserProfile.id !== selectedProfile.id && (
                        <div className="mb-4">
                           {waveStatus === 'connected' ? (
                              <div className="w-full py-2 px-4 bg-green-50 text-green-700 rounded-xl text-sm font-bold text-center border border-green-200">
                                 Connected 🤝
                              </div>
                           ) : waveStatus === 'pending' ? (
                              <div className="w-full py-2 px-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold text-center border border-amber-200">
                                 Wave Pending 👋
                              </div>
                           ) : (
                              <button
                                 onClick={() => handleWave(selectedProfile)}
                                 className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors"
                              >
                                 Wave to Connect 👋
                              </button>
                           )}
                        </div>
                     )}

                     {/* Interests */}
                     <div className="space-y-3 text-sm text-slate-700">
                        <div>
                           <div className="font-bold text-slate-900 text-xs uppercase mb-2">Interests</div>
                           <div className="flex flex-wrap gap-2">
                              {(selectedProfile.interests || []).map((i: string) => (
                                 <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">#{i}</span>
                              ))}
                           </div>
                        </div>

                        {/* Passport Stamps */}
                        {selectedProfile.passportStamps && selectedProfile.passportStamps.length > 0 && (
                           <div>
                              <div className="font-bold text-slate-900 text-xs uppercase mb-2 flex items-center justify-between">
                                 <span>Passport Stamps</span>
                                 <span className="text-slate-500 font-normal">{selectedProfile.passportStamps.length} stamps</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                 {selectedProfile.passportStamps.slice(0, 8).map((s: any) => (
                                    <div key={s.id} className="px-3 py-2 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-2">
                                       <span>{s.icon || '📍'}</span>
                                       <span className="truncate">{s.locationName}</span>
                                    </div>
                                 ))}
                              </div>
                              {selectedProfile.passportStamps.length > 8 && (
                                 <div className="text-xs text-slate-500 mt-2 text-center">
                                    +{selectedProfile.passportStamps.length - 8} more stamps
                                 </div>
                              )}
                           </div>
                        )}

                        {/* User's Tribes */}
                        <div>
                           <div className="font-bold text-slate-900 text-xs uppercase mb-2">Their Tribes</div>
                           <div className="space-y-2">
                              {groups.filter(g => g.memberIds?.includes(selectedProfile.id)).slice(0, 5).map((g: SocialGroup) => (
                                 <div key={g.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                       <img src={g.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                       <div className="min-w-0 flex-1">
                                          <div className="text-xs font-bold text-slate-900 truncate">#{g.interest}</div>
                                          <div className="text-[10px] text-slate-500">{g.members} members</div>
                                       </div>
                                    </div>
                                    {!g.isMember && (
                                       <button
                                          onClick={() => handleJoinTribe(g.id, g.interest)}
                                          className="text-[10px] font-bold text-teal-600 px-2 py-1 rounded-full border border-teal-200 hover:bg-teal-50 whitespace-nowrap"
                                       >
                                          Join
                                       </button>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>
   );
};

export default Connect;
