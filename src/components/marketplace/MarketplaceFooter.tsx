import React from 'react';

export interface MarketplaceFooterProps {
  onNavigateHome?: () => void;
  onNavigateVendors?: () => void;
  onNavigateOrders?: () => void;
  onOpenSupport?: () => void;
  onMerchantLogin?: () => void;
  showToast?: (msg: string) => void;
  onScrollToSection?: (id: string) => void;
}

export const MarketplaceFooter: React.FC<MarketplaceFooterProps> = () => {
  return null;
};

export default MarketplaceFooter;
