# 🟡 Remove Unused Image Processing Functions

**Status:** done
**Priority:** P2 (IMPORTANT)
**Category:** Code Quality
**Created:** 2026-02-04
**Source:** Code review PR #37 - code-simplicity-reviewer agent

## Problem

Three functions in `src/lib/imageProcessing.ts` are exported but never used anywhere in the codebase. These add unnecessary complexity and maintenance burden.

**Unused Functions:**
1. `isValidImage()` - Lines 19-32
2. `getImageMetadata()` - Lines 78-99
3. `generateMultipleThumbnails()` - Lines 126-155

**Code Simplification Potential:** 44% (69 of 155 lines could be removed)

## Current Code

`src/lib/imageProcessing.ts:19-32`
```typescript
export async function isValidImage(imageBuffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return !!(metadata.format && metadata.width && metadata.height);
  } catch {
    return false;
  }
}
```

`src/lib/imageProcessing.ts:78-99`
```typescript
export async function getImageMetadata(
  imageBuffer: Buffer
): Promise<{
  format: string;
  width: number;
  height: number;
  size: number;
}> {
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.format || !metadata.width || !metadata.height || !metadata.size) {
    throw new Error('Invalid image metadata');
  }

  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    size: metadata.size,
  };
}
```

`src/lib/imageProcessing.ts:126-155`
```typescript
export async function generateMultipleThumbnails(
  imageBuffer: Buffer,
  sizes: Array<{ width: number; suffix: string }>
): Promise<Array<ProcessedImage & { suffix: string }>> {
  const results = await Promise.all(
    sizes.map(async ({ width, suffix }) => {
      const thumbnail = await generateThumbnail(imageBuffer, { width, format: 'webp' });
      return { ...thumbnail, suffix };
    })
  );

  return results;
}
```

## Solution

Remove the three unused functions and their associated types:

1. Delete `isValidImage()` function
2. Delete `getImageMetadata()` function
3. Delete `generateMultipleThumbnails()` function
4. Keep only `generateThumbnail()` and its types

**After cleanup:**
```typescript
// imageProcessing.ts - simplified (86 lines vs 155 lines)

import sharp from 'sharp';

export interface ThumbnailOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  // ... existing implementation ...
}
```

## Verification

Before removing, search codebase to confirm no usage:

```bash
# Search for function calls
rg "isValidImage\(" --type ts
rg "getImageMetadata\(" --type ts
rg "generateMultipleThumbnails\(" --type ts

# Should return no results (except definitions in imageProcessing.ts)
```

## Testing

Verify existing tests still pass after removal:

```bash
npm test src/lib/imageProcessing.test.ts
npm test src/pages/api/upload/confirm.test.ts
```

## Benefits

- **Reduced complexity:** 44% less code to maintain
- **Clearer API:** Only expose what's actually used
- **Faster builds:** Less code to parse and bundle
- **Easier refactoring:** Fewer functions to update when changing implementation

## Future Considerations

If these functions are needed later:
- Add them back when there's a concrete use case
- Write tests first (TDD)
- Document why they're needed

Follow YAGNI principle: "You Aren't Gonna Need It"

## References

- YAGNI (You Aren't Gonna Need It) principle
- Code simplification best practices
- Review finding: code-simplicity-reviewer

## Blockers

None

## Estimated Effort

30 minutes - 1 hour
