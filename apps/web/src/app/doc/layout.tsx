export default function DocLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-[#2A2825] print:bg-white">{children}</div>;
}
