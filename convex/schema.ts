import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  products: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  generations: defineTable({
    userId: v.id("users"),
    productIds: v.array(v.id("products")),
    theme: v.string(),
    style: v.string(),
    prompt: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    resultImageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  themes: defineTable({
    name: v.string(),
    description: v.string(),
    prompt: v.string(),
    isActive: v.boolean(),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
