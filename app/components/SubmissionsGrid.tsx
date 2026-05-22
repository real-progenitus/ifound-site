'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Submission } from '@/lib/submissions';

interface Props {
  submissions: Submission[];
  adminKey: string;
}

export default function SubmissionsGrid({ submissions: initial, adminKey }: Props) {
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/partner-submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.ok) {
        setItems((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert('Failed to delete. Check that your admin key is correct.');
      }
    } finally {
      setDeleting(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="w-full bg-gray-50 py-16 px-6 md:px-12 lg:px-16">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-[#3A3B3E] uppercase mb-10">
          Partner Submissions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((sub) => (
            <div
              key={sub.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col relative"
            >
              {adminKey && (
                <button
                  onClick={() => handleDelete(sub.id)}
                  disabled={deleting === sub.id}
                  className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
                >
                  {deleting === sub.id ? '…' : 'Delete'}
                </button>
              )}

              {sub.images[0] && (
                <Image
                  src={sub.images[0]}
                  alt={sub.title}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                />
              )}

              <div className="p-5 flex flex-col flex-1 gap-2">
                <span className="inline-block self-start text-xs font-semibold bg-[#38B6FF]/15 text-[#009DE0] rounded-full px-3 py-1 capitalize">
                  {sub.category}
                </span>
                <h3 className="text-base font-bold text-[#3A3B3E] line-clamp-2">{sub.title}</h3>
                {sub.partnerName && (
                  <p className="text-xs font-medium text-gray-400">{sub.partnerName}</p>
                )}
                <p className="text-sm text-gray-500 line-clamp-3 flex-1">{sub.description}</p>

                {sub.images.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {sub.images.slice(1).map((url, i) => (
                      <Image
                        key={i}
                        src={url}
                        alt={`${sub.title} photo ${i + 2}`}
                        width={56}
                        height={56}
                        className="w-14 h-14 rounded object-cover ring-1 ring-gray-200"
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-auto pt-2">
                  {new Date(sub.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
