import { identifierToken, colonToken } from "./lexer.js";
import { tokenRange, type Rule, type Finding } from "./runner.js";

export const tableLabelBrackets: Rule = {
  id: "table-label-brackets",
  check: ({ tokens, firstOnLine }) => {
    const firstSet = new Set(firstOnLine);
    const out: Finding[] = [];

    for (let index = 0; index < tokens.length - 1; index++) {
      const token = tokens[index];
      const next = tokens[index + 1];
      if (
        token.tokenType === identifierToken &&
        next.tokenType === colonToken &&
        firstSet.has(token)
      ) {
        out.push({
          severity: "warning",
          range: tokenRange(token),
          message: `The table name '${token.image}' should be enclosed in brackets: '[${token.image}]'.`,
        });
      }
    }

    return out;
  },
};

export const recommended: Rule[] = [tableLabelBrackets];
