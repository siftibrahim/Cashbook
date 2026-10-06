import React from 'react';

export interface ProductStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess?: (enhancedImageUrl: string) => void;
  onShowToast?: (msg: string) => void;
}

export const ProductStudioModal: React.FC<ProductStudioModalProps> = () => {
  return null;
};

export default ProductStudioModal;
