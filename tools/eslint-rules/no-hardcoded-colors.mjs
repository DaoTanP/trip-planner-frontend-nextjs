const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/u;
const tailwindPaletteUtilityPattern =
  /(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?(?=\s|$)/u;

function isAllowedFile(filename) {
  const normalizedFilename = filename.replaceAll("\\", "/");

  return normalizedFilename.includes("/src/theme/");
}

function reportIfHardcodedColor(context, node, value) {
  if (
    typeof value !== "string" ||
    (!hardcodedColorPattern.test(value) && !tailwindPaletteUtilityPattern.test(value))
  ) {
    return;
  }

  context.report({
    node,
    message:
      "Hardcoded color literals and Tailwind palette utilities must be defined in src/theme/** and consumed through domain color tokens."
  });
}

const noHardcodedColorsRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw color literals and Tailwind palette utilities outside the centralized theme color system."
    },
    schema: []
  },
  create(context) {
    if (isAllowedFile(context.filename ?? context.getFilename())) {
      return {};
    }

    return {
      Literal(node) {
        reportIfHardcodedColor(context, node, node.value);
      },
      TemplateElement(node) {
        reportIfHardcodedColor(context, node, node.value.raw);
      }
    };
  }
};

export default noHardcodedColorsRule;
