export type SocialReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  senderLocation?: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  username: string; // e.g. @fahim_hossain
  avatar: string;
  coverPhoto: string;
  bio: string;
  phone: string;
  address: string;
  location: string; // e.g. ধানমন্ডি, ঢাকা
  joinedDate: string;
  followersCount: number;
  followingCount: number;
  friendsCount?: number;
  friendIds?: string[];
  isVerified: boolean;
  rating: number;
  totalSales: number;
  totalOrders: number;
  blockedUserIds: string[];
}

export interface SocialComment {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface LinkedProduct {
  id: string;
  name: string;
  salePrice: number;
  regularPrice?: number;
  imageUrl?: string;
  category?: string;
  condition?: string;
  location?: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  content: string;
  images: string[];
  feeling?: {
    emoji: string;
    label: string;
  };
  linkedProduct?: LinkedProduct;
  createdAt: string;
  reactions: Record<SocialReactionType, number>;
  userReactions: Record<string, SocialReactionType>; // customerId -> reactionType
  comments: SocialComment[];
  sharesCount: number;
}

export interface CustomerProductItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerUsername: string;
  sellerAvatar: string;
  sellerPhone: string;
  sellerLocation: string;
  name: string;
  description: string;
  salePrice: number;
  regularPrice?: number;
  category: string;
  condition: 'new' | 'like_new' | 'used_good' | 'used_fair';
  images: string[];
  imageUrl: string;
  inStock: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  productContext?: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantUsername: string;
  participantPhone?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export type NotificationType = 'comment' | 'reaction' | 'message' | 'order' | 'share' | 'system' | 'friend_request' | 'friend_accept';

export interface SocialNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: NotificationType;
  text: string;
  targetId?: string; // postId or conversationId or orderId
  reactionType?: SocialReactionType;
  createdAt: string;
  read: boolean;
}
