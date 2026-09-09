import React, { useState } from 'react';
import { Gift, Copy, Check, Users } from 'lucide-react';

export const InvitesView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const inviteCode = 'TRAVIS-TILTFILTER-DISCIPLINE';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-400" />
          <span>Community Invites & Referral</span>
        </h1>
        <p className="text-xs text-slate-400">
          Invite fellow traders to hold each other accountable and eliminate tilt.
        </p>
      </div>

      <div className="p-6 bg-[#0b161b] border border-[#162b34] rounded-2xl space-y-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#10242e] border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Users className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-black text-white">Share Tilt Filter with Your Desk</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Give your trading partners access to the pre-trade flight check, drawdown floor locks, and emotional tracker.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="px-4 py-2.5 bg-[#081216] border border-[#17303d] rounded-xl text-xs font-mono font-bold text-emerald-400 select-all">
            {inviteCode}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
