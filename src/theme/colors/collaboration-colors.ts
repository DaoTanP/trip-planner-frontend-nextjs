const collaborationColorPalette = [
  {
    avatarClassName: "bg-collaboration-user-0 text-collaboration-user-foreground"
  },
  {
    avatarClassName: "bg-collaboration-user-1 text-collaboration-user-foreground"
  },
  {
    avatarClassName: "bg-collaboration-user-2 text-collaboration-user-foreground"
  },
  {
    avatarClassName: "bg-collaboration-user-3 text-collaboration-user-foreground"
  },
  {
    avatarClassName: "bg-collaboration-user-4 text-collaboration-user-foreground"
  },
  {
    avatarClassName: "bg-collaboration-user-5 text-collaboration-user-foreground"
  }
] as const;

export const collaborationColorClassNames = {
  presencePill: "bg-collaboration-presence/10 text-collaboration-presence-foreground",
  presenceDot: "bg-collaboration-presence-dot",
  overflowAvatar: "bg-muted text-muted-foreground"
} as const;

export function getCollaborationColor(userId: string) {
  const paletteIndex = getStablePaletteIndex(userId, collaborationColorPalette.length);

  return collaborationColorPalette[paletteIndex] ?? collaborationColorPalette[0];
}

function getStablePaletteIndex(value: string, paletteSize: number) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % paletteSize;
}
