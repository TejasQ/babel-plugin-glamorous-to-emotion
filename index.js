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

  // glamorous and emotion treat the css attribute "content" differently.
  // we need to put it's content inside a string.
  // i.e. turn {content: ""} into {content: '""'}
  const fixContentProp = glamorousFactoryArguments => {
    return glamorousFactoryArguments.map(arg => {
      if (t.isObjectExpression(arg)) {
        arg.properties = arg.properties.map(
          prop =>
            prop.key.name === "content"
              ? {...prop, value: t.stringLiteral(`"${prop.value.value}"`)}
              : prop
        );
      }
      // TODO: if `arg` is a function, we might want to inspect its return value
      return arg;
    });
  };

  const transformJSXAttributes = jsxAttrs => {
    if (!jsxAttrs) return [];
    const appendToCss = [];
    let cssAttr = null;
    const newAttrs = jsxAttrs.filter(attr => {
      if (t.isJSXSpreadAttribute(attr)) return true;
      const {value, name: jsxKey} = attr;
      if (jsxKey.name === "css") {
        cssAttr = attr;
      } else {
        // TODO: be smarter about finding out which properties
        // are CSS properties and which ones are not

        // event handlers are no CSS Props!
        if (jsxKey.name.indexOf("on") === 0) return true;

        appendToCss.push({
          name: t.identifier(jsxKey.name),
          value: t.isJSXExpressionContainer(value) ? value.expression : value,
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
      } else if (!t.isObjectExpression(cssAttr.value.expression)) {
        // turn <span css={obj} .../> into <span css={{...obj}} .../>
        // so we can add more properties to this css attribute
        cssAttr.value.expression = t.objectExpression([t.spreadElement(cssAttr.value.expression)]);
      }
      appendToCss.forEach(({name, value}) => {
        cssAttr.value.expression.properties.push(t.objectProperty(name, value));
      });
      cssAttr.value.expression.properties;
    }
    return newAttrs;
  };

  const glamorousVisitor = {
    // for each reference to an identifier...
    ReferencedIdentifier(path, {getNewName, oldName}) {
      // skip if the name of the identifier does not correspond to the name of glamorous default import
      if (path.node.name !== oldName) return;

      switch (path.parent.type) {
        // replace `glamorous()` with `styled()`
        case "CallExpression": {
          path.node.name = getNewName();
          break;
        }

        // replace `glamorous.div()` with `styled("div")()`
        case "MemberExpression": {
          const grandParentPath = path.parentPath.parentPath;
          if (t.isCallExpression(grandParentPath.node)) {
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

        // replace <glamorous.Div/> with `<div/>`
        case "JSXMemberExpression": {
          const grandParent = path.parentPath.parent;
          grandParent.name = t.identifier(grandParent.name.property.name.toLowerCase());
          if (t.isJSXOpeningElement(grandParent)) {
            grandParent.attributes = transformJSXAttributes(grandParent.attributes);
          }
          break;
        }

        default: {
          console.warning("Found glamorous being used in an unkonwn context:", path.parent.type);
        }
      }
    },
  };

  return {
    name: "glamorousToEmotion",
    visitor: {
      ImportDeclaration(path, {opts}) {
        const {value: libName} = path.node.source;
        if (libName !== "glamorous" && libName !== "glamorous.macro") {
          return;
        }

        // use "styled" as new default import, only if there's no such variable in use yet
        const newName = path.scope.hasBinding("styled")
          ? path.scope.generateUidIdentifier("styled").name
          : "styled";
        let newImports = [];
        let useDefaultImport = false;

        // only if the traversal below wants to know the newName,
        // we're gonna add the default import
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

        // only if the default import of glamorous is used, we're gonna apply the transforms
        path.node.specifiers.filter(s => t.isImportDefaultSpecifier(s)).forEach(s => {
          path.parentPath.traverse(glamorousVisitor, {getNewName, oldName: s.local.name});
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
