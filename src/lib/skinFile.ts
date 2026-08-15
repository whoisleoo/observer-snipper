export interface SkinValidationResult {
  valid: boolean
  reason?: string
}

const VALID_DIMENSIONS = [
  { width: 64, height: 64 },
  { width: 64, height: 32 },
]

export async function validateSkinImage(file: File): Promise<SkinValidationResult> {
  if (file.type !== 'image/png') {
    return { valid: false, reason: 'The file must be a PNG.' }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { valid: false, reason: "Couldn't read the image." }
  }

  const { width, height } = bitmap
  bitmap.close()

  const matches = VALID_DIMENSIONS.some((d) => d.width === width && d.height === height)
  if (!matches) {
    return {
      valid: false,
      reason: `Invalid resolution (${width}×${height}). A Minecraft skin must be 64×64 or 64×32.`,
    }
  }

  return { valid: true }
}