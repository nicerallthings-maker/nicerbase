import { User } from 'icons'
import Image from 'next/image'
import { ReactNode, useState } from 'react'
import { cn } from 'ui'

/** "Ada Lovelace" -> "AL", "ada" -> "AD", "" -> "". */
export function getInitials(name?: string) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}

interface ProfileImageProps {
  alt?: string
  src?: string
  placeholder?: ReactNode
  className?: string
}

export const ProfileImage = ({ alt, src, placeholder, className }: ProfileImageProps) => {
  const [hasInvalidImg, setHasInvalidImg] = useState(false)

  return !!src && !hasInvalidImg ? (
    <Image
      alt={alt ?? ''}
      src={src}
      width="24"
      height="24"
      className={cn('aspect-square bg-foreground rounded-full object-cover', className)}
      onError={() => setHasInvalidImg(true)}
    />
  ) : (
    (placeholder ?? (
      <figure
        className={cn(
          'bg-primary-solid text-primary-solid-foreground rounded-full flex items-center justify-center',
          className
        )}
        aria-label={alt}
      >
        {getInitials(alt) ? (
          <span className="text-[11px] font-semibold leading-none tracking-wide">
            {getInitials(alt)}
          </span>
        ) : (
          <User size={18} strokeWidth={1.5} />
        )}
      </figure>
    ))
  )
}
