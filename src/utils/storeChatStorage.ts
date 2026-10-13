export interface StoreChatMessage {
  id: string;
  sender: 'customer' | 'vendor';
  senderName: string;
  senderPhone?: string;
  text: string;
  timestamp: number;
}

export interface StoreChatThread {
  id: string;
  customerName: string;
  customerPhone: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadByVendor: number;
  unreadByCustomer: number;
  messages: StoreChatMessage[];
}

const STORAGE_KEY = 'ibrahim_khata_store_chats_v1';
const CHAT_SYNC_EVENT = 'store_chat_sync';

export function getStoreChatThreads(): StoreChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed an initial friendly demo message if empty
      const initialThread: StoreChatThread = {
        id: 'cust_sample_1',
        customerName: 'তানভীর হাসান',
        customerPhone: '01712345678',
        lastMessage: 'আসসালামু আলাইকুম, এই পণ্যটি কি হোম ডেলিভারিতে পাওয়া যাবে?',
        lastMessageAt: Date.now() - 3600000,
        unreadByVendor: 1,
        unreadByCustomer: 0,
        messages: [
          {
            id: 'msg_1',
            sender: 'customer',
            senderName: 'তানভীর হাসান',
            senderPhone: '01712345678',
            text: 'আসসালামু আলাইকুম, এই পণ্যটি কি হোম ডেলিভারিতে পাওয়া যাবে?',
            timestamp: Date.now() - 3600000,
          },
        ],
      };
      saveStoreChatThreads([initialThread]);
      return [initialThread];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading store chat threads:', e);
    return [];
  }
}

export function saveStoreChatThreads(threads: StoreChatThread[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    window.dispatchEvent(new CustomEvent(CHAT_SYNC_EVENT, { detail: threads }));
  } catch (e) {
    console.error('Error saving store chat threads:', e);
  }
}

export function sendCustomerMessage(
  threadId: string,
  customerName: string,
  customerPhone: string,
  text: string
): StoreChatMessage {
  const threads = getStoreChatThreads();
  let thread = threads.find((t) => t.id === threadId || (customerPhone && t.customerPhone === customerPhone));

  const newMsg: StoreChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender: 'customer',
    senderName: customerName || 'সম্মানিত কাস্টমার',
    senderPhone: customerPhone || '',
    text: text.trim(),
    timestamp: Date.now(),
  };

  if (!thread) {
    thread = {
      id: threadId || `th_${Date.now()}`,
      customerName: customerName || 'সম্মানিত কাস্টমার',
      customerPhone: customerPhone || '',
      lastMessage: newMsg.text,
      lastMessageAt: newMsg.timestamp,
      unreadByVendor: 1,
      unreadByCustomer: 0,
      messages: [newMsg],
    };
    threads.unshift(thread);
  } else {
    thread.messages.push(newMsg);
    thread.lastMessage = newMsg.text;
    thread.lastMessageAt = newMsg.timestamp;
    thread.unreadByVendor = (thread.unreadByVendor || 0) + 1;
    if (customerName && thread.customerName === 'সম্মানিত কাস্টমার') {
      thread.customerName = customerName;
    }
    if (customerPhone && !thread.customerPhone) {
      thread.customerPhone = customerPhone;
    }
  }

  saveStoreChatThreads(threads);
  return newMsg;
}

export function sendVendorReply(threadId: string, text: string, vendorName: string = 'স্টোর অ্যাডমিন'): StoreChatMessage | null {
  const threads = getStoreChatThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;

  const newMsg: StoreChatMessage = {
    id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender: 'vendor',
    senderName: vendorName,
    text: text.trim(),
    timestamp: Date.now(),
  };

  thread.messages.push(newMsg);
  thread.lastMessage = `[ভেন্ডর]: ${newMsg.text}`;
  thread.lastMessageAt = newMsg.timestamp;
  thread.unreadByVendor = 0;
  thread.unreadByCustomer = (thread.unreadByCustomer || 0) + 1;

  saveStoreChatThreads(threads);
  return newMsg;
}

export function markThreadAsReadByVendor(threadId: string): void {
  const threads = getStoreChatThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (thread && thread.unreadByVendor > 0) {
    thread.unreadByVendor = 0;
    saveStoreChatThreads(threads);
  }
}

export function markThreadAsReadByCustomer(threadId: string): void {
  const threads = getStoreChatThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (thread && thread.unreadByCustomer > 0) {
    thread.unreadByCustomer = 0;
    saveStoreChatThreads(threads);
  }
}

export function getTotalUnreadVendorMessages(): number {
  const threads = getStoreChatThreads();
  return threads.reduce((sum, t) => sum + (t.unreadByVendor || 0), 0);
}

export { CHAT_SYNC_EVENT };
