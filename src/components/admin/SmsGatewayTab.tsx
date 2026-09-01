import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Copy,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { adminApi } from '../../services/apiService';

interface SmsGatewayTabProps {
  onShowToast: (msg: string) => void;
}

export const SmsGatewayTab: React.FC<SmsGatewayTabProps> = ({ onShowToast }) => {
  const [provider, setProvider] = useState<'greenweb' | 'bulksmsbd' | 'alphasms' | 'mimsms' | 'custom'>('bulksmsbd');
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [username, setUsername] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [serverIp, setServerIp] = useState('');

  // OTP Template Message
  const [otpTemplate, setOtpTemplate] = useState('আপনার টুইং খাতা পাসওয়ার্ড রিসেট ওটিপি হলো {OTP}। মেয়াদ ১৫ মিনিট।');

  // Testing State
  const [testPhone, setTestPhone] = useState('01619665875');
  const [testMessage, setTestMessage] = useState('টুইং খাতা: টেস্ট এসএমএস সফল হয়েছে!');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Loading & Saving State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const cfg = await adminApi.getSmsConfig();
      if (cfg) {
        setProvider(cfg.provider || 'bulksmsbd');
        setSenderId(cfg.senderId || '');
        setUsername(cfg.username || '');
        setCustomUrl(cfg.customUrl || '');
        setIsEnabled(cfg.isEnabled !== undefined ? cfg.isEnabled : true);
        setHasApiKey(cfg.hasApiKey || false);
        setMaskedApiKey(cfg.maskedApiKey || '');
        if (cfg.serverIp) setServerIp(cfg.serverIp);
      }
    } catch (err: any) {
      console.warn('Failed to fetch SMS config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: any = {
        provider,
        senderId: senderId.trim(),
        username: username.trim(),
        customUrl: customUrl.trim(),
        isEnabled,
      };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await adminApi.saveSmsConfig(payload);
      if (res?.serverIp) setServerIp(res.serverIp);
      onShowToast('✅ SMS ও ওটিপি গেটওয়ে সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
      await loadConfig();
      setApiKey(''); // clear plain input after save
    } catch (err: any) {
      onShowToast(`❌ সেভ ব্যর্থ হয়েছে: ${err.message || 'ত্রুটি'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyIp = () => {
    if (!serverIp) return;
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    onShowToast('📋 সার্ভার আইপি কপি করা হয়েছে!');
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      onShowToast('অনুগ্রহ করে টেস্ট ফোন নম্বর প্রদান করুন');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await adminApi.testSms(testPhone.trim(), testMessage.trim());
      setTestResult(res);
      if (res?.serverIp) setServerIp(res.serverIp);
      if (res.success) {
        onShowToast('✅ টেস্ট এসএমএস সফলভাবে পাঠানো হয়েছে!');
      } else {
        onShowToast(`⚠️ এসএমএস রেসপন্স: ${res.message || 'Error'}`);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      onShowToast(`❌ টেস্ট এসএমএস পাঠাতে ব্যর্থ: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
        <span>এসএমএস গেটওয়ে সেটিংস লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#141C33] to-[#0F172A] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-teal-500 p-0.5 shadow-lg flex items-center justify-center text-white shrink-0">
            <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>এসএমএস ও ফরগেট পাসওয়ার্ড ওটিপি গেটওয়ে</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30">
                SMS API Control
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              BulkSMSBD, GreenWeb, AlphaSMS বা যেকোনো গেটওয়ে যুক্ত করে সরাসরি গ্রাহকের মোবাইলে এসএমএস ও ওটিপি পাঠান
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700 cursor-pointer">
            <span className="text-xs font-bold text-slate-300">
              {isEnabled ? 'গেটওয়ে সক্রিয়' : 'নিষ্ক্রিয়'}
            </span>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Server IP Whitelist Callout Banner */}
      {serverIp && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900/60 to-indigo-950/50 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">
                আপনার বর্তমান সার্ভার পাবলিক আইপি (Server Public IP)
              </div>
              <div className="text-[11px] text-slate-400">
                BulkSMSBD ব্যবহার করলে এই আইপিটি ড্যাশবোর্ডে Whitelist করুন অথবা IP Security অফ করুন
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <code className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-teal-300 font-mono text-xs font-bold select-all flex-1 sm:flex-initial text-center">
              {serverIp}
            </code>
            <button
              type="button"
              onClick={handleCopyIp}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            >
              {copiedIp ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIp ? 'কপি হয়েছে' : 'কপি'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Provider & Credentials Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveConfig} className="p-5 sm:p-6 rounded-3xl bg-[#0D1424] border border-slate-800 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>এসএমএস প্রোভাইডার কনফিগারেশন</span>
            </h3>

            {/* Provider Selector Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                এসএমএস প্রোভাইডার নির্বাচন করুন
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'bulksmsbd', name: 'BulkSMSBD', desc: 'bulksmsbd.net (ডিফল্ট)' },
                  { id: 'greenweb', name: 'GreenWeb SMS', desc: 'api.greenweb.com.bd' },
                  { id: 'alphasms', name: 'Alpha SMS', desc: 'sms.net.bd' },
                  { id: 'mimsms', name: 'MimSMS', desc: 'mimsms.com' },
                  { id: 'custom', name: 'Custom Webhook', desc: 'অন্যান্য এপিআই' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id as any)}
                    className={`p-3 rounded-2xl text-left border transition cursor-pointer ${
                      provider === p.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white leading-tight">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key / Token */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  API Key / Token *
                </label>
                {hasApiKey && (
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>সংরক্ষিত: {maskedApiKey}</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? 'নতুন API Key দিয়ে পরিবর্তন করতে এখানে লিখুন' : 'যেমন: NOhILJCtx0DZJWCRBODB...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                BulkSMSBD বা AlphaSMS হলে API Key দিন, GreenWeb হলে একাউন্টের Token দিন।
              </p>
            </div>

            {/* Sender ID (Masking / Non-Masking) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Sender ID / প্রেরক আইডি (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                placeholder="যেমন: 8809648910696 অথবা আপনার অনুমোদিত প্রেরক আইডি"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">
                নন-মাস্কিং হলে খালি রাখুন অথবা বিটিআরসি অনুমোদিত প্রেরক আইডি দিন।
              </p>
            </div>

            {/* Custom URL (Only when provider === 'custom') */}
            {provider === 'custom' && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30">
                <label className="text-xs font-bold text-indigo-300 block">
                  কাস্টম গেটওয়ে রিকোয়েস্ট URL
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://mysms.com/api?to={phone}&msg={message}&key={apiKey}"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[10px] text-indigo-300/80">
                  প্লেসহোল্ডার: <code className="text-white font-mono">{'{phone}'}</code>, <code className="text-white font-mono">{'{message}'}</code>, <code className="text-white font-mono">{'{apiKey}'}</code>
                </p>
              </div>
            )}

            {/* OTP Message Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                পাসওয়ার্ড রিসেট ওটিপি মেসেজ টেমপ্লেট
              </label>
              <textarea
                value={otpTemplate}
                onChange={(e) => setOtpTemplate(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">
                মেসেজে <code className="text-indigo-400 font-mono">{'{OTP}'}</code> ট্যাগ দিন। এটি ইউজারের ওটিপি দিয়ে প্রতিস্থাপিত হবে।
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SMS সেটিংস সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Live Test SMS Tool & Provider Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live SMS Tester */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1424] border border-teal-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">লাইভ টেস্ট এসএমএস পাঠান</h3>
                <p className="text-[11px] text-slate-400">গেটওয়ে সক্রিয় কিনা সরাসরি মোবাইলে মেসেজ পাঠিয়ে পরীক্ষা করুন</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  প্রাপকের মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="01619665875"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  টেস্ট মেসেজ টেক্সট
                </label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="টুইং খাতা: টেস্ট এসএমএস সফল হয়েছে!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={isSendingTest}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>টেস্ট এসএমএস পাঠান</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message || (testResult.success ? 'সফল হয়েছে' : 'ব্যর্থ')}</span>
                </div>
                {testResult.gatewayResponse && (
                  <pre className="text-[10px] bg-slate-950/80 p-2 rounded-xl text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
                    {typeof testResult.gatewayResponse === 'object'
                      ? JSON.stringify(testResult.gatewayResponse, null, 2)
                      : String(testResult.gatewayResponse)}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Emergency & Universal OTP Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>ইমারজেন্সি / টেস্ট ওটিপি কোডসমূহ</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              যেকোনো কারণে এসএমএস গেটওয়ে ডাউন থাকলে বা টেস্ট করার জন্য যেকোনো অ্যাকাউন্টে নিচের ওটিপি কোডগুলো সর্বদা কার্যকর থাকবে:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['123456', '786000', '7860', '654321'].map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500/40 text-teal-300 font-mono text-[11px] font-bold"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-xs space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>এসএমএস এপিআই ও IP Whitelist গাইড</span>
            </h4>
            
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
              <strong>⚠️ BulkSMSBD ব্যবহারকারীদের জন্য জরুরি:</strong> BulkSMSBD ড্যাশবোর্ডে API ব্যবহারের জন্য আপনার সার্ভার আইপি হোয়াইটলিস্ট (IP Whitelist) করতে হয় অথবা IP Security অফ রাখতে হয়।
            </div>

            <ul className="text-slate-400 space-y-2 text-[11px] list-disc list-inside">
              <li>
                <strong className="text-slate-200">BulkSMSBD:</strong>{' '}
                <a
                  href="https://bulksmsbd.net/developer"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  bulksmsbd.net/developer
                </a>{' '}
                থেকে API Key সংগ্রহ করুন এবং IP Whitelist অপশনে আপনার সার্ভার আইপি দিন অথবা আইপি সিকিউরিটি নিষ্ক্রিয় করুন।
              </li>
              <li>
                <strong className="text-slate-200">GreenWeb:</strong>{' '}
                <a
                  href="https://greenweb.com.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  greenweb.com.bd
                </a>{' '}
                এ একাউন্ট খুলে টোকেন কপি করুন।
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
