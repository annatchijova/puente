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
      className={`rounded-lg border border-border bg-surface p-5 shadow-md ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
