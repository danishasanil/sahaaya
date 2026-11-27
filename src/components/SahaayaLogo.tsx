interface SahaayaLogoProps {
  size?: number;
}

export function SahaayaLogo({ size = 40 }: SahaayaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="48" height="48" rx="14" fill="#493451" />
      <path
        d="M14 23C14 28.5228 18.4772 33 24 33C29.5228 33 34 28.5228 34 23"
        stroke="#A995C8"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <rect x="19.5" y="11" width="9" height="16" rx="4.5" fill="#FFFCF7" />
      <path
        d="M24 33V37.5M19.5 37.5H28.5"
        stroke="#D98570"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <circle cx="35.5" cy="14" r="2.25" fill="#D98570" />
    </svg>
  );
}
