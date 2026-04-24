'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPost } from './types';
import PostCard from './PostCard';

interface PostListPanelProps {
  posts: MapPost[];
  selectedPost: MapPost | null;
  loading: boolean;
  onCardClick: (post: MapPost) => void;
  variant?: 'grid' | 'list';
}

export default function PostListPanel({ posts, selectedPost, loading, onCardClick, variant = 'grid' }: PostListPanelProps) {
  const t = useTranslations('map');
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isLoading = loading || !mounted;

  // Scroll selected card into view only when selected from the list itself, not the map
  // (scrolling is handled by onCardClick, not by selectedPost changes)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Count header + cards — all scroll together */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {variant === 'grid' && (
          <div className="px-5 pt-5 pb-3">
            {isLoading ? (
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-[18px] font-bold text-[#2A2B2E]" suppressHydrationWarning>
                {posts.length > 0 ? `${posts.length}+ ${t('items')} in map area` : '\u00a0'}
              </p>
            )}
          </div>
        )}

      {/* Cards or empty state */}
      <div className={variant === 'list' ? 'px-3 pb-4 pt-2' : 'px-4 pb-6'}>
        {isLoading ? (
          variant === 'list' ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-64" />
              ))}
            </div>
          )
        ) : !loading && posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pt-16">
            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
            </svg>
            <p className="text-[15px] font-semibold text-[#888]">{t('noResults')}</p>
            <p className="text-[13px] text-[#aaa]">Try moving or zooming the map</p>
          </div>
        ) : variant === 'list' ? (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(post.id, el);
                  else cardRefs.current.delete(post.id);
                }}
                post={post}
                isSelected={selectedPost?.id === post.id}
                onClick={onCardClick}
                variant="list"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(post.id, el);
                  else cardRefs.current.delete(post.id);
                }}
                post={post}
                isSelected={selectedPost?.id === post.id}
                onClick={onCardClick}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
