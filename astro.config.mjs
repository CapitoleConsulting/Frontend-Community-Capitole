import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://CapitoleConsulting.github.io",
  base: "/Frontend-Community-Capitole/",
  integrations: [
    starlight({
      title: "Frontend Community",
      customCss: ["./src/styles/atrium.css"],
      description:
        "Knowledge base, guidelines and code examples across frontend frameworks and languages.",
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        es: { label: "Español", lang: "es" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/CapitoleConsulting/Frontend-Community-Capitole",
        },
      ],
      sidebar: [
        {
          label: "Inicio",
          link: "/",
        },
        {
          label: "Docs",
          items: [
            { label: "Introduction", link: "/docs/" },
            { label: "Articles", autogenerate: { directory: "docs/articles" } },
            { label: "Onboarding", autogenerate: { directory: "docs/onboarding" } },
            { label: "Decisions (ADRs)", autogenerate: { directory: "docs/decisions" } },
            { label: "Glossary", autogenerate: { directory: "docs/glossary" } },
          ],
        },
        {
          label: "Angular",
          items: [
            { label: "Introduction", link: "/angular/" },
            { label: "Getting Started", autogenerate: { directory: "angular/getting-started" } },
            { label: "Guidelines", autogenerate: { directory: "angular/guidelines" } },
            { label: "Architecture", autogenerate: { directory: "angular/architecture" } },
            { label: "Components", autogenerate: { directory: "angular/components" } },
            { label: "Patterns", autogenerate: { directory: "angular/patterns" } },
            { label: "Utilities", autogenerate: { directory: "angular/utilities" } },
            { label: "State management", autogenerate: { directory: "angular/state-management" } },
            { label: "Advanced", autogenerate: { directory: "angular/advanced" } },
            { label: "Examples", autogenerate: { directory: "angular/examples" } },
          ],
        },
        {
          label: "React",
          items: [
            { label: "Introduction", link: "/react/" },
            { label: "Guidelines", autogenerate: { directory: "react/guidelines" } },
            { label: "Architecture", autogenerate: { directory: "react/architecture" } },
            { label: "Components", autogenerate: { directory: "react/components" } },
            { label: "Patterns", autogenerate: { directory: "react/patterns" } },
            { label: "State management", autogenerate: { directory: "react/state-management" } },
            { label: "Examples", autogenerate: { directory: "react/examples" } },
          ],
        },
        {
          label: "Vue",
          items: [
            { label: "Introduction", link: "/vue/" },
            { label: "Guidelines", autogenerate: { directory: "vue/guidelines" } },
            { label: "Architecture", autogenerate: { directory: "vue/architecture" } },
            { label: "Components", autogenerate: { directory: "vue/components" } },
            { label: "Patterns", autogenerate: { directory: "vue/patterns" } },
            { label: "State management", autogenerate: { directory: "vue/state-management" } },
            { label: "Examples", autogenerate: { directory: "vue/examples" } },
          ],
        },
        {
          label: "Others",
          items: [
            { label: "Introduction", link: "/others/" },
            { label: "Svelte", autogenerate: { directory: "others/svelte" } },
            { label: "Web components", autogenerate: { directory: "others/web-components" } },
            { label: "Experiments", autogenerate: { directory: "others/experiments" } },
          ],
        },
        {
          label: "Shared",
          items: [
            { label: "Introduction", link: "/shared/" },
            { label: "Best practices", autogenerate: { directory: "shared/best-practices" } },
            { label: "Performance", autogenerate: { directory: "shared/performance" } },
            { label: "Accessibility", autogenerate: { directory: "shared/accessibility" } },
            { label: "Testing", autogenerate: { directory: "shared/testing" } },
            { label: "Security", autogenerate: { directory: "shared/security" } },
            { label: "Tooling", autogenerate: { directory: "shared/tooling" } },
            { label: "Internationalization (i18n)", autogenerate: { directory: "shared/i18n" } },
          ],
        },
      ],
    }),
  ],
});
