import { useId } from 'react'

import { NicerBaseMarkPaths } from './NicerBaseMark'

/**
 * NicerBase wordmark (mark + name). The export keeps its historical name so every
 * existing call site picks up the NicerBase brand without further changes.
 */
export const SupabaseWordmark = ({ className }: { className?: string }) => {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      viewBox="0 0 420 100"
      fill="none"
      width={124}
      height={30}
      className={className}
      aria-label="NicerBase"
      role="img"
    >
      <defs>
        <linearGradient id={`${id}-text`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FF2FB9" />
          <stop offset="0.5" stopColor="#FF3D5A" />
          <stop offset="1" stopColor="#FFA21A" />
        </linearGradient>
      </defs>
      <NicerBaseMarkPaths id={id} />
      <text
        x="112"
        y="72"
        fontFamily="'Nunito','Varela Round','Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif"
        fontWeight={800}
        fontSize={62}
        letterSpacing={-1}
        fill={`url(#${id}-text)`}
      >
        NicerBase
      </text>
    </svg>
  )
}

export { SupabaseWordmark as NicerBaseWordmark }
