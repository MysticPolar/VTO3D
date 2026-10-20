import { ICONS, type IconName } from './icons';

export type { IconName };

interface Props {
  name: IconName;
  /** px, 24 by default */
  size?: number;
  /** stroke width, 1.7 by default (js/icons.js) */
  stroke?: number;
  className?: string;
}

/** An icon of the prototype's set, drawn in currentColor (HANDOFF §5.5) */
export function Icon({ name, size = 24, stroke = 1.7, className }: Props) {
  const shape: { s?: string; f?: string } = ICONS[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {/* filled shapes first, so strokes (handles, white details) sit on top, as in js/icons.js;
          the markup is the prototype's own, generated into icons.ts */}
      {shape.f && (
        <g fill="currentColor" stroke="none" dangerouslySetInnerHTML={{ __html: shape.f }} />
      )}
      {shape.s && (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: shape.s }}
        />
      )}
    </svg>
  );
}
