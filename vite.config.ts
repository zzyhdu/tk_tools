import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.test.js",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.test.js",
    ],
  },
});
