import Image from 'next/image';
import { getInitials } from './team-utils';

type TeamPortraitProps = {
  photoUrl: string | null;
  alt: string;
  name: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export function TeamPortrait({
  photoUrl,
  alt,
  name,
  priority = false,
  className = 'relative aspect-[4/5] overflow-hidden border border-[#111111] bg-[#ebe9e3] dark:border-[#2a2d32] dark:bg-[#1e2024]',
  imageClassName = 'object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-[1.01] motion-reduce:transition-none',
  sizes = '(max-width: 768px) 100vw, 33vw',
}: TeamPortraitProps) {
  return (
    <div className={className}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={alt}
          fill
          priority={priority}
          className={imageClassName}
          sizes={sizes}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-[#ebe9e3] text-3xl font-semibold text-[#111111] md:text-4xl dark:bg-[#1e2024] dark:text-[#e8e5df]">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
