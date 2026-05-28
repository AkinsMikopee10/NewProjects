import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  { label: "Remote", path: "/" },
  { label: "Contract", path: "/contract" },
  { label: "Tracker", path: "/tracker" },
];

const DesktopNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="hidden sm:flex items-center gap-1 bg-white/5 rounded-xl p-1">
      {TABS.map((tab) => (
        <button
          key={tab.path}
          onClick={() => navigate(tab.path)}
          className={`
            px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${
              pathname === tab.path
                ? "bg-primary/20 text-primary"
                : "text-white/50 hover:text-white"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default DesktopNav;
