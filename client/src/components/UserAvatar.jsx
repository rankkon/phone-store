function initials(name, email) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return String(email || '?').slice(0, 1).toUpperCase();
}

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const label = user?.fullName || user?.email || 'Người dùng';
  const classes = `user-avatar user-avatar--${size}${className ? ` ${className}` : ''}`;

  if (user?.avatarUrl) {
    return <img className={classes} src={user.avatarUrl} alt={`Ảnh đại diện của ${label}`} />;
  }
  return <span className={classes} aria-label={`Ảnh đại diện của ${label}`}>{initials(user?.fullName, user?.email)}</span>;
}
