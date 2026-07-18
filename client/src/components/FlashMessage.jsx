export default function FlashMessage({ type = 'success', children }) {
  if (!children) return null;
  return <div className={`flash flash--${type}`} role="alert">{children}</div>;
}
