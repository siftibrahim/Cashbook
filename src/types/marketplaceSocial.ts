export type SocialReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export interface SellerPaymentSettings {
  acceptsBkash?: boolean;
  bkashNumber?: string;
  bkashType?: 'personal' | 'merchant' | 'agent';
  acceptsNagad?: boolean;
  nagadNumber?: string;
  nagadType?: 'personal' | 'merchant';
  acceptsRocket?: boolean;
  rocketNumber?: string;
  acceptsBank?: boolean;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankRoutingNumber?: string;
  acceptsCod?: boolean;
  acceptCod?: boolean; // ক্যাশ অন ডেলিভারি
  instructions?: string;
  paymentInstructions?: string; // বিশেষ পেমেন্ট নোট / নির্দেশিকা
}

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
  role?: 'customer' | 'seller' | 'creator' | 'admin';
  joinedDate: string;
  followersCount: number;
  followingCount: number;
  friendsCount?: number;
  friendIds?: string[];
  isVerified: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationData?: {
    docType?: string;
    docNumber?: string;
    fullName?: string;
    dob?: string;
    submittedAt?: string;
    verifiedAt?: string;
    status?: string;
  };
  rating: number;
  totalSales: number;
  totalOrders: number;
  blockedUserIds: string[];
  isBlocked?: boolean;
  blockReason?: string;
  blockedAt?: string;
  isTopRated?: boolean;
  isModerator?: boolean;
  canPost?: boolean;
  canSell?: boolean;
  feeExempt?: boolean;
  customPowers?: string[];
  twoFactorEnabled?: boolean;
  twoFactorPin?: string;
  privacySettings?: {
    postVisibility: 'public' | 'friends' | 'only_me';
    requestVisibility: 'everyone' | 'friends_of_friends';
    showPhone: boolean;
    activeStatus?: boolean;
  };
  notificationSettings?: {
    messageSound: boolean;
    comments: boolean;
    orders: boolean;
    soundVolume?: number;
  };
  marketplaceSettings?: {
    preferredPayment: 'cod' | 'bkash' | 'nagad' | 'rocket' | 'card';
    defaultShippingAddress?: string;
    deliveryRegion?: 'dhaka_inside' | 'dhaka_outside' | 'nationwide';
    smsTrackingAlerts?: boolean;
    oneClickBuy?: boolean;
    riderDeliveryNote?: string;
  };
  appearanceSettings?: {
    theme: 'light' | 'dark' | 'blue';
    fontSize?: 'normal' | 'medium' | 'large';
    language?: 'bn' | 'en';
  };
  sellerPaymentSettings?: SellerPaymentSettings;
  activeSessions?: Array<{
    id: string;
    deviceName: string;
    ip: string;
    loginAt: string;
    isCurrent?: boolean;
  }>;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  docType: 'nid' | 'passport' | 'driving_license' | 'trade_license' | string;
  docNumber?: string;
  fullName: string;
  dob?: string;
  docFront: string;
  docBack?: string;
  selfie: string;
  status: 'pending' | 'verified' | 'rejected';
  adminNotes?: string;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
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
  sharedPost?: SocialPost;
  sharedProduct?: LinkedProduct;
  isShared?: boolean;
  sharedCaption?: string;
  originalAuthorName?: string;
  createdAt: string;
  reactions: Record<SocialReactionType, number>;
  userReactions: Record<string, SocialReactionType>; // customerId -> reactionType
  comments: SocialComment[];
  sharesCount: number;
}

export interface MarketplaceBoostRequest {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerUsername?: string;
  packageId: 'boost_3d' | 'boost_7d' | 'boost_15d' | 'boost_30d';
  packageName: string;
  days: number;
  amount: number;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'manual';
  senderNumber: string;
  trxId: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  requestedAt: string;
  approvedAt?: string;
  expiresAt?: string;
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
  sellerPaymentSettings?: SellerPaymentSettings;
  isPromoted?: boolean;
  promotedBadge?: string;
  promotedUntil?: string;
  promotedAt?: string;
  boostPriority?: number;
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
