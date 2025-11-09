import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const createGeneration = mutation({
  args: {
    productIds: v.array(v.id("products")),
    theme: v.string(),
    style: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify all products belong to the user
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product || product.userId !== userId) {
        throw new Error("Product not found or not authorized");
      }
    }

    // Get theme prompt
    const themes = await ctx.db
      .query("themes")
      .filter((q) => q.eq(q.field("name"), args.theme))
      .collect();
    
    const theme = themes[0];
    if (!theme) {
      throw new Error("Theme not found");
    }

    let prompt = theme.prompt;
    
    // Customize prompt based on style
    switch (args.style) {
      case "product-bundle":
        prompt += " Focus on creating an attractive product bundle arrangement.";
        break;
      case "holiday-theme":
        prompt += " Emphasize the holiday atmosphere and seasonal elements.";
        break;
      case "promotion-only":
        prompt += " Highlight promotional elements, discounts, and special offers prominently.";
        break;
      case "all-merged":
        prompt += " Combine product bundling, holiday theming, and promotional elements into one cohesive design.";
        break;
    }

    const generationId = await ctx.db.insert("generations", {
      userId,
      productIds: args.productIds,
      theme: args.theme,
      style: args.style,
      prompt,
      status: "pending",
    });

    // Schedule the generation process
    await ctx.scheduler.runAfter(0, internal.generationActions.processGeneration, {
      generationId,
    });

    return generationId;
  },
});

export const updateGenerationStatus = internalMutation({
  args: {
    generationId: v.id("generations"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    resultImageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const generation = await ctx.db.get(args.generationId);
    if (!generation) {
      throw new Error("Generation not found");
    }

    await ctx.db.patch(args.generationId, {
      status: args.status,
      ...(args.resultImageId && { resultImageId: args.resultImageId }),
      ...(args.errorMessage && { errorMessage: args.errorMessage }),
    });
  },
});

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getGeneration = internalQuery({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId);
  },
});

export const getProduct = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
    
    return {
      ...product,
      imageUrl: await ctx.storage.getUrl(product.imageId),
    };
  },
});

export const getUserGenerations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const generations = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      generations.map(async (generation) => ({
        ...generation,
        resultImageUrl: generation.resultImageId 
          ? await ctx.storage.getUrl(generation.resultImageId)
          : null,
      }))
    );
  },
});
