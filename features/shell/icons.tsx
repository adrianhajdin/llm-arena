/**
 * Drawn here rather than pulled from an icon package: the shell needs six
 * glyphs, and a dependency that ships a thousand of them to deliver six is a
 * bad trade. Each one inherits `currentColor` and sizes from the class the
 * caller puts on it, so an icon is never a second place a colour is decided.
 */

type IconProps = { readonly className?: string };

const Frame = ({
  className,
  children,
}: IconProps & { readonly children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

/** Three columns answering at once, which is what the arena literally is. */
export const ArenaIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <rect x="3" y="4" width="5" height="16" rx="1.2" />
    <rect x="9.5" y="4" width="5" height="16" rx="1.2" />
    <rect x="16" y="4" width="5" height="16" rx="1.2" />
  </Frame>
);

/** A standing, tallest first. */
export const LeaderboardIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <path d="M4 20h16" />
    <rect x="5" y="9" width="4" height="8" rx="1" />
    <rect x="10" y="5" width="4" height="12" rx="1" />
    <rect x="15" y="12" width="4" height="5" rx="1" />
  </Frame>
);

/** A catalogue of things to pick from. */
export const ModelsIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <rect x="3.5" y="4" width="17" height="6" rx="1.5" />
    <rect x="3.5" y="14" width="17" height="6" rx="1.5" />
    <path d="M7 7h.01M7 17h.01" />
  </Frame>
);

export const PanelIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
  </Frame>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Frame>
);

export const PlusIcon = ({ className }: IconProps) => (
  <Frame className={className}>
    <path d="M12 5v14M5 12h14" />
  </Frame>
);
