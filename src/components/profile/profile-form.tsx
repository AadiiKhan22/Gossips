"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/storage/avatars";
import {
  hasProfileFieldErrors,
  normalizeUsername,
  validateProfileForm,
  type ProfileFieldErrors,
} from "@/lib/validations/profile";
import type { Profile } from "@/lib/auth/get-user";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();

  const [username, setUsername] = React.useState(profile.username ?? "");
  const [displayName, setDisplayName] = React.useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url ?? "");
  const [bio, setBio] = React.useState(profile.bio ?? "");
  const [fieldErrors, setFieldErrors] = React.useState<ProfileFieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleAvatarFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFormError(null);
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(file, profile.id);
      setAvatarUrl(publicUrl);
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const errors = validateProfileForm(username, displayName, avatarUrl, bio);
    setFieldErrors(errors);
    if (hasProfileFieldErrors(errors)) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      const normalizedUsername = normalizeUsername(username);

      const { error } = await supabase
        .from("profiles")
        .update({
          username: normalizedUsername,
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        if (error.code === "23505") {
          setFormError("That username is already taken. Try another one.");
          return;
        }
        setFormError(error.message);
        return;
      }

      setSuccessMessage("Profile updated successfully.");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const avatarPreview = avatarUrl.trim() || null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="bg-gossip/10 text-gossip flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt={`${displayName || "User"} avatar`}
              width={80}
              height={80}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-2xl font-semibold">
              {(displayName || username || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="w-full space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <div className="flex gap-2">
            <Input
              id="avatarUrl"
              type="url"
              inputMode="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              aria-invalid={Boolean(fieldErrors.avatarUrl)}
              disabled={isLoading || isUploadingAvatar}
            />
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarFilePick}
              aria-hidden="true"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isUploadingAvatar}
              onClick={() => avatarFileInputRef.current?.click()}
            >
              {isUploadingAvatar ? "Uploading..." : "Upload"}
            </Button>
          </div>
          {fieldErrors.avatarUrl ? (
            <p className="text-destructive text-sm">{fieldErrors.avatarUrl}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Paste an image URL, or upload a photo (PNG/JPEG/WEBP/GIF, up to 5MB).
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="your_username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={Boolean(fieldErrors.username)}
            disabled={isLoading}
          />
          {fieldErrors.username ? (
            <p className="text-destructive text-sm">{fieldErrors.username}</p>
          ) : (
            <p className="text-muted-foreground text-xs">Lowercase letters, numbers, and underscores only.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Your display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.displayName)}
            disabled={isLoading}
          />
          {fieldErrors.displayName ? (
            <p className="text-destructive text-sm">{fieldErrors.displayName}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell people a little about yourself..."
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          aria-invalid={Boolean(fieldErrors.bio)}
          disabled={isLoading}
          rows={4}
        />
        <div className="flex items-center justify-between gap-2">
          {fieldErrors.bio ? (
            <p className="text-destructive text-sm">{fieldErrors.bio}</p>
          ) : (
            <span className="text-muted-foreground text-xs">Optional. Max 280 characters.</span>
          )}
          <span className="text-muted-foreground text-xs">{bio.length}/280</span>
        </div>
      </div>

      <Button type="submit" variant="gossip" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
