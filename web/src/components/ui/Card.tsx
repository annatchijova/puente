export default function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={`rounded-md border border-border bg-surface p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
