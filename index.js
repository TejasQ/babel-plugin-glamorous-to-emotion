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

const htmlElementAttributes = require("react-html-attributes");

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

  // transform <glamorous.Div css={styles} width={100}/> to <div css={{...styles, width: 100}}/>
  const transformJSXAttributes = ({tagName, jsxAttrs, withBabelPlugin, getCssFn, getCxFn}) => {
    if (!jsxAttrs) return [];
    const stylesArguments = [];
    let classNameAttr = null;
    const spreadsAttrs = [];
    let originalCssValue;

    /*
      We go through all jsx attributes and filter out all style-specific props. E.g `css` or `marginTop`.
      All style-specific props are gathered within `stylesArguments` and processed below
    */
    const transformedJsxAttrs = jsxAttrs.filter(attr => {
      if (t.isJSXSpreadAttribute(attr)) {
        spreadsAttrs.push(attr);
        return true;
      }
      const {value, name: jsxKey} = attr;
      if (jsxKey.name === "css") {
        originalCssValue = value;
        // move properties of css attribute to the very front via unshift
        if (!t.isObjectExpression(value.expression)) {
          stylesArguments.unshift(t.spreadElement(value.expression));
        } else {
          stylesArguments.unshift(...value.expression.properties);
        }
        return withBabelPlugin;
      } else if (jsxKey.name === "className") {
        classNameAttr = attr;
      } else {
        // ignore event handlers
        if (jsxKey.name.match(/on[A-Z]/)) return true;

        // ignore generic attributes like 'id'
        if (htmlElementAttributes["*"].includes(jsxKey.name)) return true;

        // ignore tag specific attrs like 'disabled'
        const tagSpecificAttrs = htmlElementAttributes[tagName];
        if (tagSpecificAttrs && tagSpecificAttrs.includes(jsxKey.name)) return true;

        stylesArguments.push(
          t.objectProperty(
            t.identifier(jsxKey.name),
            t.isJSXExpressionContainer(value) ? value.expression : value
          )
        );
        return false;
      }
      return true;
    });

    if (stylesArguments.length > 0) {
      // if something is spread onto the element, this spread may contain a css prop
      if (withBabelPlugin && spreadsAttrs.length) {
        // we only need to deal with spreads, if `css` is not explicitely set
        if (!originalCssValue) {
          spreadsAttrs.forEach(attr =>
            stylesArguments.unshift(
              t.spreadElement(t.memberExpression(attr.argument, t.identifier("css")))
            )
          );
        }
      }

      // if the css property was the only object, we don't need to use it's spreaded version
      const stylesObject =
        originalCssValue && stylesArguments.length === 1
          ? originalCssValue.expression
          : t.objectExpression(stylesArguments);

      if (withBabelPlugin) {
        // if babel plugin is enabled use <div css={styles}/> syntax
        if (originalCssValue) {
          originalCssValue.expression = stylesObject;
        } else {
          transformedJsxAttrs.push(
            t.jsxAttribute(t.jsxIdentifier("css"), t.jsxExpressionContainer(stylesObject))
          );
        }
      } else {
        // if babel plugin is not enabled use <div className={css(styles)}/> syntax
        let classNameValue;
        if (!classNameAttr && !spreadsAttrs.length) {
          const cssCall = t.callExpression(getCssFn(), [stylesObject]);
          classNameValue = t.jsxExpressionContainer(cssCall);
        } else {
          let args = [];
          if (classNameAttr) {
            // if className is already present use <div className={cx("my-className", styles)}/> syntax
            args.push(classNameAttr.value);
          } else {
            // if spreads are present use <div {...props} className={cx(props.className, styles)}/> syntax
            spreadsAttrs.forEach(attr => {
              args.push(t.memberExpression(attr.argument, t.identifier("className")));
            });
          }
          args.push(stylesObject);
          const cxCall = t.callExpression(getCxFn(), args);
          classNameValue = t.jsxExpressionContainer(cxCall);
        }
        if (classNameAttr) {
          classNameAttr.value = classNameValue;
        } else {
          transformedJsxAttrs.push(t.jsxAttribute(t.jsxIdentifier("className"), classNameValue));
        }
      }
    }
    return transformedJsxAttrs;
  };

  const glamorousVisitor = {
    // for each reference to an identifier...
    ReferencedIdentifier(path, {getStyledFn, oldName, withBabelPlugin, getCssFn, getCxFn}) {
      // skip if the name of the identifier does not correspond to the name of glamorous default import
      if (path.node.name !== oldName) return;

      switch (path.parent.type) {
        // replace `glamorous()` with `styled()`
        case "CallExpression": {
          path.replaceWith(getStyledFn());
          break;
        }

        // replace `glamorous.div()` with `styled("div")()`
        case "MemberExpression": {
          const grandParentPath = path.parentPath.parentPath;
          if (t.isCallExpression(grandParentPath.node)) {
            grandParentPath.replaceWith(
              t.callExpression(
                t.callExpression(getStyledFn(), [
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
          const tagName = grandParent.name.property.name.toLowerCase();
          grandParent.name = t.identifier(tagName);
          if (t.isJSXOpeningElement(grandParent)) {
            grandParent.attributes = transformJSXAttributes({
              tagName,
              jsxAttrs: grandParent.attributes,
              withBabelPlugin,
              getCssFn,
              getCxFn,
            });
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

        // use "name" as identifier, but only if it's not already used in the current scope
        const createUniqueIdentifier = name =>
          path.scope.hasBinding(name) ? path.scope.generateUidIdentifier(name) : t.identifier(name);

        // this object collects all the imports we'll need from "react-emotion"
        let emotionImports = {};

        const getStyledFn = () => {
          if (!emotionImports["default"]) {
            emotionImports["default"] = t.importDefaultSpecifier(createUniqueIdentifier("styled"));
          }
          return emotionImports["default"].local;
        };

        const getCssFn = () => {
          if (!emotionImports["css"]) {
            const specifier = t.importSpecifier(t.identifier("css"), createUniqueIdentifier("css"));
            emotionImports["css"] = specifier;
          }
          return emotionImports["css"].local;
        };

        const getCxFn = () => {
          if (!emotionImports["cx"]) {
            const specifier = t.importSpecifier(t.identifier("cx"), createUniqueIdentifier("cx"));
            emotionImports["cx"] = specifier;
          }
          return emotionImports["cx"].local;
        };

        // only if the default import of glamorous is used, we're gonna apply the transforms
        path.node.specifiers.filter(s => t.isImportDefaultSpecifier(s)).forEach(s => {
          path.parentPath.traverse(glamorousVisitor, {
            getStyledFn,
            oldName: s.local.name,
            withBabelPlugin: opts.withBabelPlugin,
            getCssFn,
            getCxFn,
          });
        });

        const themeProvider = path.node.specifiers.find(
          specifier => specifier.local.name === "ThemeProvider"
        );

        if (themeProvider) {
          path.insertBefore(
            t.importDeclaration(
              [t.importSpecifier(t.identifier("ThemeProvider"), t.identifier("ThemeProvider"))],
              t.stringLiteral("emotion-theming")
            )
          );
        }

        // if we needed something from the emotion lib, we need to add the import
        if (Object.keys(emotionImports).length) {
          path.insertBefore(
            t.importDeclaration(
              Object.values(emotionImports),
              t.stringLiteral(opts.preact ? "preact-emotion" : "react-emotion")
            )
          );
        }

        path.remove();
      },
    },
  };
};
