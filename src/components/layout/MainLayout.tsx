import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
