import React from 'react';

export const YOUTH_UNION_LOGO_SRC = '/assets/aistudio/Logo-Doan-Thanh-NIen-Cong-San-Ho-Chi-Minh-1_5ec938fa.webp';

interface YouthUnionBadgeProps {
  className?: string;
  size?: number;
}

export const YouthUnionBadge: React.FC<YouthUnionBadgeProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <img
      src={YOUTH_UNION_LOGO_SRC}
      alt="Huy hiệu Đoàn Thanh niên Cộng sản Hồ Chí Minh"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block select-none object-contain shrink-0 drop-shadow-md ${className}`}
      loading="eager"
    />
  );
};
