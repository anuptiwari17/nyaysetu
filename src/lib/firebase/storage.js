import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getFirebaseStorage } from "@/lib/firebase/client";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 5;

function sanitizeFileName(name) {
  return String(name || "file")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

export function assertValidImageFile(file, label = "Image") {
  if (!file) {
    throw new Error(`${label} is required`);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`${label} must be JPG, PNG or WEBP`);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${label} must be 10MB or less`);
  }
}

export function assertValidImageFiles(files, maxFiles = MAX_EVIDENCE_FILES) {
  const list = Array.isArray(files) ? files : [];

  if (list.length > maxFiles) {
    throw new Error(`You can upload up to ${maxFiles} images`);
  }

  list.forEach((file, index) => {
    assertValidImageFile(file, `Image ${index + 1}`);
  });
}

export async function uploadImageToFirebase(file, folder = "evidence") {
  assertValidImageFile(file);

  const safeName = sanitizeFileName(file.name);
  const storagePath = `${folder}/${Date.now()}_${safeName}`;
  const firebaseStorage = getFirebaseStorage();
  const storageRef = ref(firebaseStorage, storagePath);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return url;
}
