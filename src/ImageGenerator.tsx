import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function ImageGenerator() {
  const [selectedProducts, setSelectedProducts] = useState<Id<"products">[]>([]);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useQuery(api.products.getUserProducts) || [];
  const themes = useQuery(api.themes.getActiveThemes) || [];
  const generations = useQuery(api.generations.getUserGenerations) || [];

  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const createProduct = useMutation(api.products.createProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const createGeneration = useMutation(api.generations.createGeneration);
  const seedThemes = useMutation(api.themes.seedThemes);

  // Seed themes if none exist
  if (themes.length === 0) {
    seedThemes();
  }

  const styles = [
    { id: "product-bundle", name: "Product Bundle", description: "Focus on attractive product arrangement" },
    { id: "holiday-theme", name: "Holiday Theme", description: "Emphasize seasonal atmosphere" },
    { id: "promotion-only", name: "Promotion Only", description: "Highlight discounts and offers" },
    { id: "all-merged", name: "All Styles Merged", description: "Combine all elements together" },
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Generate upload URL
        const uploadUrl = await generateUploadUrl();
        
        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        const { storageId } = await result.json();
        
        // Create product record
        await createProduct({
          imageId: storageId,
          name: file.name.split('.')[0],
        });
      }
      
      toast.success(`Uploaded ${files.length} product image(s)`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to upload images");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (productId: Id<"products">) => {
    try {
      await deleteProduct({ productId });
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleGenerate = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }
    if (!selectedTheme) {
      toast.error("Please select a theme");
      return;
    }
    if (!selectedStyle) {
      toast.error("Please select a style");
      return;
    }

    try {
      await createGeneration({
        productIds: selectedProducts,
        theme: selectedTheme,
        style: selectedStyle,
      });
      toast.success("Generation started! Check your results below.");
      setSelectedProducts([]);
      setSelectedTheme("");
      setSelectedStyle("");
    } catch (error) {
      toast.error("Failed to start generation");
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-2xl font-semibold mb-4">Upload Product Images</h2>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Uploading...
            </div>
          )}
        </div>
      </div>

      {/* Product Selection */}
      {products.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-2xl font-semibold mb-4">Select Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div key={product._id} className="relative group">
                <div
                  className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                    selectedProducts.includes(product._id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedProducts(prev =>
                      prev.includes(product._id)
                        ? prev.filter(id => id !== product._id)
                        : [...prev, product._id]
                    );
                  }}
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name || "Product"}
                      className="w-full h-32 object-cover rounded"
                    />
                  )}
                  <p className="text-sm font-medium mt-2 truncate">
                    {product.name || "Untitled"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(product._id);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme and Style Selection */}
      {products.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-2xl font-semibold mb-4">Choose Theme & Style</h2>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <h3 className="text-lg font-medium mb-3">Holiday Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {themes.map((theme) => (
                  <label key={theme._id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="theme"
                      value={theme.name}
                      checked={selectedTheme === theme.name}
                      onChange={(e) => setSelectedTheme(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      selectedTheme === theme.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <h4 className="font-medium">{theme.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{theme.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <h3 className="text-lg font-medium mb-3">Generation Style</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {styles.map((style) => (
                  <label key={style.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="style"
                      value={style.id}
                      checked={selectedStyle === style.id}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`border-2 rounded-lg p-4 transition-all ${
                      selectedStyle === style.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                      <h4 className="font-medium">{style.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={selectedProducts.length === 0 || !selectedTheme || !selectedStyle}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Holiday Image
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {generations.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-2xl font-semibold mb-4">Your Generations</h2>
          <div className="space-y-4">
            {generations.map((generation) => (
              <div key={generation._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{generation.theme} - {generation.style}</h3>
                    <p className="text-sm text-gray-600">
                      {generation.productIds.length} product(s) • {new Date(generation._creationTime).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    generation.status === "completed" ? "bg-green-100 text-green-800" :
                    generation.status === "processing" ? "bg-blue-100 text-blue-800" :
                    generation.status === "failed" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {generation.status}
                  </span>
                </div>
                
                {generation.status === "processing" && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Generating your holiday image with AI... This may take 30-60 seconds.
                  </div>
                )}
                
                {generation.status === "failed" && generation.errorMessage && (
                  <p className="text-red-600 text-sm">{generation.errorMessage}</p>
                )}
                
                {generation.status === "completed" && !generation.resultImageUrl && (
                  <p className="text-green-600 text-sm">✅ Generation completed successfully! Your holiday image has been created.</p>
                )}
                
                {generation.resultImageUrl && (
                  <img
                    src={generation.resultImageUrl}
                    alt="Generated holiday image"
                    className="mt-2 max-w-full h-auto rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
