import { Toaster } from "react-hot-toast";

const Toast = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--color-neutral-800)",
          color: "var(--text-inverse)",
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: "var(--color-success-400)",
            secondary: "var(--text-inverse)",
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: "var(--color-error-400)",
            secondary: "var(--text-inverse)",
          },
        },
      }}
    />
  );
};

export default Toast;
