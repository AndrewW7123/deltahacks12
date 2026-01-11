"use client";

import { useState, useEffect, useRef } from "react";
import { Info, Pencil, X, Check, Upload, Image as ImageIcon, Play, Droplets, Leaf } from "lucide-react";
import StatCard from "./StatCard";

interface ProfileDashboardProps {
  user: {
    walletAddress: string;
    displayName?: string;
    profilePhoto?: string;
    heightFeet?: number;
    heightInches?: number;
    weightLbs?: number;
    hairLength?: string;
    hairType?: string;
    idealTimeRange?: {
      min: number;
      max: number;
    };
    idealTemp?: number;
    totalPoints?: number;
    totalShowers?: number;
    totalCleanEnvCoins?: number;
  };
  onUpdate?: (updatedUser: any) => void;
}

export default function ProfileDashboard({ user, onUpdate }: ProfileDashboardProps) {
  const [weeklyGraph, setWeeklyGraph] = useState<string | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.profilePhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: user.displayName || "",
    heightFeet: user.heightFeet || 0,
    heightInches: user.heightInches || 0,
    weightLbs: user.weightLbs || 0,
    hairLength: user.hairLength || "MEDIUM",
    hairType: user.hairType || "STRAIGHT",
  });

  // Update form and preview when user prop changes
  useEffect(() => {
    setEditForm({
      displayName: user.displayName || "",
      heightFeet: user.heightFeet || 0,
      heightInches: user.heightInches || 0,
      weightLbs: user.weightLbs || 0,
      hairLength: user.hairLength || "MEDIUM",
      hairType: user.hairType || "STRAIGHT",
    });
    setImagePreview(user.profilePhoto || null);
  }, [user]);

  // Convert seconds to minutes for display
  const minMinutes = user.idealTimeRange?.min
    ? Math.round(user.idealTimeRange.min / 60)
    : 0;
  const maxMinutes = user.idealTimeRange?.max
    ? Math.round(user.idealTimeRange.max / 60)
    : 0;

  // Format wallet address (show first 6 and last 4 characters)
  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setError(null);
    // Reset form to current user data when canceling
    if (isEditing) {
      setEditForm({
        displayName: user.displayName || "",
        heightFeet: user.heightFeet || 0,
        heightInches: user.heightInches || 0,
        weightLbs: user.weightLbs || 0,
        hairLength: user.hairLength || "MEDIUM",
        hairType: user.hairType || "STRAIGHT",
      });
      setImagePreview(user.profilePhoto || null);
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setUploadingPhoto(true);
    setError(null);

    try {
      const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${API_BASE_URL}/upload-photo/${user.walletAddress}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }

      const data = await response.json();
      if (data.success && data.user) {
        // Notify parent component to refresh user data
        if (onUpdate) {
          onUpdate(data.user);
        }
      } else {
        throw new Error("Failed to upload photo");
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload photo. Please try again.");
      console.error("Upload error:", err);
      // Revert preview on error
      setImagePreview(user.profilePhoto || null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Handle start shower button click
  const handleStartShower = () => {
    // TODO: Implement hardware events for starting shower
    console.log("Start shower clicked - hardware events to be implemented");
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";
      const response = await fetch(`${API_BASE_URL}/update/${user.walletAddress}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await response.json();
      if (data.success && data.user) {
        setIsEditing(false);
        // Notify parent component to refresh user data
        if (onUpdate) {
          onUpdate(data.user);
        }
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile. Please try again.");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Fetch weekly schedule graph
  useEffect(() => {
    const fetchWeeklyGraph = async () => {
      if (!user.walletAddress) return;

      setLoadingGraph(true);
      try {
        const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/profile";
        const response = await fetch(`${API_BASE_URL}/weekly-schedule/${user.walletAddress}`);

        if (!response.ok) {
          throw new Error("Failed to fetch weekly schedule");
        }

        const data = await response.json();
        if (data.success && data.graph) {
          setWeeklyGraph(data.graph);
        } else {
          setWeeklyGraph("not enough data");
        }
      } catch (error) {
        console.error("Error fetching weekly graph:", error);
        setWeeklyGraph("not enough data");
      } finally {
        setLoadingGraph(false);
      }
    };

    fetchWeeklyGraph();
  }, [user.walletAddress]);

  return (
    <div className="min-h-screen">
      {/* Header Section - Matching ranked-shower-hub style */}
      <header className="relative bg-gradient-to-b from-card/90 to-card/50 border-b border-border">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          {/* Start Shower Button */}
          <div className="mb-6 flex justify-center md:justify-start">
            <button
              onClick={handleStartShower}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold rounded-lg transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              <Play className="w-5 h-5" />
              Start Shower
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {isEditing ? (
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt={editForm.displayName || "User"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-3xl md:text-4xl font-bold text-primary">
                        {(editForm.displayName || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={user.displayName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl md:text-4xl font-bold text-primary">
                      {(user.displayName || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your name"
                    />
                  </div>
                  {/* Profile Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Profile Photo
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
                        ${dragActive 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 bg-background/50"
                        }
                        ${uploadingPhoto ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        {imagePreview ? (
                          <>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-24 h-24 rounded-full object-cover mb-2 border-2 border-primary/30"
                            />
                            <p className="text-sm text-foreground font-medium">
                              Click or drag to change photo
                            </p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                            <p className="text-sm text-foreground font-medium mb-1">
                              Click or drag to upload photo
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JPEG, PNG, GIF, or WebP (max 5MB)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
                    {user.displayName || "User"}
                  </h1>
                  <p className="text-muted-foreground mb-3">
                    Wallet: {formatWalletAddress(user.walletAddress)}
                  </p>
                </>
              )}
              {!isEditing && user.idealTimeRange && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
                  <div className="px-4 py-1.5 rounded-full bg-secondary border border-border">
                    <span className="text-primary font-bold">
                      {minMinutes}-{maxMinutes} min
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">optimal range</span>
                  </div>
                  {user.idealTemp && (
                    <div className="px-4 py-1.5 rounded-full bg-secondary border border-border">
                      <span className="text-primary font-bold">{user.idealTemp}°C</span>
                      <span className="text-muted-foreground ml-1 text-sm">
                        ({(user.idealTemp * 9 / 5 + 32).toFixed(0)}°F)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Stats Cards - Showers and Environmental Coins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatCard
            icon={Droplets}
            label="Total Showers"
            value={user.totalShowers || 0}
            unit="showers"
          />
          <StatCard
            icon={Leaf}
            label="Environmental Coins"
            value={user.totalCleanEnvCoins || 0}
            unit="coins"
          />
        </div>

        {/* Profile Details Card */}
        {isEditing && (
          <div className="rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold text-foreground mb-6 tracking-tight">
              Profile Information
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Height (Feet)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editForm.heightFeet}
                    onChange={(e) => setEditForm({ ...editForm, heightFeet: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Height (Inches)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={editForm.heightInches}
                    onChange={(e) => setEditForm({ ...editForm, heightInches: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.weightLbs}
                  onChange={(e) => setEditForm({ ...editForm, weightLbs: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Hair Length
                  </label>
                  <select
                    value={editForm.hairLength}
                    onChange={(e) => setEditForm({ ...editForm, hairLength: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="BALD">Bald / Very Short</option>
                    <option value="SHORT">Short</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LONG">Long</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Hair Type
                  </label>
                  <select
                    value={editForm.hairType}
                    onChange={(e) => setEditForm({ ...editForm, hairType: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="STRAIGHT">Straight</option>
                    <option value="CURLY">Curly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculated Shower Goal Card */}
        <div className="rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground tracking-tight animate-fade-in">
              Your Calculated Shower Goal
            </h2>
            {/* Info Icon Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 border border-border hover:border-primary/50 transition-all"
                aria-label="Information about shower goal"
              >
                <Info className="w-4 h-4 text-primary" />
              </button>
              
              {/* Tooltip */}
              {showInfoTooltip && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-card border border-border rounded-lg shadow-lg z-10">
                  <p className="text-sm text-muted-foreground">
                    This is an estimate of your optimal shower needs based on the information you provided during calibration. The range is calculated using your body measurements and hair profile to optimize efficiency and hygiene.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-5xl md:text-6xl font-bold text-primary mb-3">
              {minMinutes}-{maxMinutes}
            </div>
            <div className="text-xl text-muted-foreground mb-4">Minutes</div>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Optimized for your body type and hair profile. This personalized range helps you optimize your shower time for maximum efficiency and hygiene.
            </p>
            {user.idealTemp && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-muted-foreground text-sm">
                  Recommended Temperature: <span className="text-foreground font-semibold">{user.idealTemp}°C ({(user.idealTemp * 9/5 + 32).toFixed(0)}°F)</span>
                </p>
              </div>
            )}
          </div>

          {/* Weekly Schedule Graph Section */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3 tracking-tight animate-fade-in-delay">
              Weekly Schedule
            </h3>
            {loadingGraph ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground text-sm">Generating graph...</span>
              </div>
            ) : weeklyGraph === "not enough data" ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">Not enough data</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Complete more showers to see your weekly schedule analysis
                </p>
              </div>
            ) : weeklyGraph ? (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-foreground whitespace-pre-line">{weeklyGraph}</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
