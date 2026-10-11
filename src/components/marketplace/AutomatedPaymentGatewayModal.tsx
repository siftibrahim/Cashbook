import React from 'react';

export interface AutomatedPaymentGatewayModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AutomatedPaymentGatewayModal: React.FC<AutomatedPaymentGatewayModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;
  return null;
};

export default AutomatedPaymentGatewayModal;
