'use client';

import { useTranslations } from 'next-intl';
import { forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown } from '@fortawesome/free-solid-svg-icons';
import { MapPost, getCategoryIcon } from './types';

interface PostCardProps {
  post: MapPost;
  isSelected: boolean;
  onClick: (post: MapPost) => void;
  variant?: 'grid' | 'list';
}

const currencySymbol: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', BRL: 'R$', CHF: 'CHF', JPY: '¥',
  CNY: '¥', KRW: '₩', INR: '₹', RUB: '₽', TRY: '₺', PLN: 'zł',
  SEK: 'kr', NOK: 'kr', DKK: 'kr', CZK: 'Kč', HUF: 'Ft', RON: 'lei',
  AUD: 'A$', CAD: 'C$', MXN: 'MX$', ARS: 'AR$', CLP: 'CL$',
};

const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, isSelected, onClick, variant = 'grid' }, ref) => {
  const t = useTranslations('map');

  const dateStr = post.timestamp
    ? new Date(post.timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const hasReward = post.reward && post.reward !== '0';

  if (variant === 'list') {
    return (
      <div
        ref={ref}
        onClick={() => onClick(post)}
        className={`relative cursor-pointer flex items-stretch gap-3 bg-white rounded-xl overflow-hidden transition-all duration-200 min-h-[120px] ${
          post.isPromoted ? 'ring-2 ring-[#F5A623]' : 'shadow-sm active:bg-gray-50'
        }`}
      >
        {/* Image */}
        <div className="w-[120px] self-stretch overflow-hidden rounded-l-xl bg-gray-100 shrink-0">
          {post.images && post.images.length > 0 ? (
            <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <img src={getCategoryIcon(post.category)} alt={post.category} className="w-8 h-8 opacity-30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1 py-3">
          <h3 className="text-[14px] font-bold text-[#2A2B2E] leading-snug line-clamp-1">{post.title}</h3>
          {post.description && (
            <p className="text-[12px] text-[#555] line-clamp-2 leading-snug">{post.description}</p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span
              className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                post.type === 'Lost' ? 'bg-[#FF5449]' : 'bg-[#009DE0]'
              }`}
            >
              {post.type === 'Lost' ? t('lost') : t('found')}
            </span>
            {hasReward && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#83D1B0] text-white">
                {post.reward}{currencySymbol[post.currency] || post.currency}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 self-center pr-3">
          <svg className="w-4 h-4 text-[#ccc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Crown badge for promoted posts */}
        {post.isPromoted && (
          <div className="absolute top-0 right-0 w-7 h-7 rounded-bl-xl bg-[#F5A623] flex items-center justify-center">
            <FontAwesomeIcon icon={faCrown} className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onClick={() => onClick(post)}
      className={`relative cursor-pointer rounded-xl overflow-hidden bg-white transition-all duration-200 ${
        post.isPromoted
          ? 'ring-2 ring-[#F5A623]'
          : 'shadow-sm hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative w-full h-52 bg-gray-100 overflow-hidden">
        {post.images && post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <img
              src={getCategoryIcon(post.category)}
              alt={post.category}
              className="w-12 h-12 opacity-30"
            />
          </div>
        )}

        {/* Lost / Found badge */}
        <span
          className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
            post.type === 'Lost' ? 'bg-[#FF5449]' : 'bg-[#009DE0]'
          }`}
        >
          {post.type === 'Lost' ? t('lost') : t('found')}
        </span>


      </div>

      {/* Crown badge for promoted posts — outside image div so card's overflow-hidden clips corner */}
      {post.isPromoted && (
        <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-xl bg-[#F5A623] flex items-center justify-center">
          <FontAwesomeIcon icon={faCrown} className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Content */}
      <div className="px-2.5 py-2 space-y-0.5">
        <h3 className="text-[13px] font-bold text-[#2A2B2E] leading-snug line-clamp-1">
          {post.title}
        </h3>

        <p className="text-[11px] font-semibold line-clamp-1">
          {hasReward
            ? <span className="inline-block bg-[#83D1B0] text-white px-2 py-0.5 rounded-full">💰 {post.reward}{currencySymbol[post.currency] || post.currency}</span>
            : <span className="text-[#bbb]">No reward</span>
          }
        </p>



        {dateStr && (
          <p className="text-[11px] text-[#bbb]">{dateStr}</p>
        )}
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';
export default PostCard;
