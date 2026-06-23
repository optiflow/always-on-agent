import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    starlight({
      sidebar: [
        {
          items: [
            { label: "Overview", slug: "" },
            { label: "Architecture", slug: "architecture" },
            { label: "Judge Demo Script", slug: "demo-script" }
          ],
          label: "Hackathon Demo"
        }
      ],
      title: "Always-On Ops Agent"
    })
  ]
});
