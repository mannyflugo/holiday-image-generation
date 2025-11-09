import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getActiveThemes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("themes")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const seedThemes = mutation({
  args: {},
  handler: async (ctx) => {
    const existingThemes = await ctx.db.query("themes").collect();
    if (existingThemes.length > 0) {
      return "Themes already exist";
    }

    const themes = [
      {
        name: "Christmas Bundle",
        description: "Festive Christmas theme with snow, lights, and holiday decorations",
        prompt: "Transform this product into a beautiful Christmas gift bundle with festive wrapping, snow, twinkling lights, and holiday decorations. Make it look like a premium gift set under a Christmas tree.",
        isActive: true,
      },
      {
        name: "Winter Wonderland",
        description: "Elegant winter theme with ice crystals and cool tones",
        prompt: "Create an elegant winter wonderland scene featuring this product with ice crystals, snow, cool blue and white tones, and a magical frozen atmosphere.",
        isActive: true,
      },
      {
        name: "New Year Celebration",
        description: "Glamorous New Year theme with gold, sparkles, and champagne",
        prompt: "Design a glamorous New Year celebration scene with this product featuring gold accents, sparkles, champagne bubbles, and midnight celebration elements.",
        isActive: true,
      },
      {
        name: "Holiday Sale",
        description: "Eye-catching promotional theme with sale banners and offers",
        prompt: "Create an eye-catching holiday sale promotion featuring this product with bold sale banners, discount tags, special offer text, and attention-grabbing promotional elements.",
        isActive: true,
      },
      {
        name: "Gift Bundle Set",
        description: "Multiple products arranged as an attractive gift bundle",
        prompt: "Arrange these products as an attractive gift bundle set with elegant packaging, ribbons, and premium presentation that makes them look like the perfect holiday gift collection.",
        isActive: true,
      },
    ];

    for (const theme of themes) {
      await ctx.db.insert("themes", theme);
    }

    return "Themes seeded successfully";
  },
});
