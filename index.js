/**
 * Glamorous to Emotion codemod
 *
 * This babel plugin should migrate any existing codebase
 * using React or Preact and glamorous to one using
 * emotion (emotion.sh).
 *
 * It follows the glamorous to emotion migration guide
 * found at https://github.com/paypal/glamorous/blob/master/other/EMOTION_MIGRATION.md
 *
 * You can use it as a babel plugin by adding it to your .babelrc
 * under "plugins", or use it as a one-off codemod by using the
 * babel cli:
 *
 * babel [your-source-dir] --plugins=glamorous-to-emotion --presets=react,etc... --out-dir=[your-source-dir]
 *
 * A demo can be seen at:
 * https://astexplorer.net/#/gist/7bc4771564a12c9f93c4904b3934aa1c/latests
 */

module.exports = function(babel) {
  const {types: t} = babel;

  const fixContentProp = args => {
    return args.map(argument => {
      if (argument.type !== "ObjectExpression") {
        return argument;
      }
      return {
        ...argument,
        properties: argument.properties.map(prop => {
          if (prop.key.name !== "content") {
            return prop;
          }

          // Add quotes to the content property.
          return {
            ...prop,
            value: t.stringLiteral(`"${prop.value.value}"`),
          };
        }),
      };
    });
  };

  const transformJSXAttributes = attrs => {
    if (!attrs) return [];
    const appendToCss = [];
    let cssAttr = null;
    const newAttrs = attrs.filter(attr => {
      const {value, name, type} = attr;
      if (type === "JSXSpreadAttribute") return true;
      if (name.name === "css") {
        cssAttr = attr;
      } else {
        // event handlers are no CSS Props!
        if (name.name.indexOf("on") === 0) return true;

        appendToCss.push({
          name: t.identifier(name.name),
          value: value.type === "JSXExpressionContainer" ? value.expression : value,
        });
        return false;
      }
      return true;
    });
    if (appendToCss.length > 0) {
      if (!cssAttr) {
        cssAttr = t.jsxAttribute(
          t.jsxIdentifier("css"),
          t.jsxExpressionContainer(t.objectExpression([]))
        );
        newAttrs.push(cssAttr);
      } else if (cssAttr.value.expression.type !== "ObjectExpression") {
        // turn <span css={obj} .../> into <span css={{...obj}} .../>
        cssAttr.value.expression = t.objectExpression([t.spreadElement(cssAttr.value.expression)]);
      }
      appendToCss.forEach(({name, value}) => {
        cssAttr.value.expression.properties.push(t.objectProperty(name, value));
      });
      cssAttr.value.expression.properties;
    }
    return newAttrs;
  };

  const styledVisitor = {
    ReferencedIdentifier(path, {getNewName, oldName}) {
      if (path.node.name !== oldName) return;
      switch (path.parent.type) {
        case "CallExpression": {
          path.node.name = getNewName();
          break;
        }
        case "MemberExpression": {
          const grandParentPath = path.parentPath.parentPath;
          if (grandParentPath.node.type === "CallExpression") {
            grandParentPath.replaceWith(
              t.callExpression(
                t.callExpression(t.identifier(getNewName()), [
                  t.stringLiteral(grandParentPath.node.callee.property.name),
                ]),
                fixContentProp(grandParentPath.node.arguments)
              )
            );
          } else {
            throw new Error(
              `Not sure how to deal with glamorous within MemberExpression @ ${path.node.loc}`
            );
          }
          break;
        }
        case "JSXMemberExpression": {
          const grandParent = path.parentPath.parent;
          grandParent.name = t.identifier(grandParent.name.property.name.toLowerCase());
          if (grandParent.type === "JSXOpeningElement") {
            grandParent.attributes = transformJSXAttributes(grandParent.attributes);
          }
          break;
        }
        default: {
          console.log("default", path.parent.type);
        }
      }
    },
  };

  return {
    name: "glamorousToEmotion",
    visitor: {
      ImportDeclaration(path, {opts}) {
        if (
          path.node.source.value !== "glamorous" &&
          path.node.source.value !== "glamorous.macro"
        ) {
          return;
        }

        const newName = path.scope.hasBinding("styled")
          ? path.scope.generateUidIdentifier("styled").name
          : "styled";
        let newImports = [];
        let useDefaultImport = false;

        const getNewName = () => {
          if (!useDefaultImport) {
            newImports.push(
              t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier(newName))],
                t.stringLiteral(opts.preact ? "preact-emotion" : "react-emotion")
              )
            );
            useDefaultImport = true;
          }
          return newName;
        };

        path.node.specifiers.filter(s => s.type === "ImportDefaultSpecifier").forEach(s => {
          path.parentPath.traverse(styledVisitor, {getNewName, oldName: s.local.name});
        });

        const themeProvider = path.node.specifiers.find(
          specifier => specifier.local.name === "ThemeProvider"
        );

        if (themeProvider) {
          newImports.push(
            t.importDeclaration(
              [t.importSpecifier(t.identifier("ThemeProvider"), t.identifier("ThemeProvider"))],
              t.stringLiteral("emotion-theming")
            )
          );
        }

        newImports.forEach(ni => path.insertBefore(ni));
        path.remove();
      },
    },
  };
};
