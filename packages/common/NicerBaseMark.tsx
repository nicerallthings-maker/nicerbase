import { useId } from 'react'

/** The NicerBase "N" mark: two pills joined by a gradient diagonal. */
export const NicerBaseMarkPaths = ({ id }: { id: string }) => (
  <>
    <defs>
      <linearGradient id={`${id}-left`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF3DCB" />
        <stop offset="1" stopColor="#C2107F" />
      </linearGradient>
      <linearGradient id={`${id}-diag`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FF2FB9" />
        <stop offset="0.55" stopColor="#FF3D5A" />
        <stop offset="1" stopColor="#FFC21A" />
      </linearGradient>
      <linearGradient id={`${id}-right`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF2FA0" />
        <stop offset="1" stopColor="#FF9A1A" />
      </linearGradient>
    </defs>
    <rect x="8" y="6" width="30" height="88" rx="15" fill={`url(#${id}-left)`} />
    <rect
      x="63.5"
      y="7.5"
      width="27"
      height="85"
      rx="13.5"
      stroke={`url(#${id}-right)`}
      strokeWidth="3"
    />
    <path
      d="M23 21 L77 79"
      stroke={`url(#${id}-diag)`}
      strokeWidth="30"
      strokeLinecap="round"
      opacity="0.94"
    />
  </>
)

export const NicerBaseMark = ({
  className,
  size = 24,
}: {
  className?: string
  size?: number
}) => {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="NicerBase"
      role="img"
    >
      <NicerBaseMarkPaths id={id} />
    </svg>
  )
}
