'use client';

import { TimelineType } from '../../types';

interface TimelineTabsProps {
  active: TimelineType;
  isLoggedIn: boolean;
  onChange: (type: TimelineType) => void;
  onRequireLogin: () => void;
}

const TABS: { type: TimelineType; label: string }[] = [
  { type: 'recommended', label: 'おすすめ' },
  { type: 'following', label: 'フォロー中' },
  { type: 'latest', label: '最新' },
];

export default function TimelineTabs({ active, isLoggedIn, onChange, onRequireLogin }: TimelineTabsProps) {
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <button
          key={tab.type}
          className={`tab${active === tab.type ? ' active' : ''}`}
          onClick={() => {
            if (tab.type === 'following' && !isLoggedIn) {
              onRequireLogin();
              return;
            }
            onChange(tab.type);
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
