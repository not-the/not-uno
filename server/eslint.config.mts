import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import { defineConfig } from "eslint/config"

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.node },
        rules: {
            "semi": ["error", "never"], // No semicolons
            "indent": ["error", 4, { "SwitchCase": 1 }], // Indent size
            "eol-last": ["error", "always"], // Empty line at end of file
        }
    },
    tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "off",
        }
    }
])
