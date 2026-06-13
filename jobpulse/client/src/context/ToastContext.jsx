import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { Star, Send, ArrowRight, AlertTriangle, Check } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  save: { Icon: Star, color: "#6c63ff" },
  apply: { Icon: Send, color: "#00d4aa" },
  status: { Icon: ArrowRight, color: "#3b82f6" },
  error: { Icon: AlertTriangle, color: "#ef4444" },
  success: { Icon: Check, color: "#00d4aa" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const toast = useCallback(
    ({ message, type = "success", duration = 3000 }) => {
      const id = ++counterRef.current;
      setToasts((prev) => [
        ...prev.slice(-3),
        { id, message, type, leaving: false },
      ]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => {
          const { Icon, color } = ICONS[t.type] || ICONS.success;
          return (
            <div
              key={t.id}
              className={`
                pointer-events-auto
                flex items-center gap-2.5
                bg-[#1a2035] border border-white/10
                rounded-2xl px-4 py-2.5 shadow-2xl
                text-sm text-white/80
                transition-all duration-300
                ${
                  t.leaving
                    ? "opacity-0 translate-y-2 scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
              `}
              style={{
                animation: t.leaving ? "none" : "toast-in 0.2s ease-out",
              }}
            >
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}22` }}
              >
                <Icon size={13} color={color} strokeWidth={2.5} />
              </span>
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
