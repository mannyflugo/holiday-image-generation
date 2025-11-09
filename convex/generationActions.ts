"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Replicate from "replicate";

async function generateImageWithReplicate(prompt: string, imageUrls: string[]): Promise<string> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const input = {
    prompt: prompt,
    image_input: imageUrls,
  };

  const output = await replicate.run("google/nano-banana", { input }) as any;
  
  // The output should have a url method or be a URL string
  if (typeof output === 'string') {
    return output;
  }
  if (output && typeof output.url === 'function') {
    return output.url();
  }
  if (output && typeof output.url === 'string') {
    return output.url;
  }
  
  throw new Error("Unexpected output format from Replicate API");
}

export const processGeneration = internalAction({
  args: { generationId: v.id("generations") },
  handler: async (ctx, args) => {
    // Update status to processing
    await ctx.runMutation(internal.generations.updateGenerationStatus, {
      generationId: args.generationId,
      status: "processing",
    });

    try {
      // Get generation details
      const generation = await ctx.runQuery(internal.generations.getGeneration, {
        generationId: args.generationId,
      });

      if (!generation) {
        throw new Error("Generation not found");
      }

      // Get product image URLs
      const productImageUrls: string[] = [];
      for (const productId of generation.productIds) {
        const product = await ctx.runQuery(internal.generations.getProduct, {
          productId,
        });
        if (product?.imageUrl) {
          productImageUrls.push(product.imageUrl);
        }
      }

      if (productImageUrls.length === 0) {
        throw new Error("No product images found");
      }

      // Generate image with Replicate API
      const resultUrl = await generateImageWithReplicate(generation.prompt, productImageUrls);
      
      // Upload the result to Convex storage
      const uploadUrl = await ctx.runMutation(internal.generations.generateUploadUrl);
      
      // Fetch the image from Replicate
      const imageResponse = await fetch(resultUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch generated image");
      }
      
      // Upload to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: await imageResponse.blob(),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload generated image");
      }

      const { storageId } = await uploadResponse.json();
      
      // Update generation with result
      await ctx.runMutation(internal.generations.updateGenerationStatus, {
        generationId: args.generationId,
        status: "completed",
        resultImageId: storageId,
      });
      
    } catch (error) {
      console.error("Generation failed:", error);
      await ctx.runMutation(internal.generations.updateGenerationStatus, {
        generationId: args.generationId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
