import { TextScale } from '../types/sahaaya';

interface TextScaleToggleProps {
  textScale: TextScale;
  onChange: (scale: TextScale) => void;
  ariaLabel?: string;
}

const SCALE_OPTIONS: { id: TextScale; label: string; title: string }[] = [
  { id: 'a', label: 'A', title: 'Standard text size' },
  { id: 'a+', label: 'A+', title: 'Large text size' },
  { id: 'a++', label: 'A++', title: 'Extra large text size' },
];

export function TextScaleToggle({
  textScale,
  onChange,
  ariaLabel = 'Text size',
}: TextScaleToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-xl p-1 border border-[var(--sahaaya-border)] bg-[var(--sahaaya-ivory)]"
    >
      {SCALE_OPTIONS.map((option) => {
        const isActive = textScale === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            title={option.title}
            aria-pressed={isActive}
            className={`min-h-[40px] min-w-[42px] px-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isActive
                ? 'bg-[#493451] text-[#FFFCF7]'
                : 'text-[#302B33] hover:bg-[#EFEAF6]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
