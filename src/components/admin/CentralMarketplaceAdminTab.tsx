import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Sliders,
  DollarSign,
  Phone,
  MapPin,
  ExternalLink,
  Sparkles,
  Zap,
  CreditCard,
  Wallet,
  Copy,
  Check,
  ArrowDownLeft,
  Building,
  XCircle,
  Info,
  Lock,
  Ban,
  PauseCircle,
  PlayCircle,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  ChevronLeft,
  ArrowLeftRight,
  FileText,
  Printer,
  RotateCcw,
  MessageSquare,
  Percent,
} from 'lucide-react';
import { marketplaceAdminApi } from '../../services/marketplaceAdminService';
import { MarketplaceOrderInvoiceModal } from '../marketplace/MarketplaceOrderInvoiceModal';
import { MarketplaceCourierModal } from '../marketplace/MarketplaceCourierModal';
import { MarketplaceReturnRefundModal } from '../marketplace/MarketplaceReturnRefundModal';
import { MarketplaceSmsModal } from '../marketplace/MarketplaceSmsModal';
import { MarketplaceProfitReportTab } from './MarketplaceProfitReportTab';
import { PaymentSettingsModal } from './PaymentSettingsModal';
import { SystemPaymentSettings } from '../../types/adminTypes';
import { subscribeToPaymentSettings, savePaymentSettingsToCloud } from '../../services/adminService';

interface CentralMarketplaceAdminTabProps {
  isSuperAdmin: boolean;
}

