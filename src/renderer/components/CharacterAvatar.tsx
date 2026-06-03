import React from 'react';

// Helpers para cor determinística baseada no nome caso nenhuma cor seja providenciada.
const AVATAR_COLORS = [
  '#b8973a', // gold
  '#a83232', // crimson
  '#4a7fa5', // blue
  '#4a8a5a', // green
  '#7a4a9a', // purple
  '#8a6a3a', // bronze
  '#5a7a7a', // slate
];

function getDeterministicColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface CharacterAvatarProps {
  name: string;
  avatarUrl?: string;
  color?: string; // Se omitido, calculará determinísticamente
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export default function CharacterAvatar({
  name,
  avatarUrl,
  color,
  size = 'md',
  onClick,
  className = ''
}: CharacterAvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const bgColor = color || getDeterministicColor(name || 'Unknown');

  // Tamanhos (baseados nas classes do Tailwind)
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <button
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`
        flex items-center justify-center
        rounded-full flex-shrink-0 font-heading font-medium
        border border-codex-border shadow-sm
        transition-all duration-150 text-white
        ${onClick ? 'cursor-pointer hover:brightness-110 hover:scale-105 hover:shadow-md' : 'cursor-default'}
        ${sizeClasses[size]}
        ${className}
      `}
      style={avatarUrl ? undefined : {
        backgroundColor: bgColor,
        textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
      }}
      title={name}
      aria-label={`Avatar de ${name}`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={`Avatar de ${name}`} className="w-full h-full object-cover rounded-full" />
      ) : (
        initial
      )}
    </button>
  );
}
