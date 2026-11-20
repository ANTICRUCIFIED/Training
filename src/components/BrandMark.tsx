import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export const RAC_FORGE_LOGO_PATH =
  '/assets/aistudio/WhatsApp_Image_2025-08-31_at_21.09.34_e5c377f5_8bf07ac9.jpg';

interface BrandMarkProps {
  size?: 'sm' | 'md';
  showWordmark?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  showWordmark = true,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const imgClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      {imgFailed ? (
        <span
          className={`${imgClass} rounded-md bg-[#0D2C45] text-white inline-flex items-center justify-center shrink-0`}
        >
          <ShieldCheck className="w-5 h-5" />
        </span>
      ) : (
        <img
          src={RAC_FORGE_LOGO_PATH}
          alt="RAC Forge Pvt. Ltd. logo"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${imgClass} rounded-md object-contain bg-white border border-slate-200/80 shrink-0`}
        />
      )}
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-[#0D2C45]">
          RAC Forge
        </span>
      )}
    </span>
  );
};
