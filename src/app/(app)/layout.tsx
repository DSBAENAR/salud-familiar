import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SidebarProvider } from "@/components/sidebar-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col lg:pl-64">
          <Header />
          <main className="flex-1 bg-gray-50 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
