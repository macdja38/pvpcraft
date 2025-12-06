import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
    js.configs.recommended,
    tseslint.configs.recommended,

    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            complexity: ["error", 20],
            "no-prototype-builtins": "off",
            "no-unused-vars": "off",
            "no-extra-semi": "off",
        },
    },
    // Optional: TS-only overrides (uncomment / extend as needed)
    // {
    //   files: ["**/*.{ts,tsx}"],
    //   rules: {
    //     "@typescript-eslint/explicit-function-return-type": "off",
    //   },
    // },
);
