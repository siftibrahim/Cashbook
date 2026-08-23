import { Customer, Transaction, StoreProfile } from '../types';
import { formatMoney, formatBanglaDate, getPaymentMethodLabel } from './storage';
import { toPng, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface InvoicePrintData {
  customer: Customer;
  transaction: Transaction;
  store: StoreProfile;
  format: 'thermal' | 'a4';
  paperWidth?: '58mm' | '80mm' | 'a4';
}

export function generateInvoiceHTML(data: InvoicePrintData): string {
  const { customer, transaction, store, format } = data;
  const currency = store.currencySymbol || '৳';
  const voucherNo = transaction.receiptNo || `REC-${transaction.createdAt.toString().slice(-6)}`;
  const isSale = transaction.type === 'sale';
  const isPayment = transaction.type === 'payment';

  const subtotal = transaction.subtotal !== undefined ? transaction.subtotal : transaction.amount;
  const discount = transaction.discount || 0;
  const netBill = transaction.netAmount !== undefined ? transaction.netAmount : subtotal - discount;
  const paidAmount = transaction.paidAmount !== undefined ? transaction.paidAmount : (isPayment ? transaction.amount : 0);
  const dueAmount = transaction.dueAmount !== undefined ? transaction.dueAmount : (isSale ? netBill - paidAmount : 0);
  const isFullyPaid = isPayment || (isSale && dueAmount <= 0 && paidAmount >= netBill) || (isSale && customer.balance <= 0 && dueAmount <= 0);

  const qrTarget = store.bkashNumber || store.phone || '01306908115';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
    `Payment to ${store.name}, Mobile: ${qrTarget}, Voucher: ${voucherNo}, Amount: ${customer.balance > 0 ? customer.balance : dueAmount}`
  )}`;

  const isThermal = format === 'thermal';
  const maxWidth = isThermal ? '320px' : '520px';

  let itemsHtml = '';
  if (transaction.items && transaction.items.length > 0) {
    itemsHtml = `
      <div style="margin: 8px 0; border-top: 1px dashed #475569; border-bottom: 1px dashed #475569; padding: 6px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: ${isThermal ? '12px' : '13px'};">
          <thead>
            <tr style="border-bottom: 1px dashed #94a3b8; font-weight: bold;">
              <th style="text-align: left; padding: 3px 0;">পণ্য বিবরণী</th>
              <th style="text-align: right; padding: 3px 0;">মোট</th>
            </tr>
          </thead>
          <tbody>
            ${transaction.items
              .map(
                (item) => `
              <tr>
                <td style="padding: 4px 0;">
                  <div style="font-weight: bold;">${item.name}</div>
                  <div style="font-size: 10px; color: #475569;">${item.quantity} ${item.unit || ''} × ${currency}${formatMoney(item.price)}</div>
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 0; font-weight: bold;">
                  ${currency}${formatMoney(item.total)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${store.name} - রসিদ ${voucherNo}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hind Siliguri", Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      line-height: 1.35;
      padding: 10px;
      display: flex;
      justify-content: center;
    }
    .receipt-container {
      width: 100%;
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: ${isThermal ? '8px' : '20px'};
      border: ${isThermal ? 'none' : '1px solid #cbd5e1'};
      border-radius: ${isThermal ? '0' : '8px'};
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .store-name {
      font-size: ${isThermal ? '17px' : '20px'};
      font-weight: 900;
      margin-bottom: 2px;
    }
    .store-sub {
      font-size: 11px;
      color: #334155;
    }
    .badge {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 10px;
      border: 1px solid #000;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .info-grid {
      margin: 8px 0;
      font-size: ${isThermal ? '11px' : '12px'};
      border-bottom: 1px dashed #475569;
      padding-bottom: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .calc-box {
      margin: 8px 0;
      font-size: ${isThermal ? '12px' : '13px'};
    }
    .calc-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .calc-total {
      border-top: 1px dashed #000;
      padding-top: 5px;
      margin-top: 5px;
      font-weight: 900;
      font-size: ${isThermal ? '13px' : '15px'};
    }
    .qr-section {
      margin-top: 10px;
      border-top: 1px dashed #475569;
      padding-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .qr-text {
      font-size: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 12px;
      font-size: 11px;
      color: #334155;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .receipt-container {
        border: none;
        padding: 4px;
        width: 100% !important;
        max-width: 100% !important;
      }
      @page {
        size: ${isThermal ? '80mm auto' : 'auto'};
        margin: 2mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="store-name">${store.name}</div>
      <div class="store-sub">${store.address}</div>
      <div class="store-sub">📞 ${store.phone}</div>
      <div class="badge">
        ${
          isFullyPaid
            ? 'পরিশোধিত রসিদ (PAID SLIP)'
            : isPayment
            ? 'টাকা জমা রসিদ (MONEY RECEIPT)'
            : 'বিক্রয় রসিদ (DEBIT SLIP)'
        }
      </div>
    </div>

    <div class="info-grid">
      <div class="info-row">
        <span><strong>রসিদ নং:</strong> ${voucherNo}</span>
        <span><strong>তারিখ:</strong> ${formatBanglaDate(transaction.date)}</span>
      </div>
      <div class="info-row">
        <span><strong>সময়:</strong> ${transaction.time || ''}</span>
      </div>
      <div class="info-row" style="margin-top: 4px;">
        <span><strong>খরিদ্দার:</strong> <strong>${customer.name}</strong></span>
        <span>${customer.phone || ''}</span>
      </div>
      ${customer.address ? `<div class="info-row"><span><strong>ঠিকানা:</strong> ${customer.address}</span></div>` : ''}
    </div>

    ${itemsHtml}

    <div class="calc-box">
      ${
        transaction.items && transaction.items.length > 0
          ? `
        <div class="calc-row">
          <span>মোট বিল (Subtotal):</span>
          <span>${currency}${formatMoney(subtotal)}</span>
        </div>
        ${
          discount > 0
            ? `
          <div class="calc-row">
            <span>ছাড় / ডিসকাউন্ট:</span>
            <span>- ${currency}${formatMoney(discount)}</span>
          </div>
        `
            : ''
        }
        ${
          paidAmount > 0
            ? `
          <div class="calc-row" style="font-weight: bold;">
            <span>নগদ পরিশোধ (Paid):</span>
            <span>${currency}${formatMoney(paidAmount)}</span>
          </div>
        `
            : ''
        }
        <div class="calc-row">
          <span>বর্তমান মেমোর বাকি:</span>
          <span style="font-weight: bold;">${dueAmount > 0 ? `+ ${currency}${formatMoney(dueAmount)}` : `${currency}0`}</span>
        </div>
      `
          : `
        <div class="calc-row">
          <span>${isSale ? 'বর্তমান বিক্রয় বিল:' : 'টাকা পরিশোধের পরিমাণ:'}</span>
          <span style="font-weight: bold;">${currency}${formatMoney(transaction.amount)}</span>
        </div>
      `
      }

      ${
        transaction.paymentMethod
          ? `
        <div class="calc-row" style="font-size: 11px; color: #475569;">
          <span>পেমেন্ট মাধ্যম:</span>
          <span>${getPaymentMethodLabel(transaction.paymentMethod)}</span>
        </div>
      `
          : ''
      }

      <div class="calc-row calc-total">
        <span>সর্বমোট অবশিষ্ট বাকি:</span>
        <span>${customer.balance > 0 ? `${currency}${formatMoney(customer.balance)}` : `${currency}0`}</span>
      </div>
    </div>

    ${
      customer.balance > 0 && store.showQrOnInvoice !== false && (store.bkashNumber || store.nagadNumber)
        ? `
      <div class="qr-section">
        <div class="qr-text">
          <div style="font-weight: bold;">অনলাইনে বাকি পরিশোধ করুন:</div>
          ${store.bkashNumber ? `<div>বিকাশ: <strong>${store.bkashNumber}</strong></div>` : ''}
          ${store.nagadNumber ? `<div>নগদ: <strong>${store.nagadNumber}</strong></div>` : ''}
          <div style="font-size: 9px; color: #64748b;">কিউআর স্ক্যান করে পে করুন</div>
        </div>
        <img src="${qrUrl}" alt="QR" style="width: 54px; height: 54px; border: 1px solid #ccc; padding: 2px;" />
      </div>
    `
        : `
      <div style="margin-top: 8px; text-align: center; font-size: 11px; font-weight: bold;">
        ${isFullyPaid ? '✓ সম্পূর্ণ পরিশোধিত। ধন্যবাদ!' : ''}
      </div>
    `
    }

    <div class="footer">
      <div>${store.footerNote || 'আপনার কেনাকাটার জন্য আন্তরিক ধন্যবাদ!'}</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">স্মার্ট খাতা ও পিওএস প্রিন্ট সিস্টেম</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Crash-Proof Native Window Print Helper
 * Avoids any hidden iframe crashes in Android WebView / AppMint / Mobile Apps
 */
export function executeSafePrint(onComplete?: () => void) {
  try {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  } catch (err) {
    console.warn('Native window.print error caught safely:', err);
  } finally {
    if (onComplete) {
      setTimeout(onComplete, 400);
    }
  }
}

/**
 * Legacy wrapper forwarding to executeSafePrint
 */
export function executePosPrint(_data?: InvoicePrintData, onComplete?: () => void) {
  executeSafePrint(onComplete);
}

/**
 * Safe High-Resolution PDF Exporter
 * Generates an actual crisp PDF file with Bengali typography and high contrast dark ink
 */
export async function downloadReceiptPDF(
  elementId: string,
  filename: string,
  onToast?: (msg: string) => void
): Promise<boolean> {
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      if (onToast) onToast('রসিদ খুঁজে পাওয়া যায়নি।');
      return false;
    }

    if (onToast) onToast('📄 পিডিএফ তৈরি হচ্ছে, এক মুহূর্ত অপেক্ষা করুন...');

    // Save previous styles
    const originalMaxHeight = el.style.maxHeight;
    const originalOverflow = el.style.overflow;
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';

    // Generate high-res image using html-to-image (supports OKLCH and CSS4 modern colors, with skipFonts to avoid cross-origin cssRules errors)
    const imgData = await toPng(el, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });

    // Restore element style
    el.style.maxHeight = originalMaxHeight;
    el.style.overflow = originalOverflow;

    // Create an image element to get exact pixel dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = imgData;
    });

    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // Determine PDF size (mm) based on image pixel dimensions (dividing by pixelRatio 3)
    const pdfWidth = (imgWidth / 3) * 0.264583;
    const pdfHeight = (imgHeight / 3) * 0.264583;

    // Use custom page dimensions that match the receipt perfectly
    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? 'portrait' : 'portrait',
      unit: 'mm',
      format: [pdfWidth + 6, pdfHeight + 6],
    });

    pdf.addImage(imgData, 'PNG', 3, 3, pdfWidth, pdfHeight, undefined, 'FAST');
    pdf.save(`${filename}.pdf`);

    if (onToast) onToast('✅ পিডিএফ মেমো সফলভাবে ডাউনলোড হয়েছে!');
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (onToast) onToast('পিডিএফ তৈরিতে সমস্যা হয়েছে। ইমেজ ডাউনলোড বা প্রিন্ট অপশন ব্যবহার করুন।');
    return false;
  }
}

/**
 * Safe High-Resolution Image/PNG Exporter
 * Generates and downloads a clean PNG receipt directly to phone/desktop storage
 * 100% reliable across Android WebViews, APKs, and desktop browsers without crashing
 */
export async function downloadReceiptImage(
  elementId: string,
  filename: string,
  onToast?: (msg: string) => void
): Promise<boolean> {
  try {
    const el = document.getElementById(elementId);
    if (!el) {
      if (onToast) onToast('রসিদ খুঁজে পাওয়া যায়নি।');
      return false;
    }

    if (onToast) onToast('মেমো ছবি প্রস্তুত হচ্ছে, এক মুহূর্ত অপেক্ষা করুন...');

    // Save previous scroll or overflow if any
    const originalMaxHeight = el.style.maxHeight;
    const originalOverflow = el.style.overflow;
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';

    const blob = await toBlob(el, {
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
    });

    // Restore element style
    el.style.maxHeight = originalMaxHeight;
    el.style.overflow = originalOverflow;

    if (!blob) {
      if (onToast) onToast('রসিদ সংরক্ষণ করতে সমস্যা হয়েছে।');
      return false;
    }

    // Check if Web Share API with file sharing is supported on Android device
    const file = new File([blob], `${filename}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: filename,
        text: `${filename} মেমো রসিদ`,
      }).catch(() => {
        // Fallback to normal download if user cancelled share sheet
        triggerBlobDownload(blob, `${filename}.png`);
      });
    } else {
      triggerBlobDownload(blob, `${filename}.png`);
    }

    if (onToast) onToast('✅ মেমো ছবি সফলভাবে ডাউনলোড হয়েছে!');
    return true;
  } catch (err) {
    console.error('Error downloading receipt image:', err);
    if (onToast) onToast('রসিদ ডাউনলোড ব্যর্থ হয়েছে। বিকল্প হিসেবে টেক্সট কপি বা WhatsApp বাটন ব্যবহার করুন।');
    return false;
  }
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}
