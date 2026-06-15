interface Props {
  name: string;
  className?: string;
}

/**
 * Renders a name with its first letter gilded and enlarged — the "illuminated
 * initial." It's the one letter that ends up monogrammed, embroidered, engraved.
 */
export function IlluminatedName({ name, className }: Props) {
  const trimmed = name.trim();
  const initial = trimmed.charAt(0);
  const rest = trimmed.slice(1);
  return (
    <span className={className ? `illuminated-name ${className}` : 'illuminated-name'}>
      <span className="illuminated-initial" aria-hidden="true">
        {initial}
      </span>
      <span className="illuminated-rest">{rest}</span>
      <span className="sr-only">{trimmed}</span>
    </span>
  );
}
