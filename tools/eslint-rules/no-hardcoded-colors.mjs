const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/u;

function isAllowedFile(filename) {
  const normalizedFilename = filename.replaceAll("\\", "/");

  return normalizedFilename.includes("/src/theme/");
}

function reportIfHardcodedColor(context, node, value) {
  if (typeof value !== "string" || !hardcodedColorPattern.test(value)) {
    return;
  }

  context.report({
    node,
    message:
      "Hardcoded color literals must be defined in src/theme/** and consumed through domain color tokens."
  });
}

const noHardcodedColorsRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw color literals outside the centralized theme color system."
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
