"use client";

import React from 'react';
import type { ViewState } from '../../types/index';
import { useIsNarrowViewport } from '../../features/myzone-mobile/hooks/useIsNarrowViewport';
import MyZoneMobileHome from '../../features/myzone-mobile/ui/MyZoneMobileHome';
import MemberDashboard from '../MemberDashboard';

interface MemberZoneHomeProps {
  onNavigate: (view: ViewState) => void;
}

/** Phone-sized My Zone gets the mobile home; tablet-landscape and desktop keep the classic dashboard. */
const MemberZoneHome: React.FC<MemberZoneHomeProps> = ({ onNavigate }) => {
  const isNarrow = useIsNarrowViewport();

  return isNarrow ? (
    <MyZoneMobileHome onNavigate={onNavigate} />
  ) : (
    <MemberDashboard onNavigate={onNavigate} />
  );
};

export default MemberZoneHome;
