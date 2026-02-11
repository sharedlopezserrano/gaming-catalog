import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/gaming-catalog/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "src/pages/game.html"),
      },
    },
  },
});
