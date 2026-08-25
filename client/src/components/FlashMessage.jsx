export default function FlashMessage({ type = 'success', children }) {
  if (!children) return null;
  return <div className={`flash flash--${type}`} role="alert"><span aria-hidden="true">{type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span><p>{children}</p></div>;
}