export const CentralMarketplaceAdminTab: React.FC<CentralMarketplaceAdminTabProps> = ({ isSuperAdmin }) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'vendor_balances' | 'profit' | 'payouts' | 'products' | 'categories' | 'settings'>('orders');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentSettingsModalOpen, setIsPaymentSettingsModalOpen] = useState(false);
  const [systemPaymentSettings, setSystemPaymentSettings] = useState<SystemPaymentSettings | null>(null);
  const [data, setData] = useState<{
    masterOrders: any[];
    subOrders: any[];
    products: any[];
    categories: any[];
    settings: any;
  }>({
    masterOrders: [],
    subOrders: [],
    products: [],
    categories: [],
    settings: {},
  });

  // Vendor Balances & Earnings Ledger State (কোন ভেন্ডর কত টাকা পাবে ও প্ল্যাটফর্মের লাভ)
  const [vendorBalances, setVendorBalances] = useState<{
    summary: {
      totalVendorsCount: number;
      totalOrdersCount?: number;
      totalDeliveredOrdersCount?: number;
      totalSoldProductsCount?: number;
      totalSoldUnitsCount?: number;
      totalGrossSales: number;
      totalDeliveredSales: number;
      totalPlatformCommissionProfit?: number;
      totalDeliveryMarginProfit?: number;
      totalPlatformProfit?: number;
      thisMonthProfit?: number;
      defaultCommissionPercent?: number;
      platformDeliveryMargin?: number;
      monthlyProfitBreakdown?: any[];
      totalSettledAmount: number;
      totalDueToVendors: number;
      totalPendingWithdrawals: number;
      allSoldProducts?: any[];
    };
    vendors: any[];
  }>({
    summary: {
      totalVendorsCount: 0,
      totalOrdersCount: 0,
      totalDeliveredOrdersCount: 0,
      totalSoldProductsCount: 0,
      totalSoldUnitsCount: 0,
      totalGrossSales: 0,
      totalDeliveredSales: 0,
      totalPlatformCommissionProfit: 0,
      totalDeliveryMarginProfit: 0,
      totalPlatformProfit: 0,
      thisMonthProfit: 0,
      defaultCommissionPercent: 5,
      platformDeliveryMargin: 10,
      monthlyProfitBreakdown: [],
      totalSettledAmount: 0,
      totalDueToVendors: 0,
      totalPendingWithdrawals: 0,
      allSoldProducts: [],
    },
    vendors: [],
  });
  const [isVendorBalancesLoading, setIsVendorBalancesLoading] = useState(false);
  const [vendorBalanceSearch, setVendorBalanceSearch] = useState('');
  const [vendorBalanceFilter, setVendorBalanceFilter] = useState<'all' | 'due' | 'settled' | 'held'>('all');
  const [vendorBalanceSort, setVendorBalanceSort] = useState<'due_desc' | 'sales_desc' | 'orders_desc'>('due_desc');

  // Direct Payout Modal State (kept null — no payout option in Super Admin Central Mall)
  const [directPayoutVendor, setDirectPayoutVendor] = useState<any | null>(null);
  const [directPayoutAmount, setDirectPayoutAmount] = useState<string>('');
  const [directPayoutMethod, setDirectPayoutMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash'>('bkash');
  const [directPayoutAccount, setDirectPayoutAccount] = useState<string>('');
  const [directPayoutTrxId, setDirectPayoutTrxId] = useState<string>('');
  const [directPayoutNote, setDirectPayoutNote] = useState<string>('');
  const [isSubmittingDirectPayout, setIsSubmittingDirectPayout] = useState(false);

  // Vendor Detail Breakdown Drawer / Modal State (কোন কোন প্রোডাক্ট বিক্রি হয়েছে ও কোন প্রোডাক্টের টাকা পাবে)
  const [selectedVendorForDetail, setSelectedVendorForDetail] = useState<any | null>(null);
  const [detailFilterTab, setDetailFilterTab] = useState<'all' | 'delivered' | 'in_progress'>('all');
  const [detailViewSection, setDetailViewSection] = useState<'products' | 'orders'>('products');

  // Payout Management State
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all');
  const [payoutSearch, setPayoutSearch] = useState<string>('');
  const [selectedPayoutToProcess, setSelectedPayoutToProcess] = useState<any | null>(null);
  const [adminTrxIdInput, setAdminTrxIdInput] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [isProcessingPayout, setIsProcessingPayout] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Escrow Payment Approval & Rejection State
  const [isApprovingPayment, setIsApprovingPayment] = useState<string | null>(null);
  const [approvingOrder, setApprovingOrder] = useState<any | null>(null);
  const [approvalAdminNote, setApprovalAdminNote] = useState<string>('');
  const [rejectingOrder, setRejectingOrder] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState<'all' | 'listed' | 'unlisted' | 'blocked'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [productDeleteModal, setProductDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);
  const [vendorPayoutHolds, setVendorPayoutHolds] = useState<Record<string, { isHeld: boolean; reason?: string }>>({});
  const [vendorHoldModal, setVendorHoldModal] = useState<{ vendorId: string; vendorName: string; isHeld: boolean; currentReason?: string } | null>(null);
  const [vendorHoldReasonInput, setVendorHoldReasonInput] = useState<string>('');
  const [isUpdatingVendorHold, setIsUpdatingVendorHold] = useState<boolean>(false);
  const [selectedMasterOrder, setSelectedMasterOrder] = useState<any | null>(null);

  // Advanced Commerce Modals: Invoice Print, Courier Tracking, Return/Refund, SMS Alert
  const [printingInvoiceOrder, setPrintingInvoiceOrder] = useState<any | null>(null);
  const [courierManagingOrder, setCourierManagingOrder] = useState<any | null>(null);
  const [returnRefundingOrder, setReturnRefundingOrder] = useState<any | null>(null);
  const [smsNotifyingOrder, setSmsNotifyingOrder] = useState<any | null>(null);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', nameBn: '', nameEn: '', slug: '', icon: 'ShoppingBag', sortOrder: 1, isActive: true });

  // Platform & Delivery Settings
  const [settingsForm, setSettingsForm] = useState({
    isMarketplaceActive: true,
    codEnabled: true,
    commissionPercent: 5,
    platformDeliveryMargin: 10,
    deliveryFeeDhaka: 70,
    deliveryFeeOutside: 130,
    bannerNotice: 'সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি ও ১০০% অরিজিনাল পণ্যের নিশ্চয়তা!',
    bannerImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
    bannerTitle: 'আপনার প্রতিদিনের প্রয়োজনীয় সব পণ্য এখন এক জায়গায়!',
    bannerSubtitle: 'সরাসরি ফ্রেশ সোর্স থেকে খাঁটি পণ্য নিয়ে সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।',
    bannerTag: '⚡ মেগা ধামাকা অফার',
    bannerLink: '#marketplace-best-offers-section',
    bannerButtonText: 'এখনই অর্ডার করুন',
    bannerActive: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setLoadError(null);
    try {
      const res = await marketplaceAdminApi.getOverview();
      if (res && res.success) {
        setData({
          masterOrders: res.masterOrders || [],
          subOrders: res.subOrders || [],
          products: res.products || [],
          categories: res.categories || [],
          settings: res.settings || {},
        });
        if (res.vendorPayoutHolds) {
          setVendorPayoutHolds(res.vendorPayoutHolds);
        }
        setLastSyncedAt(new Date());
        if (res.settings) {
          setSettingsForm((prev) => ({
            ...prev,
            isMarketplaceActive: res.settings.isMarketplaceActive !== false,
            codEnabled: res.settings.codEnabled !== false,
            commissionPercent: res.settings.commissionPercent ?? 5,
            platformDeliveryMargin: res.settings.platformDeliveryMargin ?? 10,
            deliveryFeeDhaka: res.settings.deliveryFeeDhaka ?? 70,
            deliveryFeeOutside: res.settings.deliveryFeeOutside ?? 130,
            bannerNotice: res.settings.bannerNotice ?? prev.bannerNotice,
            bannerImageUrl: res.settings.bannerImageUrl ?? prev.bannerImageUrl,
            bannerTitle: res.settings.bannerTitle ?? prev.bannerTitle,
            bannerSubtitle: res.settings.bannerSubtitle ?? prev.bannerSubtitle,
            bannerTag: res.settings.bannerTag ?? prev.bannerTag,
            bannerLink: res.settings.bannerLink ?? prev.bannerLink,
            bannerButtonText: res.settings.bannerButtonText ?? prev.bannerButtonText,
            bannerActive: res.settings.bannerActive !== false,
          }));
        }
      }

      // Load vendor payout requests
      try {
        const payoutsRes = await marketplaceAdminApi.getPayoutRequests();
        if (payoutsRes && payoutsRes.success) {
          setPayoutRequests(payoutsRes.requests || []);
        }
      } catch (e) {
        console.warn('Payout requests load notice:', e);
      }

      // Load vendor balances & earnings ledger (কে কত টাকা পাবে)
      try {
        const balancesRes = await marketplaceAdminApi.getVendorBalances();
        if (balancesRes && balancesRes.success) {
          setVendorBalances({
            summary: balancesRes.summary || {
              totalVendorsCount: 0,
              totalGrossSales: 0,
              totalDeliveredSales: 0,
              totalSettledAmount: 0,
              totalDueToVendors: 0,
              totalPendingWithdrawals: 0,
            },
            vendors: balancesRes.vendors || [],
          });
        }
      } catch (e) {
        console.warn('Vendor balances load notice:', e);
      }
    } catch (err: any) {
      console.warn('Marketplace admin load error:', err);
      setLoadError(err.message || 'মার্কেটপ্লেস ডাটা লোড হতে সমস্যা হয়েছে');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  const handleOpenDirectPayout = (vendor: any) => {
    setDirectPayoutVendor(vendor);
    const suggested = vendor.dueBalance > 0 ? vendor.dueBalance : (vendor.grossSales - vendor.settledAmount > 0 ? vendor.grossSales - vendor.settledAmount : '');
    setDirectPayoutAmount(suggested ? String(suggested) : '');
    setDirectPayoutAccount(vendor.phone || '');
    setDirectPayoutTrxId('');
    setDirectPayoutNote(`সেন্ট্রাল মার্কেটপ্লেস অর্ডার বিক্রয় বাবদ সরাসরি পেআউট`);
    setDirectPayoutMethod('bkash');
  };

  const handleConfirmDirectPayout = async () => {
    if (!directPayoutVendor) return;
    const numAmt = parseFloat(directPayoutAmount);
    if (!numAmt || numAmt <= 0) {
      showToast('⚠️ সঠিক পেআউট পরিমাণ লিখুন');
      return;
    }
    const cleanTrx = directPayoutTrxId.trim();
    if (!cleanTrx) {
      showToast('⚠️ ট্রানজেকশন আইডি (TrxID) বা ক্যাশ ভাউচার নম্বর দিন');
      return;
    }

    setIsSubmittingDirectPayout(true);
    try {
      const res = await marketplaceAdminApi.recordVendorPayout(directPayoutVendor.vendorId, {
        amount: numAmt,
        paymentMethod: directPayoutMethod,
        accountNumber: directPayoutAccount.trim() || directPayoutVendor.phone,
        transactionId: cleanTrx,
        note: directPayoutNote.trim() || 'সুপার অ্যাডমিন কর্তৃক সরাসরি পেআউট নিষ্পত্তি',
      });

      if (res && res.success) {
        showToast(`✅ ${directPayoutVendor.shopName}-কে ৳${numAmt.toLocaleString()} পেআউট সফলভাবে পরিশোধ ও রেকর্ড করা হয়েছে!`);
        setDirectPayoutVendor(null);
        setDirectPayoutAmount('');
        setDirectPayoutTrxId('');
        setDirectPayoutNote('');
        await loadData(false);
      } else {
        throw new Error(res?.message || 'পেআউট রেকর্ড করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      showToast(`❌ ${err.message || 'পেআউট প্রদান ব্যর্থ হয়েছে'}`);
    } finally {
      setIsSubmittingDirectPayout(false);
    }
  };

  const handleOpenVendorDetail = (vendor: any) => {
    setDetailFilterTab('all');
    setDetailViewSection('products');
    setSelectedVendorForDetail(vendor);
  };

  const handleOpenAllCentralMallDetail = () => {
    setDetailFilterTab('all');
    setDetailViewSection('products');
    const allOrders = vendorBalances.vendors.flatMap((v: any) =>
      (v.orders || []).map((o: any) => ({
        ...o,
        vendorShopName: v.shopName || v.name,
        vendorPhone: v.phone || '',
      }))
    );
    setSelectedVendorForDetail({
      isAllCentralMall: true,
      shopName: 'সেন্ট্রাল মল — সকল ভেন্ডরের বিক্রিত প্রোডাক্টের হিসাব',
      name: `${vendorBalances.summary.totalVendorsCount || vendorBalances.vendors.length} জন ভেন্ডর`,
      phone: '',
      grossSales: vendorBalances.summary.totalGrossSales || totalGmv,
      deliveredSales: vendorBalances.summary.totalDeliveredSales || 0,
      settledAmount: vendorBalances.summary.totalSettledAmount || 0,
      deliveredDue: vendorBalances.summary.totalDueToVendors || 0,
      dueBalance: vendorBalances.summary.totalDueToVendors || 0,
      soldProductsCount: vendorBalances.summary.totalSoldProductsCount || (vendorBalances.summary.allSoldProducts?.length || 0),
      soldUnitsCount: vendorBalances.summary.totalSoldUnitsCount || 0,
      soldProducts: vendorBalances.summary.allSoldProducts || [],
      orders: allOrders,
    });
  };

  // Real-time automatic background polling + SSE push listener
  useEffect(() => {
    loadData(true);

    const interval = setInterval(() => {
      loadData(false);
    }, 6000);

    let eventSource: EventSource | null = null;
    try {
      const token =
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('twing_jwt_token') || localStorage.getItem('ibrahim_auth_token')
          : null);
      if (token && typeof EventSource !== 'undefined') {
        eventSource = new EventSource(`/api/subscription/events?token=${encodeURIComponent(token)}`);
        eventSource.addEventListener('marketplace_updated', () => {
          loadData(false);
        });
        eventSource.addEventListener('marketplace_order_created', (e) => {
          loadData(false);
          try {
            const parsed = JSON.parse(e.data);
            showToast(`🔔 নতুন সেন্ট্রাল মার্কেটপ্লেস অর্ডার #${parsed.orderNumber || ''} এসেছে!`);
          } catch {}
        });
      }
    } catch (e) {
      console.debug('EventSource setup notice:', e);
    }

    return () => {
      clearInterval(interval);
      eventSource?.close();
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('কপি করা হয়েছে');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProcessPayout = async (action: 'approve' | 'reject' | 'hold' | 'unhold') => {
    if (!selectedPayoutToProcess) return;

    if (action === 'approve' && !adminTrxIdInput.trim()) {
      alert('দয়া করে বিকাশ/নগদ/ব্যাংক পেমেন্টের TrxID লিখুন।');
      return;
    }

    setIsProcessingPayout(true);
    try {
      const res = await marketplaceAdminApi.processPayoutRequest(selectedPayoutToProcess.id, {
        action,
        adminTransactionId: adminTrxIdInput.trim() || undefined,
        adminNote: adminNoteInput.trim() || undefined,
      });

      if (res.success) {
        showToast(
          action === 'approve'
            ? '✅ ভেন্ডর পেআউট সফলভাবে পরিশোধিত মার্ক হয়েছে!'
            : action === 'hold'
            ? '⏸️ পেআউট আবেদন সাময়িকভাবে স্থগিত/হোল্ড করা হয়েছে'
            : action === 'unhold'
            ? '▶️ পেআউট আবেদনটি সফলভাবে হোল্ড মুক্ত হয়েছে'
            : 'পেআউট আবেদনটি বাতিল করা হয়েছে'
        );
        setSelectedPayoutToProcess(null);
        setAdminTrxIdInput('');
        setAdminNoteInput('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'পেআউট প্রসেস করতে সমস্যা হয়েছে');
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Update Master Order Status
  const handleUpdateOrderStatus = async (
    orderId: string,
    overallStatus: string,
    paymentStatus?: string,
    extra?: {
      courierName?: string;
      courierTrackingCode?: string;
      deliveryManName?: string;
      deliveryManPhone?: string;
      returnReason?: string;
      refundAmount?: number;
    }
  ) => {
    try {
      await marketplaceAdminApi.updateOrderStatus(orderId, { overallStatus, paymentStatus, ...extra });
      showToast('অর্ডার তথ্য সফলভাবে আপডেট হয়েছে');
      loadData(false);
      if (selectedMasterOrder && (selectedMasterOrder.id === orderId || selectedMasterOrder.orderNumber === orderId)) {
        setSelectedMasterOrder((prev: any) => ({
          ...prev,
          overallStatus,
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(extra || {}),
        }));
      }
    } catch (err: any) {
      alert(err.message || 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const handleSaveCourierForOrder = async (data: {
    courierName: string;
    courierTrackingCode: string;
    deliveryManName?: string;
    deliveryManPhone?: string;
    autoShip?: boolean;
  }) => {
    if (!courierManagingOrder) return;
    const orderId = courierManagingOrder.id || courierManagingOrder.orderNumber;
    const targetStatus = data.autoShip ? 'shipped' : courierManagingOrder.overallStatus;
    await handleUpdateOrderStatus(orderId, targetStatus, undefined, {
      courierName: data.courierName,
      courierTrackingCode: data.courierTrackingCode,
      deliveryManName: data.deliveryManName,
      deliveryManPhone: data.deliveryManPhone,
    });
    showToast(`✅ কুরিয়ার ট্র্যাকিং #${data.courierTrackingCode || ''} সফলভাবে সংরক্ষিত হয়েছে`);
  };

  const handleProcessRefundForOrder = async (data: {
    returnReason: string;
    refundAmount: number;
    refundMethod: string;
    refundTrxId: string;
    note: string;
  }) => {
    if (!returnRefundingOrder) return;
    const orderId = returnRefundingOrder.id || returnRefundingOrder.orderNumber;
    await handleUpdateOrderStatus(orderId, 'returned', 'refunded', {
      returnReason: `${data.returnReason} (পেমেন্ট: ${data.refundMethod.toUpperCase()}${data.refundTrxId ? `, TrxID: ${data.refundTrxId}` : ''})${data.note ? ` - ${data.note}` : ''}`,
      refundAmount: data.refundAmount,
    });
    showToast(`↩️ অর্ডার #${orderId} রিটার্ন ও রিফান্ড সম্পন্ন হয়েছে`);
  };

  // Super Admin Approves Payment & Unlocks for Vendor
  const handleApprovePayment = async (order?: any) => {
    const target = order || approvingOrder;
    if (!target) return;

    setIsApprovingPayment(target.id);
    const note = approvalAdminNote.trim() || undefined;

    // Immediately update local UI state for snappy feedback
    setData((prev) => ({
      ...prev,
      masterOrders: prev.masterOrders.map((m) =>
        m.id === target.id || m.orderNumber === target.orderNumber
          ? {
              ...m,
              adminApprovalStatus: 'approved',
              isAdminApproved: true,
              paymentStatus: 'paid',
              overallStatus: 'confirmed',
            }
          : m
      ),
      subOrders: prev.subOrders.map((s) =>
        s.masterOrderId === target.id || (target.subOrderIds && target.subOrderIds.includes(s.id))
          ? {
              ...s,
              adminApprovalStatus: 'approved',
              isAdminApproved: true,
              isLockedForVendor: false,
              paymentStatus: 'paid',
              orderStatus: 'confirmed',
            }
          : s
      ),
    }));

    if (selectedMasterOrder && (selectedMasterOrder.id === target.id || selectedMasterOrder.orderNumber === target.orderNumber)) {
      setSelectedMasterOrder((prev: any) => ({
        ...prev,
        adminApprovalStatus: 'approved',
        isAdminApproved: true,
        paymentStatus: 'paid',
        overallStatus: 'confirmed',
      }));
    }

    try {
      const res = await marketplaceAdminApi.approveOrderPayment(target.id, { adminNote: note });
      showToast(res.message || `✅ অর্ডার #${target.orderNumber} এর পেমেন্ট সফলভাবে একসেপ্ট ও আনলক হয়েছে!`);
      setApprovingOrder(null);
      setApprovalAdminNote('');
      loadData(false);
    } catch (err: any) {
      console.error('Payment approval error:', err);
      showToast(`⚠️ পেমেন্ট অনুমোদন ব্যর্থ: ${err.message || 'সমস্যা হয়েছে'}`);
      setApprovingOrder(null);
      loadData(false);
    } finally {
      setIsApprovingPayment(null);
    }
  };

  // Super Admin Rejects Payment & Hides from Vendor
  const handleRejectPayment = async () => {
    if (!rejectingOrder) return;
    const target = rejectingOrder;
    const reason = rejectionReasonInput.trim() || 'পেমেন্ট যাচাইয়ে অসঙ্গতি বা ট্রানজেকশন বাতিল';

    setIsApprovingPayment(target.id);

    // Immediately update local UI state
    setData((prev) => ({
      ...prev,
      masterOrders: prev.masterOrders.map((m) =>
        m.id === target.id || m.orderNumber === target.orderNumber
          ? {
              ...m,
              adminApprovalStatus: 'rejected',
              isRejectedByAdmin: true,
              paymentStatus: 'rejected',
              overallStatus: 'cancelled',
              adminRejectionReason: reason,
            }
          : m
      ),
    }));

    if (selectedMasterOrder && (selectedMasterOrder.id === target.id || selectedMasterOrder.orderNumber === target.orderNumber)) {
      setSelectedMasterOrder((prev: any) => ({
        ...prev,
        adminApprovalStatus: 'rejected',
        isRejectedByAdmin: true,
        paymentStatus: 'rejected',
        overallStatus: 'cancelled',
      }));
    }

    try {
      const res = await marketplaceAdminApi.rejectOrderPayment(target.id, {
        rejectionReason: reason,
      });
      showToast(res.message || `❌ অর্ডার #${target.orderNumber} এর পেমেন্ট বাতিল করা হয়েছে।`);
      setRejectingOrder(null);
      setRejectionReasonInput('');
      loadData(false);
    } catch (err: any) {
      console.error('Payment rejection error:', err);
      showToast(`⚠️ পেমেন্ট বাতিল করতে সমস্যা: ${err.message || 'সমস্যা হয়েছে'}`);
      setRejectingOrder(null);
      loadData(false);
    } finally {
      setIsApprovingPayment(null);
    }
  };

  // Settle Vendor Payout
  const handleSettlePayout = async (subOrderId: string, status: string, note?: string) => {
    try {
      await marketplaceAdminApi.settleVendorPayout(subOrderId, {
        vendorPayoutStatus: status,
        adminNote: note || (status === 'hold' ? 'পেমেন্ট সাময়িকভাবে হোল্ড রাখা হয়েছে' : `সুপার অ্যাডমিন কর্তৃক পেআউট ${status === 'settled' ? 'পরিশোধিত' : status} মার্ক করা হয়েছে`),
      });
      showToast(status === 'settled' ? 'ভেন্ডর পেআউট পরিশোধিত মার্ক করা হয়েছে' : status === 'hold' ? '⏸️ সাব-অর্ডার পেআউট হোল্ড করা হয়েছে' : 'পেআউট স্ট্যাটাস আপডেট হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'পেআউট আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Moderate Product
  const handleModerateProduct = async (prodId: string, updates: any) => {
    try {
      await marketplaceAdminApi.moderateProduct(prodId, updates);
      showToast('পণ্যের মার্কেটপ্লেস স্ট্যাটাস আপডেট করা হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string, permanent: boolean = false) => {
    setIsDeletingProduct(true);
    try {
      const res = await marketplaceAdminApi.deleteProduct(productId, permanent);
      showToast(res.message || (permanent ? 'পণ্য স্থায়ীভাবে ডিলিট করা হয়েছে' : 'পণ্য মল থেকে সরানো হয়েছে'));
      setProductDeleteModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'পণ্য ডিলিট করতে সমস্যা হয়েছে');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Batch Products Action
  const handleBatchProductsAction = async (
    action: 'publish_all' | 'unpublish_all' | 'block_all' | 'permanent_delete_all_marketplace' | 'remove_all_marketplace' | 'selected_publish' | 'selected_block' | 'selected_delete',
    permanent: boolean = false
  ) => {
    if (action === 'permanent_delete_all_marketplace') {
      if (!confirm('⚠️ সতর্কতা: সেন্ট্রাল মার্কেটপ্লেসের সকল পণ্য স্থায়ীভাবে ডাটাবেস থেকে মুছে যাবে! আপনি কি নিশ্চিত?')) {
        return;
      }
    } else if (action === 'block_all') {
      if (!confirm('আপনি কি নিশ্চিত যে সেন্ট্রাল মার্কেটপ্লেসের সকল পণ্য স্থগিত/ব্লক করতে চান?')) {
        return;
      }
    } else if (action === 'remove_all_marketplace') {
      if (!confirm('আপনি কি নিশ্চিত যে সেন্ট্রাল মল থেকে সকল পণ্য সরিয়ে অপ্রকাশিত করতে চান?')) {
        return;
      }
    }

    setIsBatchProcessing(true);
    try {
      const res = await marketplaceAdminApi.batchProductsAction({
        action,
        productIds: selectedProductIds,
        permanent,
      });
      showToast(res.message || 'ব্যাচ অপারেশন সম্পন্ন হয়েছে');
      setSelectedProductIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'ব্যাচ অপারেশন ব্যর্থ হয়েছে');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Toggle Vendor Payout Hold
  const handleToggleVendorPayoutHold = async (vendorId: string, currentHeld: boolean, reason?: string) => {
    setIsUpdatingVendorHold(true);
    try {
      const res = await marketplaceAdminApi.toggleVendorPayoutHold(vendorId, {
        isHeld: !currentHeld,
        reason: reason || (!currentHeld ? 'অ্যাডমিন কর্তৃক পেমেন্ট হোল্ড করা হয়েছে' : ''),
      });
      showToast(res.message || (!currentHeld ? 'ভেন্ডর পেআউট হোল্ড করা হয়েছে' : 'ভেন্ডর পেআউট হোল্ড মুক্ত হয়েছে'));
      setVendorHoldModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'হোল্ড আপডেট ব্যর্থ হয়েছে');
    } finally {
      setIsUpdatingVendorHold(false);
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.nameBn.trim()) {
      alert('ক্যাটাগরির বাংলা নাম আবশ্যক');
      return;
    }
    try {
      await marketplaceAdminApi.saveCategory({
        ...catForm,
        slug: catForm.slug.trim() || catForm.nameEn.toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`,
      });
      setIsCatModalOpen(false);
      showToast('ক্যাটাগরি সফলভাবে সংরক্ষিত হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'ক্যাটাগরি সংরক্ষণ ব্যর্থ হয়েছে');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই ক্যাটাগরি মুছে ফেলতে চান?')) return;
    try {
      await marketplaceAdminApi.saveCategory({ id, action: 'delete' });
      showToast('ক্যাটাগরি মুছে ফেলা হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await marketplaceAdminApi.saveSettings({
        ...data.settings,
        ...settingsForm,
      });
      showToast('মার্কেটপ্লেস সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
      loadData();
    } catch (err: any) {
      alert(err.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Derived Metrics
  const totalMasterOrders = data.masterOrders.length;
  const totalGmv = data.masterOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const pendingOrdersCount = data.masterOrders.filter(o => o.overallStatus === 'processing' || o.overallStatus === 'pending').length;
  const pendingInquiriesCount = data.masterOrders.filter(
    o => o.adminApprovalStatus === 'pending_approval' || (o.isAdminApproved !== true && o.isRejectedByAdmin !== true)
  ).length;
  const totalListedProducts = data.products.filter(p => (p.isListedOnMarketplace || p.isFeaturedOnMarketplace) && p.marketplaceStatus !== 'blocked').length;
  const totalBlockedProducts = data.products.filter(p => p.marketplaceStatus === 'blocked').length;
  const totalUnlistedProducts = data.products.filter(p => !p.isListedOnMarketplace && p.marketplaceStatus !== 'blocked').length;
  const totalAllProducts = data.products.length;
  const pendingPayoutsCount = payoutRequests.filter((p: any) => p.status === 'pending').length;

  // Filtered Orders
  const filteredOrders = data.masterOrders.filter((ord) => {
    let matchesStatus = true;
    if (orderStatusFilter === 'pending_approval') {
      matchesStatus = ord.adminApprovalStatus === 'pending_approval' || (ord.isAdminApproved !== true && ord.isRejectedByAdmin !== true);
    } else if (orderStatusFilter === 'approved') {
      matchesStatus = ord.adminApprovalStatus === 'approved' || ord.isAdminApproved === true;
    } else if (orderStatusFilter === 'rejected') {
      matchesStatus = ord.adminApprovalStatus === 'rejected' || ord.isRejectedByAdmin === true;
    } else if (orderStatusFilter !== 'all') {
      matchesStatus = ord.overallStatus === orderStatusFilter;
    }

    const matchesSearch =
      !orderSearch.trim() ||
      ord.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerPhone.includes(orderSearch.trim()) ||
      (ord.paymentTrxId && ord.paymentTrxId.toLowerCase().includes(orderSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered Products
  const filteredProducts = data.products.filter((p) => {
    if (productFilter === 'listed' && (!p.isListedOnMarketplace || p.marketplaceStatus === 'blocked')) return false;
    if (productFilter === 'unlisted' && (p.isListedOnMarketplace || p.marketplaceStatus === 'blocked')) return false;
    if (productFilter === 'blocked' && p.marketplaceStatus !== 'blocked') return false;
    return (
      !productSearch.trim() ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.vendorShopName && p.vendorShopName.toLowerCase().includes(productSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
              <Store className="w-4 h-4 text-amber-400" />
              <span>সুপার অ্যাডমিন প্ল্যাটফর্ম কন্ট্রোল</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              সেন্ট্রাল মাল্টি-ভেন্ডর মার্কেটপ্লেস মল
            </h2>
            <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
              সারা দেশের সকল ভেন্ডরের পণ্য, মাস্টার অর্ডার স্প্লিটিং, বিক্রিত প্রোডাক্ট ও প্রাপ্য টাকার হিসাব এবং ক্যাটাগরি সমন্বয়ের প্রধান নিয়ন্ত্রণ কেন্দ্র।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>লাইভ সিঙ্ক</span>
              <span className="text-[10px] text-teal-200">
                ({lastSyncedAt.toLocaleTimeString('bn-BD')})
              </span>
            </div>

            <a
              href="/marketplace"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-xs"
            >
              <span>মার্কেটপ্লেস মল ভিউ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="px-3 py-2 bg-teal-700/60 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">রিফ্রেশ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error alert banner */}
      {loadError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
          >
            পুনরায় চেষ্টা করুন
          </button>
        </div>
      )}

      {/* 6 Clean Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {/* Card 1: Master Orders */}
        <div
          onClick={() => setActiveSubTab('orders')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            activeSubTab === 'orders'
              ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20'
              : 'bg-white border-slate-200/90 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>মাস্টার অর্ডার</span>
            <ShoppingBag className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalMasterOrders}</div>
          <p className="text-[10px] text-teal-700 font-semibold">মোট সেন্ট্রাল অর্ডার</p>
        </div>

        {/* Card 2: Total GMV */}
        <div
          onClick={() => setActiveSubTab('vendor_balances')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            activeSubTab === 'vendor_balances'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>মোট বিক্রয় (GMV)</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950">৳{totalGmv.toLocaleString()}</div>
          <p className="text-[10px] text-emerald-700 font-semibold">গ্রস সেন্ট্রাল সেলস</p>
        </div>

        {/* Card 3: Platform Profit */}
        <div
          onClick={() => setActiveSubTab('profit')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            activeSubTab === 'profit'
              ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-950 font-black">
            <span>💎 প্ল্যাটফর্ম প্রফিট</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950">
            ৳{(vendorBalances.summary.totalPlatformProfit || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-emerald-800 font-bold">কমিশন ও মার্জিন লাভ ➔</p>
        </div>

        {/* Card 4: Verification Remaining (Lock) */}
        <div
          onClick={() => {
            setActiveSubTab('orders');
            setOrderStatusFilter('pending_approval');
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            orderStatusFilter === 'pending_approval' && activeSubTab === 'orders'
              ? 'bg-amber-100/90 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>পেমেন্ট যাচাই বাকি</span>
            <Lock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950">{pendingInquiriesCount}</div>
          <p className="text-[10px] text-amber-800 font-semibold">
            {pendingInquiriesCount > 0 ? 'অনুমোদন প্রয়োজন' : 'সব অনুমোদিত'}
          </p>
        </div>

        {/* Card 5: Payout Requests */}
        <div
          onClick={() => setActiveSubTab('payouts')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            activeSubTab === 'payouts'
              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200/90 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>পেআউট আবেদন</span>
            <CreditCard className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-950">{pendingPayoutsCount}</div>
          <p className="text-[10px] text-purple-700 font-semibold">
            {pendingPayoutsCount > 0 ? 'টাকা পাঠানো বাকি' : 'কোনো বাকি নেই'}
          </p>
        </div>

        {/* Card 6: Live Products */}
        <div
          onClick={() => setActiveSubTab('products')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-2xs space-y-1 ${
            activeSubTab === 'products'
              ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200/90 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>মার্কেটপ্লেস লাইভ</span>
            <Package className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-950">{totalListedProducts}</div>
          <p className="text-[10px] text-indigo-700 font-semibold">অন-মল পণ্য ({totalAllProducts})</p>
        </div>
      </div>

      {/* Sub-tab Navigation (Clean, fully responsive, smooth horizontal scroll without locking vertical page scroll) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xs">
        <div
          id="marketplace-subtabs-scroll"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5"
        >
          {/* Subtab 1: Orders */}
          <button
            type="button"
            onClick={() => setActiveSubTab('orders')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'orders'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>📋 মাস্টার অর্ডার</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {data.masterOrders.length}
            </span>
            {pendingInquiriesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black animate-pulse">
                {pendingInquiriesCount} যাচাই
              </span>
            )}
          </button>

          {/* Subtab 2: Vendor Balances (ডেলিভারি সম্পন্ন টাকা) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('vendor_balances')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'vendor_balances'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50'
            }`}
          >
            <span>💰 ভেন্ডর লেজার ও বকেয়া</span>
            {vendorBalances.summary.totalDeliveredSales > 0 && (
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                activeSubTab === 'vendor_balances' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                ৳{vendorBalances.summary.totalDeliveredSales.toLocaleString()}
              </span>
            )}
          </button>

          {/* Subtab: Platform Profit & Monetization */}
          <button
            type="button"
            onClick={() => setActiveSubTab('profit')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'profit'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs'
                : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-950 border border-emerald-200'
            }`}
          >
            <span>💎 প্ল্যাটফর্ম প্রফিট রিপোর্ট</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'profit' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
            }`}>
              ৳{(vendorBalances.summary.totalPlatformProfit || 0).toLocaleString()}
            </span>
          </button>

          {/* Subtab 3: Payouts */}
          <button
            type="button"
            onClick={() => setActiveSubTab('payouts')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'payouts'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-purple-800 hover:text-purple-950 hover:bg-purple-50'
            }`}
          >
            <span>💸 পেআউট রিকোয়েস্ট</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'payouts' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {payoutRequests.length}
            </span>
            {pendingPayoutsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black animate-pulse">
                {pendingPayoutsCount} অপেক্ষমাণ
              </span>
            )}
          </button>

          {/* Subtab 4: Products */}
          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'products'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>📦 পণ্য মডারেশন</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {totalListedProducts}/{totalAllProducts || data.products.length}
            </span>
          </button>

          {/* Subtab 5: Categories */}
          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'categories'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>🏷️ ক্যাটাগরি তালিকা</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {data.categories.length}
            </span>
          </button>

          {/* Subtab 6: Settings */}
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'settings'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>⚙️ মল সেটিংস</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: MASTER ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Governance Policy Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-teal-50/70 to-amber-50/70 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black text-slate-900 block">
                  🏛️ পেমেন্ট যাচাই ও পারমিশন নীতিমালা (Central Marketplace vs Personal E-Commerce)
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <strong>সেন্ট্রাল মার্কেটপ্লেস:</strong> শুধুমাত্র এই মলের অর্ডারগুলোর পেমেন্ট সুপার অ্যাডমিন যাচাই করে অনুমোদন (আনলক) দিলে ভেন্ডর ডেলিভারি করতে পারবে।{' '}
                  <strong>পার্সোনাল ই-কমার্স সাইট:</strong> ইউজারের নিজস্ব স্টোরের অর্ডার ও পেমেন্ট ১০০% ভেন্ডর নিজেই যাচাই, আপডেট ও ডেলিভারি পরিচালনা করবে (অ্যাডমিন পারমিশন প্রয়োজন নেই)।
                </p>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="অর্ডার নম্বর, কাস্টমার নাম বা ফোন দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              >
                <option value="all">সব অর্ডার ({data.masterOrders.length})</option>
                <option value="pending_approval">🔔 পেমেন্ট যাচাই বাকি - ভেন্ডর লক ({pendingInquiriesCount})</option>
                <option value="approved">✅ পেমেন্ট ভেরিফাইড ও আনলকড</option>
                <option value="rejected">❌ বাতিল / ভেন্ডর থেকে লুকানো</option>
                <option value="processing">প্রসেসিং (Processing)</option>
                <option value="confirmed">নিশ্চিতকৃত (Confirmed)</option>
                <option value="delivered">ডেলিভার্ড (Delivered)</option>
                <option value="cancelled">বাতিল (Cancelled)</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">কোনো মাস্টার অর্ডার পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে অনুসন্ধান করুন</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {/* Horizontal Scroll Hint and Navigation Buttons */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-teal-800 font-bold">↔ সাইড স্ক্রল:</span>
                  <span>স্ক্রিন ছোট হলে টেবিলটি ডানে-বামে সোয়াইপ বা স্ক্রল করে সম্পূর্ণ কলাম ও অ্যাকশন বাটন দেখুন</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => document.getElementById('master-orders-scroll-table')?.scrollBy({ left: -250, behavior: 'smooth' })}
                    className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                    title="বামে স্ক্রল"
                  >
                    ◀ বামে
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('master-orders-scroll-table')?.scrollBy({ left: 250, behavior: 'smooth' })}
                    className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                    title="ডানে স্ক্রল"
                  >
                    ডানে ▶
                  </button>
                </div>
              </div>

              <div id="master-orders-scroll-table" className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100 min-w-[920px]">
                  <thead className="bg-slate-50 font-bold text-slate-800">
                    <tr>
                      <th className="p-3.5">অর্ডার নম্বর ও তারিখ</th>
                      <th className="p-3.5">কাস্টমার তথ্য</th>
                      <th className="p-3.5">পরিমাণ ও মোট বিল</th>
                      <th className="p-3.5">পেমেন্ট ও ভেন্ডর লক স্ট্যাটাস</th>
                      <th className="p-3.5">অর্ডার স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const relatedSubs = data.subOrders.filter(
                        (s) => s.masterOrderId === ord.id || (ord.subOrderIds && ord.subOrderIds.includes(s.id))
                      );
                      const isPendingApproval = ord.adminApprovalStatus === 'pending_approval' || (!ord.isAdminApproved && !ord.isRejectedByAdmin);

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-teal-950 block">{ord.orderNumber}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(ord.createdAt).toLocaleDateString('bn-BD', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                            <span className="text-slate-500 font-mono text-[11px] block">{ord.customerPhone}</span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-xs">{ord.customerAddress}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-black text-slate-900 block">৳{ord.grandTotal}</span>
                            <span className="text-[10px] text-slate-500">
                              পণ্য ৳{ord.totalProductsAmount} + ডেলিভারি ৳{ord.totalDeliveryCharge}
                            </span>
                            <span className="text-[10px] text-teal-700 block font-bold">
                              {relatedSubs.length || ord.vendorIds?.length || 1}টি ভেন্ডর পার্সেল
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold block uppercase text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                                  {ord.paymentMethod}
                                </span>
                                {ord.adminApprovalStatus === 'approved' || ord.isAdminApproved ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>✅ পেমেন্ট ভেরিফাইড (অনুমোদিত)</span>
                                  </span>
                                ) : ord.adminApprovalStatus === 'rejected' || ord.isRejectedByAdmin ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 border border-rose-200">
                                    <X className="w-3 h-3 text-rose-600" />
                                    <span>বাতিল (উধাও)</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black inline-flex items-center gap-0.5 bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>লক (যাচাই বাকি)</span>
                                  </span>
                                )}
                              </div>

                              {ord.paymentTrxId && (
                                <span className="text-[10px] font-mono text-slate-600 block truncate">
                                  Trx: <strong className="text-slate-900 font-bold">{ord.paymentTrxId}</strong>
                                </span>
                              )}
                              {ord.senderPhone && (
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  প্রেরক: {ord.senderPhone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold inline-block ${
                                ord.overallStatus === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.overallStatus === 'confirmed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ord.overallStatus === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.overallStatus === 'delivered'
                                ? 'ডেলিভার্ড'
                                : ord.overallStatus === 'confirmed'
                                ? 'নিশ্চিত'
                                : ord.overallStatus === 'cancelled'
                                ? 'বাতিল'
                                : 'প্রসেসিং'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                                {isPendingApproval && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={isApprovingPayment === ord.id}
                                      onClick={() => setApprovingOrder(ord)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-2xs transition"
                                      title="পেমেন্ট ভেরিফাই ও একসেপ্ট করে ভেন্ডরের জন্য আনলক করুন"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>পেমেন্ট ভেরিফাই ও একসেপ্ট</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isApprovingPayment === ord.id}
                                      onClick={() => {
                                        setRejectionReasonInput('');
                                        setRejectingOrder(ord);
                                      }}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition"
                                      title="পেমেন্ট রিজেক্ট করুন"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>রিজেক্ট</span>
                                    </button>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setPrintingInvoiceOrder(ord)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                    title="চালান / ক্যাশ মেমো প্রিন্ট করুন"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-teal-800" />
                                    <span className="hidden sm:inline">মেমো প্রিন্ট</span>
                                  </button>



                                  <button
                                    type="button"
                                    onClick={() => setSmsNotifyingOrder(ord)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                    title="কাস্টমারকে এসএমএস ও হোয়াটসঅ্যাপ আপডেট পাঠান"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                                    <span className="hidden sm:inline">এসএমএস</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedMasterOrder(ord)}
                                    className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>বিস্তারিত</span>
                                  </button>
                                </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Master Order Detail Modal */}
          {selectedMasterOrder && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">মাস্টার অর্ডার ভিউ</span>
                    <h3 className="text-lg font-black text-slate-900 font-mono">
                      #{selectedMasterOrder.orderNumber}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMasterOrder(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Customer & Payment Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1">
                      গ্রাহকের বিবরণ:
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">নাম:</span>
                      <span className="font-bold text-slate-900">{selectedMasterOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">মোবাইল:</span>
                      <span className="font-bold font-mono text-slate-900">{selectedMasterOrder.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ঠিকানা:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[180px]">{selectedMasterOrder.customerAddress}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <span className="font-bold text-slate-800 block border-b border-slate-200 pb-1">
                      পেমেন্ট ও গেটওয়ে তথ্য:
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">মেথড:</span>
                      <span className="font-bold text-slate-900 uppercase bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px]">
                        {selectedMasterOrder.paymentMethod}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">স্ট্যাটাস:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        selectedMasterOrder.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedMasterOrder.paymentStatus === 'paid_pending_verify'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedMasterOrder.paymentStatus === 'paid'
                          ? 'পরিশোধিত (Paid)'
                          : selectedMasterOrder.paymentStatus === 'paid_pending_verify'
                          ? 'যাচাই বাকি (Pending)'
                          : 'বকেয়া/COD'}
                      </span>
                    </div>
                    {selectedMasterOrder.paymentTrxId && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">TrxID:</span>
                        <span className="font-mono font-bold text-slate-900 bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded">
                          {selectedMasterOrder.paymentTrxId}
                        </span>
                      </div>
                    )}
                    {selectedMasterOrder.senderPhone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">প্রেরক নম্বর:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedMasterOrder.senderPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">সর্বমোট বিল:</span>
                      <span className="font-black text-teal-900 text-sm">৳{selectedMasterOrder.grandTotal}</span>
                    </div>
                  </div>
                </div>

                {/* SUPER ADMIN PAYMENT VERIFICATION & VENDOR ESCROW UNLOCK BOX */}
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 ${
                    selectedMasterOrder.adminApprovalStatus === 'approved' || selectedMasterOrder.isAdminApproved
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : selectedMasterOrder.adminApprovalStatus === 'rejected' || selectedMasterOrder.isRejectedByAdmin
                      ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {selectedMasterOrder.adminApprovalStatus === 'approved' || selectedMasterOrder.isAdminApproved ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4" /> <span>পেমেন্ট অনুমোদিত ও আনলকড</span>
                        </span>
                      ) : selectedMasterOrder.adminApprovalStatus === 'rejected' || selectedMasterOrder.isRejectedByAdmin ? (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs">
                          <X className="w-4 h-4" /> <span>পেমেন্ট বাতিল (ভেন্ডর থেকে উধাও)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 animate-pulse shadow-2xs">
                          <Lock className="w-4 h-4" /> <span>ভেন্ডরদের জন্য লক (সুপার এডমিনের অনুমোদন আবশ্যক)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {selectedMasterOrder.adminApprovalStatus === 'approved' || selectedMasterOrder.isAdminApproved
                      ? '✅ এই অর্ডারের পেমেন্ট সুপার এডমিন কর্তৃক অনুমোদিত হয়েছে। ভেন্ডরদের সাইটে অর্ডারটি আনলক করা হয়েছে এবং তারা পণ্য প্রস্তুত ও ডেলিভারি দিতে পারছে। ক্রেতার কাছে কনফার্মেশন এসএমএস পাঠানো হয়েছে।'
                      : selectedMasterOrder.adminApprovalStatus === 'rejected' || selectedMasterOrder.isRejectedByAdmin
                      ? '❌ এই অর্ডারের পেমেন্ট বাতিল করা হয়েছে। ভেন্ডরদের ড্যাশবোর্ড থেকে অর্ডারটি স্বয়ংক্রিয়ভাবে মুছে ফেলা হয়েছে ("উধাও") এবং পণ্যের স্টক পুনরায় ফেরত এসেছে।'
                      : '⚠️ কাস্টমার অর্ডার সাবমিট করেছেন। আপনি পেমেন্ট যাচাই-বাছাই করে "একসেপ্ট ও আনলক" করার পূর্ব পর্যন্ত ভেন্ডররা এটি প্রস্তুত বা ডেলিভারি করতে পারবে না (লক অবস্থায় থাকবে)। একসেপ্ট করলেই ক্রেতার কাছে কনফার্মেশন এসএমএস যাবে।'}
                  </p>

                  {/* Actions for Pending Inquiries */}
                  {!selectedMasterOrder.isAdminApproved &&
                    selectedMasterOrder.adminApprovalStatus !== 'approved' &&
                    !selectedMasterOrder.isRejectedByAdmin && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
                        <button
                          type="button"
                          disabled={isApprovingPayment === selectedMasterOrder.id}
                          onClick={() => setApprovingOrder(selectedMasterOrder)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isApprovingPayment === selectedMasterOrder.id
                              ? 'অনুমোদন হচ্ছে...'
                              : '✅ পেমেন্ট একসেপ্ট ও আনলক করুন (ভেন্ডর পারমিশন পাবে)'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isApprovingPayment === selectedMasterOrder.id}
                          onClick={() => {
                            setRejectionReasonInput('');
                            setRejectingOrder(selectedMasterOrder);
                          }}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>❌ পেমেন্ট রিজেক্ট করুন</span>
                        </button>
                      </div>
                    )}
                </div>

                {/* Courier & Tracking Banner if Assigned */}
                {selectedMasterOrder.courierName && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-700" />
                      <div>
                        <span className="font-bold text-blue-950">কুরিয়ার: {selectedMasterOrder.courierName}</span>
                        {selectedMasterOrder.courierTrackingCode && (
                          <span className="font-mono text-blue-800 ml-2 bg-white px-2 py-0.5 rounded border border-blue-200">
                            ট্র্যাকিং: {selectedMasterOrder.courierTrackingCode}
                          </span>
                        )}
                      </div>
                    </div>
<span className="text-[11px] text-blue-700 font-bold">ভেন্ডর কর্তৃক নির্ধারিত</span>
                  </div>
                )}

                {/* Return / Refund Banner if Applicable */}
                {(selectedMasterOrder.overallStatus === 'returned' || Number(selectedMasterOrder.refundAmount) > 0) && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-950">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-700" />
                      <div>
                        <span className="font-black">↩️ অর্ডার রিটার্ন ও রিফান্ড সম্পন্ন</span>
                        {Number(selectedMasterOrder.refundAmount) > 0 && (
                          <span className="font-mono font-bold ml-2 bg-white px-2 py-0.5 rounded border border-rose-200">
                            রিফান্ড: ৳{selectedMasterOrder.refundAmount}
                          </span>
                        )}
                        {selectedMasterOrder.returnReason && (
                          <p className="text-[11px] text-rose-700 mt-0.5">{selectedMasterOrder.returnReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Commerce Actions Toolbar */}
                <div className="p-3.5 bg-gradient-to-r from-teal-50 to-slate-50 border border-teal-200 rounded-2xl space-y-2.5">
                  <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider block">
                    ⚡ দ্রুত অ্যাকশন ও কাস্টমার সার্ভিস:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintingInvoiceOrder(selectedMasterOrder)}
                      className="p-2.5 bg-white hover:bg-teal-50 text-teal-950 font-bold border border-teal-300 rounded-xl text-xs flex flex-col items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-teal-700" />
                      <span>মেমো প্রিন্ট</span>
                    </button>



                    <button
                      type="button"
                      onClick={() => setSmsNotifyingOrder(selectedMasterOrder)}
                      className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 rounded-xl text-xs flex flex-col items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                      <span>এসএমএস অ্যালার্ট</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReturnRefundingOrder(selectedMasterOrder)}
                      className="p-2.5 bg-white hover:bg-rose-50 text-rose-950 font-bold border border-rose-300 rounded-xl text-xs flex flex-col items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-700" />
                      <span>রিটার্ন / রিফান্ড</span>
                    </button>
                  </div>
                </div>

                {/* Vendor Delivery Governance & Real-Time Status Notice */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Truck className="w-4 h-4 text-amber-700" />
                      <span>ভেন্ডর ডেলিভারি ও প্যাকেজিং পরিচালনা:</span>
                    </div>
                    {selectedMasterOrder.overallStatus !== 'cancelled' && selectedMasterOrder.overallStatus !== 'returned' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('আপনি কি নিশ্চিত যে এই অর্ডারটি বাতিল করতে চান?')) {
                            handleUpdateOrderStatus(selectedMasterOrder.id, 'cancelled');
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold cursor-pointer text-[11px]"
                      >
                        অর্ডার বাতিল করুন
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    সেন্ট্রাল মার্কেটপ্লেসের নীতিমালা অনুযায়ী পণ্য প্রস্তুত, প্যাকেজিং ও কুরিয়ার ডেলিভারি সম্পন্ন করার সম্পূর্ণ দায়িত্ব সংশ্লিষ্ট ভেন্ডরের। সুপার এডমিন বা অন্য কোনো ব্যক্তি ডেলিভারি স্ট্যাটাস পরিবর্তন করতে পারবেন না। ভেন্ডর যখন পণ্য পাঠাবেন ও ডেলিভারি আপডেট করবেন, তা স্বয়ংক্রিয়ভাবে এখানে লাইভ দেখা যাবে।
                  </p>
                </div>

                {/* Sub-Orders Breakdown (Split by Vendor) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    ভেন্ডর সাব-অর্ডার, বিক্রিত প্রোডাক্ট ও প্রাপ্য টাকার বিবরণ:
                  </h4>

                  {data.subOrders
                    .filter((s) => s.masterOrderId === selectedMasterOrder.id)
                    .map((sub) => {
                      const isSettled = sub.vendorPayoutStatus === 'settled';
                      return (
                        <div key={sub.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                              <span className="font-bold text-slate-900">{sub.vendorShopName || 'ভেন্ডর দোকান'}</span>
                              <span className="text-[11px] text-slate-500 font-mono block">ফোন: {sub.vendorPhone}</span>
                            </div>
                            <div className="text-right">
                              {isSettled ? (
                                <>
                                  <span className="text-[10px] text-emerald-700 font-bold block">✅ ইতিমধ্যে সুপার এডমিন পরিশোধ করেছেন</span>
                                  <span className="font-black text-slate-900 text-sm block">৳{sub.totalAmount}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] text-amber-700 font-semibold block">
                                    {selectedMasterOrder.overallStatus === 'delivered' ? '⏳ সুপার এডমিনের কাছে পাবে' : '⏳ ডেলিভারি শেষে প্রাপ্য'}
                                  </span>
                                  <span className="font-black text-emerald-800 text-sm block">৳{sub.totalAmount}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Items in sub-order */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-700 block">বিক্রিত পণ্যের মেমো বিবরণী:</span>
                            {sub.items.map((it: any, idx: number) => {
                              const qty = Number(it.quantity) || 1;
                              const unit = it.unit || 'পিস';
                              const price = Number(it.unitPrice || it.price || 0);
                              const subAmt = Number(it.subtotal || price * qty);
                              return (
                                <div key={idx} className="flex justify-between items-center text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                                  <span className="font-bold text-slate-900">
                                    • {it.name} {qty} {unit}
                                  </span>
                                  <span className="font-mono font-black text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                    {price} × {qty} = ৳{subAmt.toLocaleString('en-US')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: VENDOR DELIVERED EARNINGS BREAKDOWN (শুধুমাত্র ডেলিভারি সম্পন্ন হয়েছে কত টাকা ও ভেন্ডরের বিস্তারিত) */}
      {activeSubTab === 'vendor_balances' && (
        <div className="space-y-4">
          {/* ডেলিভারি সম্পন্ন হয়েছে মোট কত টাকা (Hero Card) */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 rounded-3xl p-4 sm:p-6 text-white shadow-md border border-emerald-600/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                    সেন্ট্রাল মল — ডেলিভারি সম্পন্ন হিসাব ও ভেন্ডর পেআউট
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    শুধুমাত্র ডেলিভারি সম্পন্ন অর্ডারের রিয়েল-টাইম হিসাব
                  </h3>
                  <p className="text-[11px] text-emerald-100/80 mt-0.5">
                    কাস্টমারের হাতে পৌঁছানো পণ্যের প্রকৃত মূল্য, সুপার এডমিন কর্তৃক পরিশোধিত এবং বর্তমান প্রদেয় বকেয়া
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAllCentralMallDetail}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-950" />
                  <span>সকল বিক্রিত পণ্যের বিস্তারিত</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadData(true)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="রিফ্রেশ"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* 4 Real-time Clear Metric Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-emerald-700/40">
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10 space-y-1">
                <span className="text-[11px] font-bold text-emerald-200 block">
                  ১. ডেলিভারি সম্পন্ন মোট বিক্রি:
                </span>
                <div className="text-2xl font-black text-white">
                  ৳{Number(vendorBalances.summary.totalDeliveredSales || 0).toLocaleString('en-US')}
                </div>
                <p className="text-[10px] text-emerald-200/70">গ্রাহকের কাছে পৌঁছানো সফল অর্ডার</p>
              </div>

              <div
                onClick={() => setActiveSubTab('profit')}
                className="bg-amber-400/20 backdrop-blur-xs rounded-2xl p-3.5 border border-amber-300/40 space-y-1 cursor-pointer hover:bg-amber-400/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-200 block">
                    ২. প্ল্যাটফর্ম কমিশন ও লাভ:
                  </span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                    {vendorBalances.summary.defaultCommissionPercent ?? 5}%
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-300">
                  ৳{Number(vendorBalances.summary.totalPlatformProfit || 0).toLocaleString('en-US')}
                </div>
                <p className="text-[10px] text-amber-100/80">সুপার এডমিনের লাভ (কাটা হয়েছে) ➔</p>
              </div>

              <div className="bg-emerald-500/20 backdrop-blur-xs rounded-2xl p-3.5 border border-emerald-400/30 space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 block">
                  ৩. ইতিমধ্যে পরিশোধ করেছে সুপার এডমিন:
                </span>
                <div className="text-2xl font-black text-emerald-300">
                  ৳{Number(vendorBalances.summary.totalSettledAmount || 0).toLocaleString('en-US')}
                </div>
                <p className="text-[10px] text-emerald-100/70">ভেন্ডরদের পাঠানো মোট পেআউট</p>
              </div>

              <div className="bg-rose-500/20 backdrop-blur-xs rounded-2xl p-3.5 border border-rose-400/30 space-y-1">
                <span className="text-[11px] font-bold text-rose-200 block">
                  ৪. ভেন্ডরদের নিট প্রদেয় বকেয়া:
                </span>
                <div className="text-2xl font-black text-rose-300">
                  ৳{Number(vendorBalances.summary.totalDueToVendors || 0).toLocaleString('en-US')}
                </div>
                <p className="text-[10px] text-rose-100/70">কমিশন বাদে অবশিষ্ট নিট প্রদেয়</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={vendorBalanceSearch}
                onChange={(e) => setVendorBalanceSearch(e.target.value)}
                placeholder="দোকানের নাম, ভেন্ডর নাম বা ফোন নম্বর খুঁজুন..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setVendorBalanceFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    vendorBalanceFilter === 'all'
                      ? 'bg-teal-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সব ভেন্ডর ({vendorBalances.vendors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVendorBalanceFilter('due')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    vendorBalanceFilter === 'due'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  বকেয়া পাবে ({vendorBalances.vendors.filter((v) => Number(v.deliveredDue ?? Math.max(0, (v.deliveredSales || 0) - (v.settledAmount || 0))) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVendorBalanceFilter('settled')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    vendorBalanceFilter === 'settled'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  সব পরিশোধিত ({vendorBalances.vendors.filter((v) => (v.deliveredSales || 0) > 0 && Number(v.deliveredDue ?? Math.max(0, (v.deliveredSales || 0) - (v.settledAmount || 0))) <= 0).length})
                </button>
              </div>
            </div>
          </div>

          {/* VENDOR BREAKDOWN LIST: Mobile Cards + Desktop Table */}
          {(() => {
            const filteredVendors = vendorBalances.vendors
              .filter((v) => {
                const due = Number(v.deliveredDue ?? Math.max(0, (v.deliveredSales || 0) - (v.settledAmount || 0)));
                const deliv = Number(v.deliveredSales || 0);
                if (vendorBalanceFilter === 'due' && due <= 0) return false;
                if (vendorBalanceFilter === 'settled' && (deliv <= 0 || due > 0)) return false;
                if (!vendorBalanceSearch.trim()) return true;
                const q = vendorBalanceSearch.toLowerCase();
                const matchesProduct = (v.soldProducts || []).some(
                  (sp: any) => sp.name && sp.name.toLowerCase().includes(q)
                );
                return (
                  matchesProduct ||
                  (v.name && v.name.toLowerCase().includes(q)) ||
                  (v.shopName && v.shopName.toLowerCase().includes(q)) ||
                  (v.phone && v.phone.includes(q)) ||
                  (v.vendorId && v.vendorId.toLowerCase().includes(q))
                );
              })
              .sort((a, b) => {
                const dueA = Number(a.deliveredDue ?? Math.max(0, (a.deliveredSales || 0) - (a.settledAmount || 0)));
                const dueB = Number(b.deliveredDue ?? Math.max(0, (b.deliveredSales || 0) - (b.settledAmount || 0)));
                return dueB - dueA || (b.deliveredSales || 0) - (a.deliveredSales || 0);
              });

            if (filteredVendors.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                  <Store className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">কোনো ভেন্ডর বা বিক্রির তথ্য পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে অনুসন্ধান করুন</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {/* 1. Mobile Cards View (Screen < md) - Very clean, responsive & easy to scroll */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredVendors.map((v) => {
                    const soldProds: any[] = v.soldProducts || [];
                    const delivSales = Number(v.deliveredSales || 0);
                    const commRate = Number(v.commissionRate ?? vendorBalances.summary.defaultCommissionPercent ?? 5);
                    const commAmt = Number(v.commissionAmount ?? Math.round((delivSales * commRate) / 100));
                    const netPayable = Number(v.netDeliveredSales ?? Math.max(0, delivSales - commAmt));
                    const settled = Number(v.settledAmount || 0);
                    const due = Number(v.deliveredDue ?? Math.max(0, netPayable - settled));

                    return (
                      <div
                        key={v.vendorId}
                        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 transition hover:border-emerald-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 text-sm truncate">
                              {v.shopName || v.name}
                            </h4>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>মালিক: {v.name}</span>
                              {v.phone && (
                                <span className="font-mono text-[11px] text-slate-600">• 📞 {v.phone}</span>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {v.deliveredOrdersCount || 0} টি ডেলিভার্ড
                          </span>
                        </div>

                        {/* ৪টি মূল হিসাব: ডেলিভারি বিক্রি, প্ল্যাটফর্ম কমিশন, ইতিমধ্যে পরিশোধিত, ও বর্তমান বকেয়া */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block leading-tight">
                              ডেলিভারি বিক্রি
                            </span>
                            <span className="text-xs font-black text-slate-900 block mt-0.5">
                              ৳{delivSales.toLocaleString('en-US')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-teal-700 font-semibold block leading-tight">
                              প্ল্যাটফর্ম কমিশন ({commRate}%)
                            </span>
                            <span className="text-xs font-black text-teal-800 block mt-0.5">
                              -৳{commAmt.toLocaleString('en-US')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
                              ইতিমধ্যে পরিশোধিত
                            </span>
                            <span className="text-xs font-black text-emerald-700 block mt-0.5">
                              ৳{settled.toLocaleString('en-US')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-amber-800 font-semibold block leading-tight">
                              নিট বকেয়া পাবে
                            </span>
                            {due > 0 ? (
                              <span className="text-xs font-black text-amber-800 block mt-0.5">
                                ৳{due.toLocaleString('en-US')}
                              </span>
                            ) : delivSales > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                                ✅ সব পেইড
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 block mt-0.5">৳০</span>
                            )}
                          </div>
                        </div>

                        {/* Sold Products Quick Info */}
                        {soldProds.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                            <div className="flex items-center justify-between text-slate-600 font-semibold text-[11px]">
                              <span>বিক্রিত প্রোডাক্ট ({soldProds.length} ধরনের):</span>
                              <span className="text-teal-800 font-bold">
                                মোট {v.soldUnitsCount || soldProds.reduce((s: number, p: any) => s + (p.totalQuantitySold || 0), 0)} পিস
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-slate-500">
                              {soldProds.map((sp: any) => `${sp.name} (${sp.totalQuantitySold || 1}টি)`).join(', ')}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenVendorDetail(v)}
                            className="flex-1 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-300" />
                            <span>বিস্তারিত দেখুন</span>
                          </button>

                          {due > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenDirectPayout(v)}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>পরিশোধ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Table View (Screen >= md) */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5 sm:px-4">ভেন্ডর ও দোকান</th>
                        <th className="p-3.5 sm:px-4">কোন কোন প্রোডাক্ট বিক্রি হয়েছে</th>
                        <th className="p-3.5 sm:px-4 text-center">ডেলিভারি সম্পন্ন</th>
                        <th className="p-3.5 sm:px-4">ডেলিভারি বিক্রি</th>
                        <th className="p-3.5 sm:px-4">প্ল্যাটফর্ম কমিশন</th>
                        <th className="p-3.5 sm:px-4">ভেন্ডরের নিট প্রাপ্য</th>
                        <th className="p-3.5 sm:px-4">ইতিমধ্যে পরিশোধ</th>
                        <th className="p-3.5 sm:px-4">সুপার এডমিনে পাবে (বকেয়া)</th>
                        <th className="p-3.5 sm:px-4 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVendors.map((v) => {
                        const soldProds: any[] = v.soldProducts || [];
                        const delivSales = Number(v.deliveredSales || 0);
                        const commRate = Number(v.commissionRate ?? vendorBalances.summary.defaultCommissionPercent ?? 5);
                        const commAmt = Number(v.commissionAmount ?? Math.round((delivSales * commRate) / 100));
                        const netPayable = Number(v.netDeliveredSales ?? Math.max(0, delivSales - commAmt));
                        const settled = Number(v.settledAmount || 0);
                        const due = Number(v.deliveredDue ?? Math.max(0, netPayable - settled));

                        return (
                          <tr key={v.vendorId} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 sm:px-4">
                              <div className="font-bold text-slate-900 text-sm">{v.shopName || v.name}</div>
                              <div className="text-[11px] text-slate-600 mt-0.5">মালিক: {v.name}</div>
                              {v.phone && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">📞 {v.phone}</div>
                              )}
                            </td>

                            <td className="p-3.5 sm:px-4 max-w-xs">
                              {soldProds.length === 0 ? (
                                <span className="text-[11px] text-slate-400">কোনো প্রোডাক্ট বিক্রি হয়নি</span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="font-bold text-teal-900 text-xs">
                                    {soldProds.length} ধরনের প্রোডাক্ট (মোট {v.soldUnitsCount || soldProds.reduce((s: number, p: any) => s + (p.totalQuantitySold || 0), 0)} পিস)
                                  </div>
                                  <div className="truncate text-[11px] text-slate-500">
                                    {soldProds.map((sp: any) => `${sp.name} (${sp.totalQuantitySold || 1}টি)`).join(', ')}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 sm:px-4 text-center whitespace-nowrap">
                              <span className="font-bold text-emerald-700 text-sm block">
                                ✅ {v.deliveredOrdersCount || 0} টি
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                মোট অর্ডার: {v.totalOrdersCount} টি
                              </span>
                            </td>

                            <td className="p-3.5 sm:px-4 whitespace-nowrap">
                              <div className="text-sm font-black text-slate-900">
                                ৳{delivSales.toLocaleString('en-US')}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                পৌঁছানো পণ্যের দাম
                              </span>
                            </td>

                            <td className="p-3.5 sm:px-4 whitespace-nowrap">
                              <div className="text-sm font-black text-teal-800">
                                -৳{commAmt.toLocaleString('en-US')}
                              </div>
                              <span className="text-[10px] text-teal-700 font-bold block">
                                {commRate}% কমিশন লাভ
                              </span>
                            </td>

                            <td className="p-3.5 sm:px-4 whitespace-nowrap">
                              <div className="text-sm font-black text-emerald-900">
                                ৳{netPayable.toLocaleString('en-US')}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                কমিশন বাদে প্রাপ্য
                              </span>
                            </td>

                            <td className="p-3.5 sm:px-4 whitespace-nowrap">
                              <div className="text-sm font-black text-emerald-700">
                                ৳{settled.toLocaleString('en-US')}
                              </div>
                              <span className="text-[10px] text-emerald-600 block">
                                ইতিমধ্যে পরিশোধিত
                              </span>
                            </td>

                            <td className="p-3.5 sm:px-4 whitespace-nowrap">
                              {due > 0 ? (
                                <div>
                                  <div className="text-base font-black text-amber-800">
                                    ৳{due.toLocaleString('en-US')}
                                  </div>
                                  <span className="text-[10px] text-amber-700 font-bold block">
                                    ⏳ সুপার এডমিনে পাবে
                                  </span>
                                </div>
                              ) : delivSales > 0 ? (
                                <div>
                                  <div className="text-xs font-black text-emerald-700">৳০</div>
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold inline-block">
                                    ✅ সব পরিশোধিত (বকেয়া নেই)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">কোনো ডেলিভারি হয়নি</span>
                              )}
                            </td>

                            <td className="p-3.5 sm:px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenVendorDetail(v)}
                                  className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                                  <span>বিস্তারিত</span>
                                </button>

                                {due > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDirectPayout(v)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="ভেন্ডরের বকেয়া সরাসরি পরিশোধ করুন"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>পরিশোধ</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUB-TAB: PLATFORM PROFIT & MONETIZATION REPORT */}
      {activeSubTab === 'profit' && (
        <MarketplaceProfitReportTab
          summary={vendorBalances.summary}
          vendors={vendorBalances.vendors}
          currentSettings={{
            ...data.settings,
            ...settingsForm,
          }}
          onRefresh={loadData}
          onUpdateSettings={async (newSettings) => {
            await marketplaceAdminApi.saveSettings({
              ...data.settings,
              ...newSettings,
            });
            setSettingsForm((prev) => ({
              ...prev,
              ...newSettings,
            }));
            await loadData(false);
          }}
          showToast={showToast}
        />
      )}

      {/* SUB-TAB: VENDOR PAYOUT SETTLEMENT */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-4">
          {/* Top Payout KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                অপেক্ষমাণ পেআউট আবেদন
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-950">
                  ৳{payoutRequests.filter(p => p.status === 'pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString('en-US')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {payoutRequests.filter(p => p.status === 'pending').length} টি আবেদন
                </span>
              </div>
              <p className="text-[10px] text-amber-700/90">ভেন্ডরদের বিকাশ/নগদে টাকা পাঠিয়ে TrxID এন্ট্রি করুন</p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                সফলভাবে পরিশোধিত (Paid)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-950">
                  ৳{payoutRequests.filter(p => p.status === 'approved').reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString('en-US')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  {payoutRequests.filter(p => p.status === 'approved').length} টি পরিশোধিত
                </span>
              </div>
              <p className="text-[10px] text-emerald-700/90">TrxID সহ ভেন্ডরের ক্যাশবুকে স্বয়ংক্রিয় জমা হয়েছে</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                বাতিলকৃত আবেদন
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800">
                  {payoutRequests.filter(p => p.status === 'rejected').length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">বাতিল</span>
              </div>
              <p className="text-[10px] text-slate-400">তথ্য বা ব্যালেন্স অসঙ্গতির কারণে বাতিল</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                placeholder="দোকানের নাম, ভেন্ডর নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">সব আবেদন ({payoutRequests.length})</option>
                <option value="pending">⏳ অপেক্ষমাণ ({payoutRequests.filter(p => p.status === 'pending').length})</option>
                <option value="approved">✅ পরিশোধিত ({payoutRequests.filter(p => p.status === 'approved').length})</option>
                <option value="rejected">❌ বাতিল ({payoutRequests.filter(p => p.status === 'rejected').length})</option>
              </select>
            </div>
          </div>

          {/* Payout Requests List Table with Sideways Scroll Affordance */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            {/* Horizontal scroll hint & navigation buttons */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-teal-800 font-bold">↔ সাইড স্ক্রল:</span>
                <span>ডানে-বামে সোয়াইপ বা স্ক্রল করে সম্পূর্ণ উইথড্র তথ্য ও অ্যাকশন বাটন দেখুন</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => document.getElementById('payout-requests-scroll-table')?.scrollBy({ left: -250, behavior: 'smooth' })}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  ◀ বামে
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('payout-requests-scroll-table')?.scrollBy({ left: 250, behavior: 'smooth' })}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  ডানে ▶
                </button>
              </div>
            </div>

            {payoutRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">কোনো পেআউট আবেদন নেই</p>
                <p className="text-xs text-slate-400">ভেন্ডররা মার্কেটপ্লেস ব্যালেন্স তোলার আবেদন করলে এখানে তালিকা আসবে</p>
              </div>
            ) : (
              <div id="payout-requests-scroll-table" className="overflow-x-auto scrollbar-thin divide-y divide-slate-100">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3.5 sm:px-5">ভেন্ডর ও দোকান</th>
                      <th className="p-3.5 sm:px-5">পরিমাণ</th>
                      <th className="p-3.5 sm:px-5">পেমেন্ট মেথড ও প্রাপক অ্যাকাউন্ট</th>
                      <th className="p-3.5 sm:px-5">আবেদনের তারিখ</th>
                      <th className="p-3.5 sm:px-5">স্ট্যাটাস</th>
                      <th className="p-3.5 sm:px-5">TrxID ও নোট</th>
                      <th className="p-3.5 sm:px-5 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutRequests
                      .filter((req) => {
                        if (payoutStatusFilter !== 'all' && req.status !== payoutStatusFilter) return false;
                        if (!payoutSearch.trim()) return true;
                        const q = payoutSearch.toLowerCase();
                        return (
                          (req.storeName && req.storeName.toLowerCase().includes(q)) ||
                          (req.storePhone && req.storePhone.includes(q)) ||
                          (req.accountNumber && req.accountNumber.includes(q)) ||
                          (req.adminTransactionId && req.adminTransactionId.toLowerCase().includes(q))
                        );
                      })
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5 sm:px-5">
                            <div className="font-bold text-slate-900 text-sm">{req.storeName || 'ভেন্ডর'}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-mono">{req.storePhone || 'ফোন নেই'}</span>
                            </div>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            <span className="text-base font-black text-emerald-800">
                              ৳{Number(req.amount).toLocaleString('en-US')}
                            </span>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold uppercase text-[10px]">
                                {req.paymentMethod}
                              </span>
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                {req.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(req.accountNumber, req.id)}
                                className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                                title="নম্বর কপি করুন"
                              >
                                {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {req.accountType ? `ধরন: ${req.accountType}` : ''} {req.bankName ? `• ${req.bankName}` : ''} {req.branchName ? `(${req.branchName})` : ''}
                            </div>
                            {req.requestNote && (
                              <div className="text-[10px] text-slate-600 italic mt-0.5">
                                ভেন্ডর নোট: "{req.requestNote}"
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap text-slate-600">
                            <div>{new Date(req.createdAt).toLocaleDateString('bn-BD')}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="p-3.5 sm:px-5 whitespace-nowrap">
                            {req.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>পরিশোধিত</span>
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>বাতিল</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>অপেক্ষমাণ</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5">
                            {req.adminTransactionId ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400">TrxID:</span>
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {req.adminTransactionId}
                                  </span>
                                </div>
                                {req.adminNote && (
                                  <div className="text-[10px] text-slate-500 italic max-w-xs truncate">
                                    "{req.adminNote}"
                                  </div>
                                )}
                              </div>
                            ) : req.adminNote ? (
                              <span className="text-[11px] text-rose-600 italic">নোট: {req.adminNote}</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </td>

                          <td className="p-3.5 sm:px-5 text-right whitespace-nowrap">
                            {req.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayoutToProcess(req);
                                  setAdminTrxIdInput('');
                                  setAdminNoteInput('');
                                }}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                              >
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <span>টাকা পাঠান ও TrxID দিন</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayoutToProcess(req);
                                  setAdminTrxIdInput(req.adminTransactionId || '');
                                  setAdminNoteInput(req.adminNote || '');
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                              >
                                বিবরণ দেখুন
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRODUCT MODERATION */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Search, Filters, and Global Batch Action Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
              <div className="relative max-w-md flex-1">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="পণ্যের নাম, ক্যাটাগরি বা দোকানের নাম খুঁজুন..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-700/30 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setProductFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    productFilter === 'all'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  সকল পণ্য ({totalAllProducts})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('listed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    productFilter === 'listed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  মল লাইভ ({totalListedProducts})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('unlisted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    productFilter === 'unlisted'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  অপ্রকাশিত ({totalUnlistedProducts})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilter('blocked')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    productFilter === 'blocked'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  🚫 ব্লকড / স্থগিত ({totalBlockedProducts})
                </button>
              </div>
            </div>

            {/* Global Quick Action Buttons */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProductIds.length === filteredProducts.length) {
                      setSelectedProductIds([]);
                    } else {
                      setSelectedProductIds(filteredProducts.map(p => p.id));
                    }
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-teal-800" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>সব নির্বাচন ({filteredProducts.length})</span>
                </button>

                {selectedProductIds.length > 0 && (
                  <span className="text-[11px] text-teal-900 font-bold bg-teal-50 border border-teal-200 px-2 py-1 rounded-md">
                    {selectedProductIds.length} টি নির্বাচিত
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedProductIds.length > 0 ? (
                  <>
                    <button
                      type="button"
                      disabled={isBatchProcessing}
                      onClick={() => handleBatchProductsAction('selected_publish')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>নির্বাচিত পাবলিশ</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBatchProcessing}
                      onClick={() => handleBatchProductsAction('selected_block')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>নির্বাচিত ব্লক</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBatchProcessing}
                      onClick={() => handleBatchProductsAction('selected_delete', false)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <span>মল থেকে সরান</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBatchProcessing}
                      onClick={() => {
                        if (confirm(`নির্বাচিত ${selectedProductIds.length} টি পণ্য স্থায়ীভাবে ডিলিট করতে চান?`)) {
                          handleBatchProductsAction('selected_delete', true);
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>স্থায়ী ডিলিট</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds([])}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      বাতিল
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <select
                      disabled={isBatchProcessing}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (val === 'publish_all') handleBatchProductsAction('publish_all');
                        else if (val === 'unpublish_all') handleBatchProductsAction('unpublish_all');
                        else if (val === 'block_all') handleBatchProductsAction('block_all');
                        else if (val === 'remove_all_marketplace') handleBatchProductsAction('remove_all_marketplace');
                        e.target.value = '';
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer focus:outline-none hover:bg-slate-50"
                    >
                      <option value="">⚡ এক ক্লিকে সকল পণ্যের অ্যাকশন ▾</option>
                      <option value="publish_all">✅ সকল পণ্য এক ক্লিকে পাবলিশ করুন</option>
                      <option value="unpublish_all">⏸️ সকল পণ্য এক ক্লিকে আনপাবলিশ করুন</option>
                      <option value="block_all">🚫 সকল পণ্য এক ক্লিকে ব্লক করুন</option>
                      <option value="remove_all_marketplace">🗑️ সেন্ট্রাল মল থেকে সব পণ্য সরান</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                const isBlocked = p.marketplaceStatus === 'blocked';
                const isApprovedListed = p.isListedOnMarketplace && p.marketplaceStatus === 'approved';

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-3.5 space-y-2.5 shadow-2xs flex flex-col justify-between transition ${
                      isSelected
                        ? 'border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/20'
                        : isBlocked
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-xl bg-slate-100" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            📦
                          </div>
                        )}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(prev => [...prev, p.id]);
                            } else {
                              setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700 bg-white cursor-pointer shadow-xs"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] text-teal-800 font-bold truncate max-w-[130px]">
                            {p.vendorShopName || 'ভেন্ডর'}
                          </span>
                          {isBlocked ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                              🚫 ব্লকড
                            </span>
                          ) : isApprovedListed ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              মলে পাবলিশড
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              অপ্রকাশিত
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate" title={p.name}>
                          {p.name}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-black text-slate-900">৳{p.salePrice}</span>
                          <span className="text-[10px] text-slate-500 font-mono">স্টক: {p.stock}</span>
                        </div>
                        {p.vendorPhone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ফোন: {p.vendorPhone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleModerateProduct(p.id, { isFeaturedOnMarketplace: !p.isFeaturedOnMarketplace })}
                          className={`px-2 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                            p.isFeaturedOnMarketplace ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="ফিচার্ড প্রোডাক্ট হিসেবে টগল করুন"
                        >
                          {p.isFeaturedOnMarketplace ? '★ ফিচার্ড' : '☆ ফিচার'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductDeleteModal({ id: p.id, name: p.name })}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="পণ্য মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {isBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleModerateProduct(p.id, { 
                              marketplaceStatus: 'approved',
                              isListedOnMarketplace: true,
                            })}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>আনব্লক ও পাবলিশ</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleModerateProduct(p.id, { 
                                isListedOnMarketplace: !isApprovedListed,
                                marketplaceStatus: !isApprovedListed ? 'approved' : 'unlisted',
                              })}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer shadow-2xs ${
                                isApprovedListed
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isApprovedListed ? 'আনপাবলিশ' : '✓ পাবলিশ'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleModerateProduct(p.id, { 
                                marketplaceStatus: 'blocked',
                                isListedOnMarketplace: false,
                              })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] transition cursor-pointer"
                              title="পণ্যটি মার্কেটপ্লেস থেকে সাময়িক ব্লক করুন"
                            >
                              🚫 ব্লক
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">সেন্ট্রাল মলের ক্যাটাগরি তালিকা</p>
            <button
              type="button"
              onClick={() => {
                setCatForm({ id: '', nameBn: '', nameEn: '', slug: '', icon: 'ShoppingBag', sortOrder: data.categories.length + 1, isActive: true });
                setIsCatModalOpen(true);
              }}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন ক্যাটাগরি</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-teal-800 font-bold">↔ সাইড স্ক্রল:</span>
                <span>ক্যাটাগরি টেবিল ডানে-বামে স্ক্রল করুন</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => document.getElementById('categories-scroll-table')?.scrollBy({ left: -200, behavior: 'smooth' })}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  ◀ বামে
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('categories-scroll-table')?.scrollBy({ left: 200, behavior: 'smooth' })}
                  className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-700 shadow-2xs cursor-pointer text-xs"
                >
                  ডানে ▶
                </button>
              </div>
            </div>
            <div id="categories-scroll-table" className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs divide-y divide-slate-100 min-w-[700px]">
              <thead className="bg-slate-50 font-bold text-slate-800">
                <tr>
                  <th className="p-3">ক্রম</th>
                  <th className="p-3">বাংলা নাম</th>
                  <th className="p-3">ইংরেজি নাম</th>
                  <th className="p-3">স্লাগ (Slug)</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.categories.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">{c.sortOrder || idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{c.nameBn}</td>
                    <td className="p-3 text-slate-600">{c.nameEn || '-'}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{c.slug}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCatForm({
                            id: c.id,
                            nameBn: c.nameBn,
                            nameEn: c.nameEn || '',
                            slug: c.slug,
                            icon: c.icon || 'ShoppingBag',
                            sortOrder: c.sortOrder || 1,
                            isActive: c.isActive !== false,
                          });
                          setIsCatModalOpen(true);
                        }}
                        className="p-1 text-slate-600 hover:text-teal-800"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Category Add/Edit Modal */}
          {isCatModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-900">
                    {catForm.id ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}
                  </h4>
                  <button type="button" onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">বাংলা নাম *</label>
                    <input
                      type="text"
                      required
                      value={catForm.nameBn}
                      onChange={(e) => setCatForm({ ...catForm, nameBn: e.target.value })}
                      placeholder="যেমন: তেল ও খাঁটি ঘি"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ইংরেজি নাম</label>
                    <input
                      type="text"
                      value={catForm.nameEn}
                      onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
                      placeholder="e.g. Oil & Pure Ghee"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">স্লাগ (URL Slug)</label>
                    <input
                      type="text"
                      value={catForm.slug}
                      onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                      placeholder="oil-ghee"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(false)}
                      className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-slate-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-teal-800 text-white rounded-lg font-bold"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: SETTINGS */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6 max-w-3xl text-xs shadow-xs">
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900">
              মার্কেটপ্লেস প্ল্যাটফর্ম ও ডেলিভারি সেটিংস
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              সেন্ট্রাল মার্কেটপ্লেসের সার্বিক কার্যকারিতা, ডেলিভারি চার্জ এবং গ্রাহক নোটিশ ব্যানার নিয়ন্ত্রণ করুন।
            </p>
          </div>

          {/* Unified Platform Payment System Info Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>একীভূত প্ল্যাটফর্ম পেমেন্ট সিস্টেম (Unified System Payment Gateway)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              সেন্ট্রাল মার্কেটপ্লেসের জন্য আলাদা কোনো পেমেন্ট গেটওয়ে রাখা হয়নি। সাবস্ক্রিপশন ও সেন্ট্রাল মার্কেটপ্লেস উভয়ই সুপার অ্যাডমিন প্যানেলের প্রধান <strong className="text-slate-800">"পেমেন্ট সেটিংস"</strong> (System Payment Settings) এর অন্তর্ভুক্ত বাংলাদেশ ব্যাংক অনুমোদিত সরকারি লাইসেন্সপ্রাপ্ত অটোমেটিক পেমেন্ট গেটওয়ে (Paymently / Live Gateway), ক্যাশ অন ডেলিভারি, বিকাশ ও রকেট পেমেন্ট মেথড সরাসরি ও স্বয়ংক্রিয়ভাবে রিয়েল-টাইমে ব্যবহার করে।
            </p>
          </div>

          {/* Marketplace Active Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-bold text-slate-900">সেন্ট্রাল মার্কেটপ্লেস সক্রিয় রাখুন</p>
              <p className="text-[11px] text-slate-500">বন্ধ রাখলে সাধারণ ভিজিটররা সেন্ট্রাল মলে প্রবেশ করতে পারবে না</p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsForm({ ...settingsForm, isMarketplaceActive: !settingsForm.isMarketplaceActive })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                settingsForm.isMarketplaceActive ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Cash on Delivery (COD) Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>ক্যাশ অন ডেলিভারি (Cash on Delivery - COD)</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  settingsForm.codEnabled !== false
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {settingsForm.codEnabled !== false ? 'চালু' : 'বন্ধ'}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                গ্রাহকরা পণ্য হাতে পেয়ে মূল্য পরিশোধ করতে পারবেন। বন্ধ রাখলে চেকআউটে শুধু লাইভ পেমেন্ট ও MFS থাকবে।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsForm({ ...settingsForm, codEnabled: settingsForm.codEnabled === false ? true : false })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                settingsForm.codEnabled !== false ? 'bg-teal-700 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Platform Monetization & Commission Settings */}
          <div className="space-y-3 p-4 bg-gradient-to-br from-emerald-50/70 via-teal-50/50 to-slate-50 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  <span>প্ল্যাটফর্ম প্রফিট ও ভেন্ডর কমিশন মডেল (Monetization)</span>
                </h4>
                <p className="text-[11px] text-emerald-800/90 mt-0.5">
                  প্রতিটি বিক্রির ওপর সুপার অ্যাডমিনের কমিশন ও ডেলিভারি মার্জিন নির্ধারণ করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('profit')}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>প্রফিট রিপোর্ট দেখুন ➔</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  প্ল্যাটফর্ম কমিশন রেট (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={settingsForm.commissionPercent}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, commissionPercent: Number(e.target.value) })
                    }
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  ডিফল্ট: ৫% (পণ্য সফলভাবে পৌঁছালে এই কমিশন সুপার এডমিনের লাভ হিসেবে জমা হবে)
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  ডেলিভারি ফি মার্জিন (৳ প্রতি অর্ডার)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={settingsForm.platformDeliveryMargin}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        platformDeliveryMargin: Number(e.target.value),
                      })
                    }
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ৳
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  কুরিয়ার ডেলিভারি ফি থেকে প্ল্যাটফর্মের প্রফিট মার্জিন (যেমন: ১০৳)
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Charges */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">ডেলিভারি চার্জ নির্ধারণ</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ডেলিভারি চার্জ (ঢাকা সিটি ৳)</label>
                <input
                  type="number"
                  value={settingsForm.deliveryFeeDhaka}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFeeDhaka: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ডেলিভারি চার্জ (ঢাকার বাইরে ৳)</label>
                <input
                  type="number"
                  value={settingsForm.deliveryFeeOutside}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryFeeOutside: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
            </div>
          </div>

          {/* Marketplace Hero Banner Controls (Full Super Admin Control) */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-700" />
                  <span>সেন্ট্রাল মার্কেটপ্লেস হিরো ব্যানার কন্ট্রোল</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  সেন্ট্রাল মার্কেটপ্লেসের প্রধান ব্যানার ছবি, উপরের টাইটেল, লিংক এবং বাটন এখান থেকে পুরোপুরি নিয়ন্ত্রণ করুন।
                </p>
              </div>

              {/* Banner Active Toggle */}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={settingsForm.bannerActive !== false}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerActive: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700">ব্যানার সক্রিয় রাখুন</span>
              </label>
            </div>

            {/* Banner Title & Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">
                  ব্যানারের প্রধান টাইটেল (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.bannerTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerTitle: e.target.value })}
                  placeholder="যেমন: আপনার প্রতিদিনের প্রয়োজনীয় সব পণ্য এখন এক জায়গায়!"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ব্যানার ব্যাজ / ট্যাগ (Tag)
                </label>
                <input
                  type="text"
                  value={settingsForm.bannerTag}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerTag: e.target.value })}
                  placeholder="যেমন: ⚡ মেগা ধামাকা অফার"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
            </div>

            {/* Banner Subtitle */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                ব্যানার সাবটাইটেল বা বিবরণ (Subtitle)
              </label>
              <textarea
                rows={2}
                value={settingsForm.bannerSubtitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, bannerSubtitle: e.target.value })}
                placeholder="যেমন: সরাসরি ফ্রেশ সোর্স থেকে খাঁটি পণ্য নিয়ে সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              />
            </div>

            {/* Banner Link & Button Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-teal-700" />
                  <span>ব্যানার ক্লিক লিংক বা ডেস্টিনেশন (Link / URL)</span>
                </label>
                <input
                  type="text"
                  value={settingsForm.bannerLink}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerLink: e.target.value })}
                  placeholder="যেমন: #marketplace-best-offers-section বা কাস্টম URL"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  হিন্ট: সেরা অফারে স্ক্রোল করতে <code>#marketplace-best-offers-section</code> দিন
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  বাটন অ্যাকশন টেক্সট (Button Text)
                </label>
                <input
                  type="text"
                  value={settingsForm.bannerButtonText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerButtonText: e.target.value })}
                  placeholder="যেমন: এখনই অর্ডার করুন"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                />
              </div>
            </div>

            {/* Banner Image URL & File Upload */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">
                ব্যানার ইমেজ (Image URL বা ফাইল আপলোড)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={settingsForm.bannerImageUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, bannerImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/30 font-mono text-[11px]"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs transition border border-slate-300">
                  <Upload className="w-3.5 h-3.5" />
                  <span>ছবি আপলোড</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (reader.result) {
                            setSettingsForm({ ...settingsForm, bannerImageUrl: reader.result as string });
                            showToast('ছবি সফলভাবে লোড হয়েছে');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Quick Image Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 block">এক ক্লিকে আকর্ষণীয় প্রিসেট ব্যানার নির্বাচন করুন:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    {
                      label: '🥦 গ্রোসারি ও ফ্রেশ বাজার',
                      img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80',
                      title: 'আপনার প্রতিদিনের প্রয়োজনীয় সব পণ্য এখন এক জায়গায়!',
                      sub: 'সরাসরি ফ্রেশ সোর্স থেকে খাঁটি পণ্য নিয়ে সারা দেশে দ্রুত ক্যাশ অন ডেলিভারি।',
                      tag: '⚡ মেগা ধামাকা অফার',
                    },
                    {
                      label: '🌱 তাজা শাকসবজি ও ফল',
                      img: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1200&auto=format&fit=crop&q=80',
                      title: 'শতভাগ খাঁটি ও কীটনাশকমুক্ত তাজা খাদ্যসামগ্রী!',
                      sub: 'প্রতিদিনের বাজার হবে ঝামেলামুক্ত ও স্বাস্থ্যকর সেরা দামে।',
                      tag: '🌱 ১০০% খাঁটি পণ্য',
                    },
                    {
                      label: '📱 স্মার্ট গ্যাজেট ও লাইফস্টাইল',
                      img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&auto=format&fit=crop&q=80',
                      title: 'সেরা টেক গ্যাজেট ও আকর্ষণীয় লাইফস্টাইল অফার!',
                      sub: 'জেনুইন ব্র্যান্ডের গ্যাজেটস ও এক্সেসরিজে পান বিশেষ ছাড়।',
                      tag: '🔥 গ্যাজেট ডিল',
                    },
                    {
                      label: '✨ মেগা সুপার ডিসকাউন্ট',
                      img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
                      title: 'সেন্ট্রাল মার্কেটপ্লেস মেগা ডিসকাউন্ট ফেস্টিভ্যাল!',
                      sub: 'সেরা মানের সকল পণ্যে পান আকর্ষণীয় ক্যাশব্যাক ও ছাড়।',
                      tag: '🎉 সুপার অফার',
                    },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setSettingsForm({
                          ...settingsForm,
                          bannerImageUrl: p.img,
                          bannerTitle: p.title,
                          bannerSubtitle: p.sub,
                          bannerTag: p.tag,
                        })
                      }
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition cursor-pointer space-y-1"
                    >
                      <div className="h-12 w-full rounded-lg overflow-hidden bg-slate-200">
                        <img src={p.img} alt={p.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 block truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              {settingsForm.bannerImageUrl && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    ব্যানার লাইভ প্রিভিউ (Storefront Preview):
                  </span>
                  <div className="relative rounded-2xl overflow-hidden h-36 sm:h-44 w-full shadow-md border border-slate-200">
                    <img
                      src={settingsForm.bannerImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent flex items-center p-4 sm:p-6">
                      <div className="max-w-md space-y-1.5 text-white">
                        {settingsForm.bannerTag && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                            {settingsForm.bannerTag}
                          </span>
                        )}
                        <h4 className="text-sm sm:text-base font-black text-white leading-tight">
                          {settingsForm.bannerTitle || 'টাইটেল দিন'}
                        </h4>
                        <p className="text-[11px] text-slate-200 line-clamp-2">
                          {settingsForm.bannerSubtitle}
                        </p>
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 text-white rounded-lg text-[10px] font-bold">
                            {settingsForm.bannerButtonText || 'এখনই অর্ডার করুন'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Notice Marquee Banner */}
            <div className="pt-2 border-t border-slate-100">
              <label className="font-bold text-slate-700 block mb-1">মার্কেটপ্লেস টপ নোটিশ বার্তা (Top Notice Bar)</label>
              <textarea
                rows={2}
                value={settingsForm.bannerNotice}
                onChange={(e) => setSettingsForm({ ...settingsForm, bannerNotice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingSettings}
            className="w-full sm:w-auto px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 text-xs sm:text-sm"
          >
            {isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'মার্কেটপ্লেস সেটিংস সংরক্ষণ করুন'}
          </button>
        </form>
      )}

      {/* PAYOUT PROCESSING MODAL */}
      {selectedPayoutToProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-teal-900 to-emerald-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Wallet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">ভেন্ডর পেআউট সেটেলমেন্ট</h3>
                  <p className="text-[11px] text-teal-200">সুপার অ্যাডমিন পেমেন্ট নিষ্পত্তি ও TrxID প্রদান</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayoutToProcess(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Vendor & Amount Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">পরিশোধযোগ্য পেআউট</span>
                <span className="text-3xl font-black text-emerald-950">৳{Number(selectedPayoutToProcess.amount).toLocaleString('en-US')}</span>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  {selectedPayoutToProcess.storeName || 'ভেন্ডর'} ({selectedPayoutToProcess.storePhone || 'ফোন নেই'})
                </div>
              </div>

              {/* Target Account Details with Copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">পেমেন্ট মাধ্যম ও প্রাপক নম্বর</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 font-black text-[10px] uppercase">
                    {selectedPayoutToProcess.paymentMethod}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block">অ্যাকাউন্ট নম্বর:</span>
                    <span className="font-mono font-black text-base text-slate-900">
                      {selectedPayoutToProcess.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPayoutToProcess.accountNumber, 'modal_acc')}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedId === 'modal_acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'modal_acc' ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>ধরন: <span className="font-bold">{selectedPayoutToProcess.accountType || 'personal'}</span></div>
                  {selectedPayoutToProcess.bankName && (
                    <div>ব্যাংক: <span className="font-bold">{selectedPayoutToProcess.bankName}</span> {selectedPayoutToProcess.branchName ? `(${selectedPayoutToProcess.branchName})` : ''}</div>
                  )}
                  {selectedPayoutToProcess.requestNote && (
                    <div className="text-slate-500 italic mt-1">ভেন্ডর নোট: "{selectedPayoutToProcess.requestNote}"</div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 text-[11px] text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-teal-700" />
                  <span>পেমেন্ট সেটেলমেন্ট নির্দেশিকা:</span>
                </div>
                <p className="leading-relaxed">
                  ১. আপনার বিকাশ/নগদ অ্যাপ থেকে উপরের নম্বরে Send Money করুন।<br />
                  ২. লেনদেন শেষে প্রাপ্ত TrxID নিচে লিখুন।<br />
                  ৩. অনুমোদন করলে ভেন্ডরের ক্যাশবুকে স্বয়ংক্রিয় এন্ট্রি হবে এবং নোটিফিকেশন যাবে।
                </p>
              </div>

              {/* TrxID Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  বিকাশ/নগদ/ব্যাংক TrxID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adminTrxIdInput}
                  onChange={(e) => setAdminTrxIdInput(e.target.value)}
                  placeholder="যেমন: 8N9K2L4P বা TR-10928"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-700 focus:outline-none uppercase"
                />
              </div>

              {/* Admin Note Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">অ্যাডমিন নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="যেমন: বিকাশ পার্সোনাল সেন্ড মানি করা হয়েছে"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={isProcessingPayout}
                  onClick={() => handleProcessPayout('approve')}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>পরিশোধ নিশ্চিত করুন (Approve)</span>
                </button>

                {selectedPayoutToProcess.status === 'pending' && (
                  <button
                    type="button"
                    disabled={isProcessingPayout}
                    onClick={() => handleProcessPayout('reject')}
                    className="py-2.5 px-3 border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>বাতিল</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPayoutToProcess(null)}
                  className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  বন্ধ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN PAYMENT APPROVAL MODAL */}
      {approvingOrder && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">পেমেন্ট অনুমোদন ও একসেপ্ট</h3>
                  <span className="text-[11px] font-mono text-teal-800 font-bold block">
                    অর্ডার #{approvingOrder.orderNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order summary box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">গ্রাহকের নাম:</span>
                <span className="font-bold text-slate-900">{approvingOrder.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">মোবাইল নম্বর:</span>
                <span className="font-mono font-bold text-slate-800">{approvingOrder.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">মোট বিল:</span>
                <span className="font-black text-emerald-800 text-sm">৳{approvingOrder.grandTotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">পেমেন্ট মেথড:</span>
                <span className="font-bold uppercase text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {approvingOrder.paymentMethod}
                </span>
              </div>
              {approvingOrder.paymentTrxId && (
                <div className="flex justify-between items-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-amber-900 font-bold text-[11px]">TrxID:</span>
                  <span className="font-mono font-black text-amber-950 select-all text-xs">
                    {approvingOrder.paymentTrxId}
                  </span>
                </div>
              )}
              {approvingOrder.customerAddress && (
                <div className="flex justify-between items-start text-[11px] text-slate-600">
                  <span className="text-slate-500">ঠিকানা:</span>
                  <span className="text-right max-w-[200px] font-medium">{approvingOrder.customerAddress}</span>
                </div>
              )}
              {approvingOrder.senderPhone && (
                <div className="flex justify-between items-center text-[11px] text-slate-600">
                  <span>টাকা প্রেরকের ফোন:</span>
                  <span className="font-mono font-bold">{approvingOrder.senderPhone}</span>
                </div>
              )}

              {/* পণ্যের মেমো হিসাব (তেল ২কেজি ৪২০×২=৮৪০৳) */}
              {Array.isArray(approvingOrder.items) && approvingOrder.items.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    অর্ডারের মেমো হিসাব:
                  </span>
                  {approvingOrder.items.map((it: any, idx: number) => {
                    const q = Number(it.quantity) || 1;
                    const p = Number(it.unitPrice || it.price || 0);
                    const sub = Number(it.subtotal || p * q);
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs py-0.5 px-2 bg-white rounded border border-slate-100">
                        <span className="font-bold text-slate-800">• {it.name} {q} {it.unit || 'পিস'}</span>
                        <span className="font-mono font-black text-emerald-950 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px]">
                          {p} × {q} = ৳{sub}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Permission preview */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 space-y-1">
              <p className="font-bold flex items-center gap-1 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>অনুমোদন দিলে যা ঘটবে:</span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                <li>ভেন্ডরের সাইটে অর্ডারটি সাথে সাথে আনলক হবে (পণ্য প্রস্তুত ও ডেলিভারির অনুমতি পাবে)।</li>
                <li>গ্রাহকের নম্বরে অফিসিয়াল কনফার্মেশন SMS পাঠানো হবে।</li>
              </ul>
            </div>

            {/* Optional Admin Note */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">অ্যাডমিন নোট (ঐচ্ছিক):</label>
              <input
                type="text"
                value={approvalAdminNote}
                onChange={(e) => setApprovalAdminNote(e.target.value)}
                placeholder="যেমন: পেমেন্ট বিকাশ মার্চেন্টে যাচাইকৃত"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isApprovingPayment === approvingOrder.id}
                onClick={() => handleApprovePayment(approvingOrder)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isApprovingPayment === approvingOrder.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {isApprovingPayment === approvingOrder.id
                    ? 'অনুমোদন হচ্ছে...'
                    : '✓ পেমেন্ট ভেরিফাই ও একসেপ্ট করুন'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setApprovingOrder(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN PAYMENT REJECTION MODAL */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900">পেমেন্ট রিজেক্ট ও অর্ডার বাতিল</h3>
                  <span className="text-[11px] font-mono text-slate-500 font-bold block">
                    অর্ডার #{rejectingOrder.orderNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order summary box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">গ্রাহকের নাম:</span>
                <span className="font-bold text-slate-900">{rejectingOrder.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">মোবাইল নম্বর:</span>
                <span className="font-mono font-bold text-slate-800">{rejectingOrder.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">মোট বিল:</span>
                <span className="font-black text-slate-900 text-sm">৳{rejectingOrder.grandTotal}</span>
              </div>
              {rejectingOrder.paymentTrxId && (
                <div className="flex justify-between items-center bg-rose-50 p-2 rounded-lg border border-rose-200">
                  <span className="text-rose-800 font-bold text-[11px]">প্রদত্ত TrxID:</span>
                  <span className="font-mono font-black text-rose-950 select-all text-xs">
                    {rejectingOrder.paymentTrxId}
                  </span>
                </div>
              )}
            </div>

            {/* Rejection reason choice & input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                বাতিলের কারণ নির্বাচন করুন বা লিখুন:
              </label>

              {/* Quick tags */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'TrxID সঠিক নয় বা ভুয়া',
                  'পেমেন্ট অ্যাকাউন্টে জমা হয়নি',
                  'ভুল টাকার পরিমাণ পাঠানো হয়েছে',
                  'গ্রাহকের অনুরোধে বাতিল',
                ].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setRejectionReasonInput(quick)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                      rejectionReasonInput === quick
                        ? 'bg-rose-100 border-rose-400 text-rose-950 font-black'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {quick}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="বাতিলের সুনির্দিষ্ট কারণ লিখুন (গ্রাহকের ফোনে এসএমএস যাবে)..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Warning Note */}
            <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-[11px] text-rose-950 space-y-1">
              <p className="font-bold flex items-center gap-1 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>সতর্কতা:</span>
              </p>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                রিজেক্ট সাবমিট করলে ভেন্ডরদের ড্যাশবোর্ড থেকে অর্ডারটি উধাও হয়ে যাবে, পণ্যের স্টক স্বয়ংক্রিয়ভাবে ফেরত আসবে এবং গ্রাহককে এসএমএসে জানানো হবে।
              </p>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isApprovingPayment === rejectingOrder.id}
                onClick={handleRejectPayment}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isApprovingPayment === rejectingOrder.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>
                  {isApprovingPayment === rejectingOrder.id
                    ? 'বাতিল হচ্ছে...'
                    : '❌ রিজেক্ট সাবমিট করুন'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ফিরে যান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECT VENDOR PAYOUT ================= */}
      {directPayoutVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">ভেন্ডরকে সরাসরি পেআউট প্রদান</h3>
                  <p className="text-[11px] text-emerald-200">{directPayoutVendor.shopName} ({directPayoutVendor.name})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDirectPayoutVendor(null)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Due Summary Card with Transparent Monetization Breakdown */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/60 to-slate-50 rounded-2xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                  <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-teal-700" />
                    <span>পেমেন্ট হিসাব ও প্ল্যাটফর্ম কমিশন বিবরণী</span>
                  </span>
                  <span className="text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                    কমিশন: {directPayoutVendor.commissionRate ?? vendorBalances.summary.defaultCommissionPercent ?? 5}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">১. ডেলিভারি বিক্রি</span>
                    <span className="font-black text-slate-900 text-sm">
                      ৳{Number(directPayoutVendor.deliveredSales || 0).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-200">
                    <span className="text-[10px] text-teal-700 font-bold block">২. প্ল্যাটফর্ম কমিশন লাভ</span>
                    <span className="font-black text-teal-800 text-sm">
                      -৳{Number(directPayoutVendor.commissionAmount || Math.round(((directPayoutVendor.deliveredSales || 0) * (directPayoutVendor.commissionRate || 5)) / 100)).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">৩. ইতিমধ্যে পেইড</span>
                    <span className="font-black text-slate-700 text-sm">
                      ৳{Number(directPayoutVendor.settledAmount || 0).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="bg-emerald-100/90 p-2.5 rounded-xl border border-emerald-300">
                    <span className="text-[10px] text-emerald-950 font-bold block">৪. নিট প্রদেয় বকেয়া</span>
                    <span className="font-black text-emerald-950 text-base">
                      ৳{Number(directPayoutVendor.dueBalance || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  💡 প্ল্যাটফর্ম কমিশন {directPayoutVendor.commissionRate ?? 5}% স্বয়ংক্রিয়ভাবে বাদ দিয়ে ভেন্ডরের নিট বকেয়া নির্ধারণ করা হয়েছে।
                </p>
              </div>

              {/* কাস্টমার ডিটেলস ও মেমো আকারে পণ্যের হিসাব বিবরণী (পেমেন্ট করার আগে স্পষ্ট হিসাব) */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>কাস্টমার মেমো বিবরণী (এত টাকা কীভাবে হলো)</span>
                  </span>
                  <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                    {(directPayoutVendor.orders || []).length} টি অর্ডার
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  পেমেন্ট সম্পন্ন করার পূর্বে প্রতিটি অর্ডারের কাস্টমার তথ্য এবং পণ্যের মেমো হিসাব (যেমন: তেল ২কেজি ৪২০×২=৮৪০৳) মিলিয়ে নিন:
                </p>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {(directPayoutVendor.orders || []).length === 0 ? (
                    <div className="text-center py-4 text-slate-400 font-medium">কোনো অর্ডারের তথ্য পাওয়া যায়নি</div>
                  ) : (
                    (directPayoutVendor.orders || []).map((ord: any, oIdx: number) => {
                      const isDelivered = ord.orderStatus === 'delivered';
                      const isSettled = ord.vendorPayoutStatus === 'settled';
                      const items: any[] = Array.isArray(ord.items) ? ord.items : [];

                      return (
                        <div
                          key={ord.id || oIdx}
                          className={`p-3 rounded-xl border transition ${
                            isSettled
                              ? 'bg-slate-100/70 border-slate-200'
                              : isDelivered
                              ? 'bg-emerald-50/60 border-emerald-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-teal-950 text-xs">#{ord.orderNumber}</span>
                              {ord.createdAt && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(ord.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {isDelivered ? (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✅ ডেলিভারি সম্পন্ন
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  ⏳ চলমান
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {isSettled ? '✅ ইতিমধ্যে পেইড' : '⏳ পেআউট বকেয়া'}
                            </span>
                          </div>

                          {/* Customer Details Block */}
                          <div className="bg-white p-2 rounded-lg border border-slate-200/70 text-[11px] mb-2 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900">
                                👤 কাস্টমার: {ord.customerName || 'গ্রাহক'}
                              </span>
                              <span className="font-mono font-bold text-slate-700">
                                📞 {ord.customerPhone}
                              </span>
                            </div>
                            {ord.customerAddress && (
                              <div className="text-slate-500 text-[10px] truncate" title={ord.customerAddress}>
                                📍 ঠিকানা: {ord.customerAddress}
                              </div>
                            )}
                          </div>

                          {/* Memo format items list (যেমন তেল ২কেজি ৪২০×২=৮৪০৳) */}
                          <div className="space-y-1">
                            {items.map((it: any, iIdx: number) => {
                              const qty = Number(it.quantity) || 1;
                              const unit = it.unit || 'পিস';
                              const price = Number(it.unitPrice || it.price || (it.subtotal ? it.subtotal / qty : 0));
                              const sub = Number(it.subtotal || price * qty);

                              return (
                                <div
                                  key={iIdx}
                                  className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100"
                                >
                                  <span className="font-bold text-slate-800">
                                    • {it.name} {qty} {unit}
                                  </span>
                                  <span className="font-mono font-black text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                    {price} × {qty} = ৳{sub.toLocaleString('en-US')}
                                  </span>
                                </div>
                              );
                            })}

                            <div className="flex items-center justify-between pt-1 text-xs font-bold border-t border-slate-200">
                              <span className="text-slate-500 text-[11px]">
                                {Number(ord.deliveryCharge) > 0 ? `+ ডেলিভারি চার্জ: ৳${ord.deliveryCharge}` : 'অর্ডার মোট বিল:'}
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                মোট: ৳{Number(ord.totalAmount).toLocaleString('en-US')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    পেআউট পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={directPayoutAmount}
                    onChange={(e) => setDirectPayoutAmount(e.target.value)}
                    placeholder="টাকার পরিমাণ লিখুন..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <div className="flex gap-2 mt-1">
                    {directPayoutVendor.dueBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setDirectPayoutAmount(String(directPayoutVendor.dueBalance))}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        সম্পূর্ণ বকেয়া (৳{directPayoutVendor.dueBalance})
                      </button>
                    )}
                    {directPayoutVendor.grossSales - directPayoutVendor.settledAmount > directPayoutVendor.dueBalance && (
                      <button
                        type="button"
                        onClick={() => setDirectPayoutAmount(String(directPayoutVendor.grossSales - directPayoutVendor.settledAmount))}
                        className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        সর্বমোট সম্ভাব্য (৳{directPayoutVendor.grossSales - directPayoutVendor.settledAmount})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">
                      পেমেন্ট মেথড <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={directPayoutMethod}
                      onChange={(e) => setDirectPayoutMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                    >
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="rocket">রকেট (Rocket)</option>
                      <option value="bank">ব্যাংক ট্রান্সফার (Bank)</option>
                      <option value="cash">সরাসরি ক্যাশ (Cash)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1">
                      প্রাপক নম্বর / অ্যাকাউন্ট
                    </label>
                    <input
                      type="text"
                      value={directPayoutAccount}
                      onChange={(e) => setDirectPayoutAccount(e.target.value)}
                      placeholder="বিকাশ/নগদ নম্বর বা ব্যাংক হিসাব..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    ট্রানজেকশন আইডি (TrxID) বা ক্যাশ ভাউচার <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={directPayoutTrxId}
                    onChange={(e) => setDirectPayoutTrxId(e.target.value)}
                    placeholder="যেমন: 9B73XDF8 లేదా CASH-VOUCHER-01..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">ভেন্ডরের ক্যাশবুকে এই TrxID জমা হবে</p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">
                    অ্যাডমিন নোট (ঐচ্ছিক)
                  </label>
                  <textarea
                    rows={2}
                    value={directPayoutNote}
                    onChange={(e) => setDirectPayoutNote(e.target.value)}
                    placeholder="পেআউট সংক্রান্ত কোনো নোট..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Action Note */}
              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">💡 নিষ্পত্তি সংক্রান্ত তথ্য:</span>
                <p>
                  পেআউট নিশ্চিত করলে ভেন্ডরের ডেলিভারি হওয়া অর্ডারগুলোর ব্যালেন্স স্বয়ংক্রিয়ভাবে নিষ্পত্তিকৃত (Settled) হিসেবে আপডেট হবে এবং ভেন্ডরের অ্যাপের ক্যাশবুকে আয়ের ভাউচার যোগ হবে।
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDirectPayoutVendor(null)}
                disabled={isSubmittingDirectPayout}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmDirectPayout}
                disabled={isSubmittingDirectPayout || !directPayoutAmount || !directPayoutTrxId}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDirectPayout ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>প্রসেসিং হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>পেআউট নিশ্চিত ও নিষ্পত্তি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VENDOR SOLD PRODUCTS & RECEIVABLE AMOUNT BREAKDOWN (কোন কোন প্রোডাক্ট বিক্রি হয়েছে ও কোন প্রোডাক্টের টাকা পাবে) ================= */}
      {selectedVendorForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 text-teal-300 flex items-center justify-center border border-white/20">
                  <Store className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {selectedVendorForDetail.shopName || selectedVendorForDetail.name}
                  </h3>
                  <p className="text-xs text-teal-200">
                    {selectedVendorForDetail.isAllCentralMall
                      ? `${selectedVendorForDetail.name} • কোন কোন প্রোডাক্ট বিক্রি হয়েছে এবং কোন প্রোডাক্টের কত টাকা পাবে`
                      : `মালিক: ${selectedVendorForDetail.name}${selectedVendorForDetail.phone ? ` • ফোন: ${selectedVendorForDetail.phone}` : ''} • বিক্রিত প্রোডাক্ট ও প্রাপ্য টাকার বিস্তারিত হিসাব`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendorForDetail(null)}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Financial & Sold Products Summary Cards */}
              {(() => {
                const vDeliv = Number(selectedVendorForDetail.deliveredSales || 0);
                const vSettled = Number(selectedVendorForDetail.settledAmount || 0);
                const vDue = Number(selectedVendorForDetail.deliveredDue ?? Math.max(0, vDeliv - vSettled));
                const soldUnits = selectedVendorForDetail.soldUnitsCount || (selectedVendorForDetail.soldProducts || []).reduce((s: number, p: any) => s + (Number(p.totalQuantitySold) || 0), 0);
                const soldTypes = (selectedVendorForDetail.soldProducts || []).length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-600 uppercase block">১. ডেলিভারি সম্পন্ন মোট বিক্রি</span>
                      <span className="text-xl font-black text-slate-900 block mt-0.5">
                        ৳{vDeliv.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">গ্রাহকের কাছে পৌঁছানো পণ্য</span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">২. ইতিমধ্যে পরিশোধ করেছে সুপার অ্যাডমিন</span>
                      <span className="text-xl font-black text-emerald-700 block mt-0.5">
                        ৳{vSettled.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">ভেন্ডরকে পরিশোধিত মোট পেআউট</span>
                    </div>

                    <div className={`p-3.5 rounded-2xl border-2 ${vDue > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50/70 border-emerald-300'}`}>
                      <span className={`text-[10px] font-bold uppercase block ${vDue > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
                        ৩. সুপার এডমিনের কাছে পাবে
                      </span>
                      {vDue > 0 ? (
                        <>
                          <span className="text-xl font-black text-amber-900 block mt-0.5">
                            ৳{vDue.toLocaleString('en-US')}
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">⏳ অবশিষ্ট প্রদেয় বকেয়া</span>
                        </>
                      ) : vDeliv > 0 ? (
                        <>
                          <span className="text-xl font-black text-emerald-800 block mt-0.5">৳০</span>
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">✅ সব পরিশোধিত (বকেয়া নেই)</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-black text-slate-400 block mt-0.5">৳০</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">কোনো ডেলিভারি হয়নি</span>
                        </>
                      )}
                    </div>

                    <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase block">৪. মোট বিক্রিত প্রোডাক্ট</span>
                      <span className="text-xl font-black text-indigo-950 block mt-0.5">
                        {soldUnits} পিস
                      </span>
                      <span className="text-[10px] text-indigo-700 block mt-0.5">
                        {soldTypes} ধরনের প্রোডাক্ট
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Section Switcher & Status Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDetailViewSection('products')}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      detailViewSection === 'products'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>কোন কোন প্রোডাক্ট বিক্রি হয়েছে ({(selectedVendorForDetail.soldProducts || []).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailViewSection('orders')}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      detailViewSection === 'orders'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>অর্ডার অনুযায়ী বিক্রিত প্রোডাক্টের তালিকা ({(selectedVendorForDetail.orders || []).length})</span>
                  </button>
                </div>

                {/* Filter by Delivery Status */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      detailFilterTab === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    সব প্রোডাক্ট
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('delivered')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      detailFilterTab === 'delivered' ? 'bg-emerald-700 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    ডেলিভারি সম্পন্ন
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('in_progress')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      detailFilterTab === 'in_progress' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    ডেলিভারি চলমান
                  </button>
                </div>
              </div>

              {/* VIEW 1: PRODUCT-WISE BREAKDOWN (কোন কোন প্রোডাক্ট বিক্রি হয়েছে এবং কোন কোন প্রোডাক্ট এর টাকা পাবে) */}
              {detailViewSection === 'products' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-900">
                      📦 বিক্রিত প্রোডাক্টের তালিকা ও কোন প্রোডাক্টের কত টাকা পাবে
                    </h4>
                    <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      প্রতিটি প্রোডাক্টের বিক্রয় সংখ্যা ও প্রাপ্য টাকা
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left text-xs divide-y divide-slate-100 min-w-[760px]">
                        <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                            <th className="p-3">বিক্রিত প্রোডাক্টের নাম ও বিবরণ</th>
                            {selectedVendorForDetail.isAllCentralMall && (
                              <th className="p-3">ভেন্ডর / দোকান</th>
                            )}
                            <th className="p-3 text-center">একক দর</th>
                            <th className="p-3 text-center">কত পিস বিক্রি হয়েছে</th>
                            <th className="p-3">ডেলিভারি স্ট্যাটাস</th>
                            <th className="p-3 text-right">এই প্রোডাক্টের কত টাকা পাবে</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const rawProds: any[] = selectedVendorForDetail.soldProducts || [];
                            const filteredProds = rawProds.filter((p) => {
                              if (detailFilterTab === 'delivered') return (Number(p.deliveredQuantity) || 0) > 0;
                              if (detailFilterTab === 'in_progress') return (Number(p.inProgressQuantity) || 0) > 0;
                              return true;
                            });

                            if (filteredProds.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={selectedVendorForDetail.isAllCentralMall ? 6 : 5} className="p-8 text-center text-slate-400 font-medium">
                                    এই ফিল্টারে কোনো বিক্রিত প্রোডাক্ট পাওয়া যায়নি
                                  </td>
                                </tr>
                              );
                            }

                            return filteredProds.map((prod: any, idx: number) => {
                              const delivQty = Number(prod.deliveredQuantity) || 0;
                              const inProgQty = Number(prod.inProgressQuantity) || 0;
                              const delivAmt = Number(prod.deliveredAmount) || 0;
                              const inProgAmt = Number(prod.inProgressAmount) || 0;
                              const totalAmt = Number(prod.receivableAmount || prod.totalSoldAmount) || 0;

                              return (
                                <tr key={`${prod.productId}_${idx}`} className="hover:bg-slate-50/70 transition">
                                  <td className="p-3">
                                    <div className="flex items-center gap-3">
                                      {prod.imageUrl ? (
                                        <img
                                          src={prod.imageUrl}
                                          alt={prod.name}
                                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                                        />
                                      ) : (
                                        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold shrink-0">
                                          📦
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-black text-slate-900 text-sm">{prod.name}</div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                          {prod.category && (
                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                              {prod.category}
                                            </span>
                                          )}
                                          {Array.isArray(prod.orderNumbers) && prod.orderNumbers.length > 0 && (
                                            <span className="font-mono text-[10px] text-teal-800">
                                              অর্ডার: #{prod.orderNumbers.slice(0, 3).join(', #')}
                                              {prod.orderNumbers.length > 3 ? ` +${prod.orderNumbers.length - 3}` : ''}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {selectedVendorForDetail.isAllCentralMall && (
                                    <td className="p-3">
                                      <div className="font-bold text-slate-800">{prod.vendorShopName || 'ভেন্ডর'}</div>
                                      {prod.vendorPhone && (
                                        <div className="text-[10px] font-mono text-slate-500">{prod.vendorPhone}</div>
                                      )}
                                    </td>
                                  )}

                                  <td className="p-3 text-center whitespace-nowrap font-bold text-slate-700">
                                    ৳{Number(prod.unitPrice || 0).toLocaleString('en-US')} / {prod.unit || 'পিস'}
                                  </td>

                                  <td className="p-3 text-center whitespace-nowrap">
                                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-900 font-black text-xs border border-indigo-200 inline-block">
                                      {prod.totalQuantitySold} {prod.unit || 'পিস'} বিক্রি
                                    </span>
                                  </td>

                                  <td className="p-3 whitespace-nowrap">
                                    <div className="space-y-1">
                                      {delivQty > 0 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 mr-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          <span>{delivQty} {prod.unit || 'পিস'} ডেলিভার্ড</span>
                                        </span>
                                      )}
                                      {inProgQty > 0 && (
                                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px] inline-flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          <span>{inProgQty} {prod.unit || 'পিস'} ডেলিভারি চলমান</span>
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-right whitespace-nowrap">
                                    <div className="text-sm font-black text-slate-900">
                                      ৳{totalAmt.toLocaleString('en-US')}
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 inline-block mt-0.5">
                                      {prod.unitPrice || 0} × {prod.totalQuantitySold} = ৳{totalAmt.toLocaleString('en-US')}
                                    </div>
                                    <div className="text-[10px] space-y-0.5 mt-0.5">
                                      {delivAmt > 0 && (
                                        <span className="text-emerald-800 font-bold block">
                                          ✅ ডেলিভারি সম্পন্ন: ৳{delivAmt.toLocaleString('en-US')} ({delivQty}টি)
                                        </span>
                                      )}
                                      {inProgAmt > 0 && (
                                        <span className="text-amber-700 font-semibold block">
                                          ⏳ ডেলিভারি চলমান: ৳{inProgAmt.toLocaleString('en-US')} ({inProgQty}টি)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: ORDER-BY-ORDER SOLD PRODUCTS & RECEIVABLES WITH FULL CUSTOMER MEMO */}
              {detailViewSection === 'orders' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-900">
                      🧾 অর্ডার অনুযায়ী কাস্টমার ডিটেলস ও পণ্যের মেমো হিসাব ({selectedVendorForDetail.orders?.length || 0})
                    </h4>
                    <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      প্রতিটি অর্ডারে তেল ২কেজি ৪২০×২=৮৪০৳ মেমো বিবরণী
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left text-xs divide-y divide-slate-100 min-w-[820px]">
                        <thead className="bg-slate-50 text-slate-700 font-bold">
                          <tr>
                            <th className="p-3">অর্ডার নম্বর ও তারিখ</th>
                            <th className="p-3">কাস্টমার তথ্য ও ঠিকানা</th>
                            <th className="p-3">পণ্যের মেমো হিসাব (নাম, দর × পরিমাণ = মোট)</th>
                            <th className="p-3">ডেলিভারি স্ট্যাটাস</th>
                            <th className="p-3 text-right">কত টাকা পাবে (প্রাপ্য)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const rawOrders: any[] = selectedVendorForDetail.orders || [];
                            const filteredOrds = rawOrders.filter((ord) => {
                              if (detailFilterTab === 'delivered') return ord.orderStatus === 'delivered';
                              if (detailFilterTab === 'in_progress') return ord.orderStatus !== 'delivered';
                              return true;
                            });

                            if (filteredOrds.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                    কোনো অর্ডার পাওয়া যায়নি
                                  </td>
                                </tr>
                              );
                            }

                            const statusLabelMap: Record<string, string> = {
                              pending: '⏳ পেন্ডিং',
                              confirmed: '✅ কনফার্মড',
                              processing: '📦 প্রস্তুত হচ্ছে',
                              shipped: '🚚 কুরিয়ারে পাঠানো হয়েছে',
                              delivered: '🎉 ডেলিভারি সম্পন্ন',
                              cancelled: '❌ বাতিল',
                            };

                            return filteredOrds.map((ord: any) => (
                              <tr key={ord.id} className="hover:bg-slate-50/70">
                                <td className="p-3 whitespace-nowrap">
                                  <span className="font-mono font-bold text-teal-950 block">#{ord.orderNumber}</span>
                                  {ord.createdAt && (
                                    <span className="text-[10px] text-slate-400 block">
                                      {new Date(ord.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                  {selectedVendorForDetail.isAllCentralMall && ord.vendorShopName && (
                                    <span className="text-[10px] font-bold text-teal-700 block mt-0.5">
                                      🏪 {ord.vendorShopName}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3">
                                  <div className="font-black text-slate-900">{ord.customerName || 'গ্রাহক'}</div>
                                  <div className="text-[10px] text-slate-600 font-mono font-bold">📞 {ord.customerPhone}</div>
                                  {ord.customerAddress && (
                                    <div className="text-[10px] text-slate-500 max-w-[200px] truncate mt-0.5" title={ord.customerAddress}>
                                      📍 {ord.customerAddress}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3">
                                  {Array.isArray(ord.items) && ord.items.length > 0 ? (
                                    <div className="space-y-1.5 min-w-[240px]">
                                      {ord.items.map((it: any, iIdx: number) => {
                                        const qty = Number(it.quantity) || 1;
                                        const unit = it.unit || 'পিস';
                                        const price = Number(it.unitPrice || it.price || (it.subtotal ? it.subtotal / qty : 0));
                                        const sub = Number(it.subtotal || price * qty);

                                        return (
                                          <div
                                            key={iIdx}
                                            className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              {it.imageUrl ? (
                                                <img src={it.imageUrl} alt={it.name} className="w-6 h-6 rounded object-cover shrink-0" />
                                              ) : (
                                                <span className="text-xs">📦</span>
                                              )}
                                              <span className="font-bold text-slate-800 truncate text-xs">
                                                {it.name} {qty} {unit}
                                              </span>
                                            </div>
                                            <span className="font-mono font-black text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs shrink-0">
                                              {price} × {qty} = ৳{sub.toLocaleString('en-US')}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {Number(ord.deliveryCharge) > 0 && (
                                        <div className="text-[10px] text-slate-500 pl-1 flex items-center justify-between">
                                          <span>+ ডেলিভারি চার্জ:</span>
                                          <span className="font-bold font-mono">৳{Number(ord.deliveryCharge).toLocaleString('en-US')}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500">{ord.itemsCount || 1} টি প্রোডাক্ট</span>
                                  )}
                                </td>

                                <td className="p-3 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                                      ord.orderStatus === 'delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : ord.orderStatus === 'shipped'
                                        ? 'bg-purple-100 text-purple-800'
                                        : ord.orderStatus === 'cancelled'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {statusLabelMap[ord.orderStatus] || ord.orderStatus}
                                  </span>
                                </td>

                                <td className="p-3 text-right whitespace-nowrap">
                                  <div className="text-sm font-black text-slate-900">
                                    ৳{Number(ord.totalAmount).toLocaleString('en-US')}
                                  </div>
                                  <div className="text-[10px] mt-0.5">
                                    {ord.vendorPayoutStatus === 'settled' ? (
                                      <span className="text-emerald-700 font-bold block">
                                        ✅ ইতিমধ্যে পরিশোধিত
                                      </span>
                                    ) : ord.orderStatus === 'delivered' ? (
                                      <span className="text-amber-800 font-bold block">
                                        ⏳ সুপার এডমিনের কাছে পাবে
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 block">
                                        ⏳ ডেলিভারি শেষে প্রাপ্য
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedVendorForDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INVOICE PRINT ================= */}
      {printingInvoiceOrder && (
        <MarketplaceOrderInvoiceModal
          order={printingInvoiceOrder}
          subOrders={data.subOrders.filter(
            (s) => s.masterOrderId === printingInvoiceOrder.id || s.masterOrderId === printingInvoiceOrder.orderNumber
          )}
          onClose={() => setPrintingInvoiceOrder(null)}
          storeName="সেন্ট্রাল মার্কেটপ্লেস"
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* ================= MODAL: COURIER MANAGEMENT ================= */}
      {courierManagingOrder && (
        <MarketplaceCourierModal
          order={courierManagingOrder}
          onClose={() => setCourierManagingOrder(null)}
          onSaveCourier={handleSaveCourierForOrder}
        />
      )}

      {/* ================= MODAL: RETURN & REFUND ================= */}
      {returnRefundingOrder && (
        <MarketplaceReturnRefundModal
          order={returnRefundingOrder}
          onClose={() => setReturnRefundingOrder(null)}
          onProcessRefund={handleProcessRefundForOrder}
        />
      )}

      {/* ================= MODAL: SMS & WHATSAPP ================= */}
      {smsNotifyingOrder && (
        <MarketplaceSmsModal
          order={smsNotifyingOrder}
          subOrders={data.subOrders.filter(
            (s) => s.masterOrderId === smsNotifyingOrder.id || s.masterOrderId === smsNotifyingOrder.orderNumber
          )}
          onClose={() => setSmsNotifyingOrder(null)}
          storeName="সেন্ট্রাল মার্কেটপ্লেস"
        />
      )}
    </div>
  );
};
