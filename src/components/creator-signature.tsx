import { Github, Linkedin, type LucideIcon } from 'lucide-react';

const profiles: Array<{ href: string; icon: LucideIcon; label: string }> = [
  {
    href: 'https://github.com/ewgenij87snwork',
    icon: Github,
    label: 'GitHub',
  },
  {
    href: 'https://www.linkedin.com/in/yevgeniy-sorokin-829b7b18a/',
    icon: Linkedin,
    label: 'LinkedIn',
  },
];

export function CreatorSignature({ className = '' }: { className?: string }) {
  return (
    <address
      aria-label="Yevgeniy Sorokin profiles"
      className={`creator-signature ${className}`.trim()}
    >
      <p className="creator-signature__name">Yevgeniy Sorokin</p>
      <div className="creator-signature__links">
        {profiles.map(({ href, icon: Icon, label }) => (
          <a
            aria-label={`${label} profile for Yevgeniy Sorokin (opens in a new tab)`}
            className="creator-signature__link"
            href={href}
            key={label}
            rel="author noopener noreferrer"
            target="_blank"
            title={label}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
          </a>
        ))}
      </div>
    </address>
  );
}
