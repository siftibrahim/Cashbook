import React from 'react';

export interface ProductStudioModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  product?: any;
}

export const ProductStudioModal: React.FC<ProductStudioModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;
  return null;
};

export default ProductStudioModal;
