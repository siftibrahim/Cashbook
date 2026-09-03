import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../../types';
import { formatMoney } from '../../utils/storage';
import {
  Camera,
  ScanLine,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Package,
  Search,
  Zap,
  Volume2,
  VolumeX,
  RotateCw,
  ShoppingCart,
  Layers,
} from 'lucide-react';

interface ProductScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  mode?: 'pos' | 'inventory' | 'lookup';
  onProductScanned?: (product: Product) => void;
  onAddNewProductWithSku?: (sku: string) => void;
  onShowToast: (msg: string) => void;
}

export const ProductScannerModal: React.FC<ProductScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  mode = 'pos',
  onProductScanned,
  onAddNewProductWithSku,
  onShowToast,
}) => {
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-scanner-viewport';

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Find product by barcode, SKU, ID, or JSON payload
  const resolveProductFromCode = (rawCode: string): { product: Product | null; cleanCode: string } => {
    const trimmed = rawCode.trim();
    let searchCode = trimmed;

    // Check if JSON payload from our QrGeneratorModal
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.sku) searchCode = parsed.sku;
        else if (parsed.id) searchCode = parsed.id;
      } catch (e) {
        // ignore JSON parse error
      }
    }

    const matched = products.find((p) => {
      const pSku = (p.sku || '').trim().toLowerCase();
      const pId = (p.id || '').trim().toLowerCase();
      const pName = (p.name || '').trim().toLowerCase();
      const target = searchCode.toLowerCase();

      return pSku === target || pId === target || pName === target;
    });

    return { product: matched || null, cleanCode: searchCode };
  };

  const handleDetectedCode = (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    playBeep();

    setLastScannedCode(decodedText);
    const { product, cleanCode } = resolveProductFromCode(decodedText);

    if (product) {
      setScannedProduct(product);
      setNotFoundCode(null);
      if (onProductScanned) {
        onProductScanned(product);
      }
      onShowToast(`✅ পণ্য স্ক্যান হয়েছে: ${product.name} (৳${product.salePrice})`);
    } else {
      setScannedProduct(null);
      setNotFoundCode(cleanCode);
      onShowToast(`⚠️ কোড '${cleanCode}' ইনভেন্টরিতে পাওয়া যায়নি!`);
    }

    // Debounce next scan
    setTimeout(() => {
      setIsProcessing(false);
    }, 1200);
  };

  // Start Camera
  const startScanner = async () => {
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: cameraFacing },
        {
          fps: 12,
          qrbox: { width: 260, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Scanning frames
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      console.warn('Camera scanner start error:', err);
      setScannerActive(false);
      onShowToast('ক্যামেরা চালু করা যায়নি। অনুগ্রহ করে ব্রাউজার ক্যামেরা পারমিশন চেক করুন।');
    }
  };

  // Stop Camera
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // ignore stop error
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setLastScannedCode('');
      setScannedProduct(null);
      setNotFoundCode(null);
      setManualCode('');

      // Delay briefly to allow DOM element to render
      const timer = setTimeout(() => {
        startScanner();
      }, 250);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, cameraFacing]);

  const handleSwitchCamera = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedCode(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div
      id="product-scanner-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={() => {
        stopScanner();
        onClose();
      }}
    >
      <div
        id="product-scanner-modal"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  পণ্য বারকোড ও কিউআর স্ক্যানার
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black border border-teal-500/30 uppercase">
                  {mode === 'pos' ? 'বিক্রয় মোড' : mode === 'inventory' ? 'ইনভেন্টরি' : 'লুকআপ'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ক্যামেরা দিয়ে পণ্যের গায়ে থাকা বারকোড বা কিউআর কোড স্ক্যান করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'সাউন্ড বন্ধ করুন' : 'সাউন্ড চালু করুন'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSwitchCamera}
              title="ক্যামেরা পরিবর্তন করুন"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scanner Viewport Section */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] overflow-hidden">
          {/* HTML5 QR Code Scanner Target Container */}
          <div
            id={containerId}
            className="w-full max-w-sm h-full flex items-center justify-center overflow-hidden"
          />

          {/* Glowing Animated Red Laser Target Frame */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-64 h-56 rounded-2xl border-2 border-teal-500/80 shadow-[0_0_20px_rgba(20,184,166,0.3)] flex flex-col justify-between p-2">
              {/* Corner accent decorations */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-teal-400 rounded-tl-md" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-teal-400 rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-teal-400 rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-teal-400 rounded-br-md" />

              {/* Laser animation bar */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse" />

              <div className="text-center text-[11px] font-bold text-teal-300 bg-slate-950/70 px-2.5 py-1 rounded-full mx-auto backdrop-blur-xs">
                বারকোড বা কিউআর কোড এই বাক্সে রাখুন
              </div>
            </div>
          </div>
        </div>

        {/* Results & Action Drawer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {/* Case 1: Product Found! */}
          {scannedProduct && (
            <div className="p-3.5 rounded-2xl bg-teal-950/70 border border-teal-500/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                    {scannedProduct.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold text-teal-300">
                    <span>মূল্য: ৳{formatMoney(scannedProduct.salePrice)}</span>
                    <span>•</span>
                    <span>স্টক: {scannedProduct.stock} {scannedProduct.unit || 'টি'}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      SKU: {scannedProduct.sku || scannedProduct.id}
                    </span>
                  </div>
                </div>
              </div>

              {mode === 'pos' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onProductScanned) onProductScanned(scannedProduct);
                    onShowToast(`+১ টি '${scannedProduct.name}' যোগ হয়েছে`);
                  }}
                  className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>আরও যোগ</span>
                </button>
              )}
            </div>
          )}

          {/* Case 2: Code Scanned but NOT Found */}
          {notFoundCode && (
            <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    কোড: <span className="font-mono font-black text-white">{notFoundCode}</span>
                  </h4>
                  <p className="text-[11px] text-amber-300/80">
                    এই বারকোডটি ইনভেন্টরিতে পাওয়া যায়নি।
                  </p>
                </div>
              </div>

              {onAddNewProductWithSku && (
                <button
                  type="button"
                  onClick={() => {
                    stopScanner();
                    onClose();
                    onAddNewProductWithSku(notFoundCode);
                  }}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>এই কোডে নতুন পণ্য যোগ করুন</span>
                </button>
              )}
            </div>
          )}

          {/* Fallback / Manual Barcode Input & USB Scanner Support */}
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="বারকোড গান দিয়ে স্ক্যান করুন বা SKU কোড লিখুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-white text-xs font-mono font-bold focus:border-teal-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
            >
              খুঁজুন
            </button>
          </form>

          {/* Mode Footer Button */}
          {mode === 'pos' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">
                মোট ইনভেন্টরি পণ্য: <strong className="text-white">{products.length} টি</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>বিক্রয় তালিকায় ফিরুন</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
