import type { ReactNode } from "react";
import { DappProvider } from "../../src/dapp";
import Shell from "../../src/Shell";

export const metadata = { title: "Dashboard · Follow Your Dollar" };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DappProvider>
      <Shell>{children}</Shell>
    </DappProvider>
  );
}
