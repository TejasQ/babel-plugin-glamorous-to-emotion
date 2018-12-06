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

const validElementNames = new Set([
  ...htmlElementAttributes.elements.html,
  ...htmlElementAttributes.elements.svg,
]);

module.exports = function(babel) {
  const {types: t} = babel;

  // try to convert filterProps etc into something emotion understands
  const processOptions = options => {
    if (!t.isObjectExpression(options)) {
      const name = t.isIdentifier(options) ? options.name : options.type;
      console.warn(
        `codemod received '${name}' as an options argument. This is left in place, but will probably contain content that emotion won't understand`
      );

      return options;
    } else {
      const transformedOptions = [];
      let forwardPropsExpr = [];
      options.properties.forEach(prop => {
        const {key, value} = prop;
        switch (key.name) {
          case "filterProps": {
            // filterProps: ["one"] ---> prop !== "one"
            if (t.isArrayExpression(value) && value.elements.length === 1) {
              forwardPropsExpr.push(
                t.binaryExpression("!==", t.identifier("prop"), value.elements[0])
              );
            } else {
              // filterProps: ["one", "two"] ---> ["one", "two"].indexOf(prop) === -1
              forwardPropsExpr.push(
                t.binaryExpression(
                  "===",
                  t.callExpression(t.memberExpression(value, t.identifier("indexOf")), [
                    t.identifier("prop"),
                  ]),
                  t.numericLiteral(-1)
                )
              );
            }
            break;
          }
          case "forwardProps": {
            // forwardProps: ["one"] ---> prop === "one"
            if (t.isArrayExpression(value) && value.elements.length === 1) {
              forwardPropsExpr.push(
                t.binaryExpression("===", t.identifier("prop"), value.elements[0])
              );
            } else {
              // forwardProps: ["one", "two"] ---> ["one", "two"].indexOf(prop) > -1
              forwardPropsExpr.push(
                t.binaryExpression(
                  ">",
                  t.callExpression(t.memberExpression(value, t.identifier("indexOf")), [
                    t.identifier("prop"),
                  ]),
                  t.numericLiteral(-1)
                )
              );
            }
            break;
          }
          default: {
            console.warn(
              `codemod received '${key}' as an option. This is left in place, but will probably not be undestood by emotion`
            );
            transformedOptions.push(prop);
          }
        }
      });
      if (forwardPropsExpr.length) {
        // concatenate all expressions via "&&"
        const reducedExpr = forwardPropsExpr.reduce((existing, expr) =>
          t.logicalExpression("&&", existing, expr)
        );
        // create `{shouldForwardProp: prop => [reducedExpr]}` expression
        transformedOptions.push(
          t.objectProperty(
            t.identifier("shouldForwardProp"),
            t.arrowFunctionExpression([t.identifier("prop")], reducedExpr)
          )
        );
      }
      return t.objectExpression(transformedOptions);
    }
  };

  const processGlamorousArgs = args => {
    if (args.length === 0) throw new Error("Can't handle glamorous call with 0 arguments");
    if (args.length > 2) throw new Error("Can't handle glamorous call with more than 2 arguments");
    if (args.length === 1) return args;
    return [args[0], processOptions(args[1])];
  };

  // glamorous and emotion treat the css attribute "content" differently.
  // we need to put its content inside a string.
  // i.e. turn {content: ""} into {content: '""'}
  const fixContentProp = glamorousFactoryArguments => {
    return glamorousFactoryArguments.map(arg => {
      if (t.isObjectExpression(arg)) {
        arg.properties = arg.properties.map(prop =>
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
  const transformJSXAttributes = ({
    tagName,
    jsxAttrs,
    withJsxPragma,
    getCssFn,
    getCxFn,
    useJsxPragma,
  }) => {
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
        if (withJsxPragma) useJsxPragma();
        return withJsxPragma;
      } else if (jsxKey.name === "className") {
        classNameAttr = attr;
      } else if (jsxKey.name === "innerRef") {
        // turn `innerRef` into `ref`
        jsxKey.name = "ref";
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
      if (withJsxPragma && spreadsAttrs.length) {
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

      if (withJsxPragma) {
        // if we allow using the jsx pragma, use <div css={styles}/> syntax
        if (originalCssValue) {
          originalCssValue.expression = stylesObject;
        } else {
          transformedJsxAttrs.push(
            t.jsxAttribute(t.jsxIdentifier("css"), t.jsxExpressionContainer(stylesObject))
          );
        }
      } else {
        // if we don't allow using the jsx pragma, use <div className={css(styles)}/> syntax
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
    ReferencedIdentifier(
      path,
      {getStyledFn, oldName, withJsxPragma, getCssFn, getCxFn, useJsxPragma}
    ) {
      // skip if the name of the identifier does not correspond to the name of glamorous default import
      if (path.node.name !== oldName) return;

      switch (path.parent.type) {
        // replace `glamorous()` with `styled()`
        case "CallExpression": {
          const transformedArguments = processGlamorousArgs(path.parent.arguments);
          path.parentPath.replaceWith(t.callExpression(getStyledFn(), transformedArguments));
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
              withJsxPragma,
              getCssFn,
              getCxFn,
              useJsxPragma,
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

        // this object collects all the imports we'll need to add
        let imports = {};

        const getStyledFn = () => {
          if (!imports["@emotion/styled"]) {
            imports["@emotion/styled"] = {
              default: t.importDefaultSpecifier(createUniqueIdentifier("styled")),
            };
          }
          return imports["@emotion/styled"].default.local;
        };

        const getCssFn = () => {
          if (!imports["@emotion/core"]) imports["@emotion/core"] = {};
          // verify whether css export exists here!
          if (!imports["@emotion/core"].css) {
            const specifier = t.importSpecifier(t.identifier("css"), createUniqueIdentifier("css"));
            imports["@emotion/core"].css = specifier;
          }
          return imports["@emotion/core"].css.local;
        };

        const getCxFn = () => {
          if (!imports["@emotion/core"]) imports["@emotion/core"] = {};
          // verify whether css export exists here!
          if (!imports["@emotion/core"].cx) {
            const specifier = t.importSpecifier(t.identifier("cx"), createUniqueIdentifier("cx"));
            imports["@emotion/core"].cx = specifier;
          }
          return imports["@emotion/core"].cx.local;
        };

        const useJsxPragma = () => {
          if (!imports["@emotion/core"]) imports["@emotion/core"] = {};
          if (!imports["@emotion/core"].jsx) {
            t.addComment(path.parent, "leading", "* @jsx jsx ");
            const specifier = t.importSpecifier(t.identifier("jsx"), createUniqueIdentifier("jsx"));
            imports["@emotion/core"].jsx = specifier;
          }
        };

        // only if the default import of glamorous is used, we're gonna apply the transforms
        path.node.specifiers
          .filter(s => t.isImportDefaultSpecifier(s))
          .forEach(s => {
            path.parentPath.traverse(glamorousVisitor, {
              getStyledFn,
              oldName: s.local.name,
              withJsxPragma: !opts.withoutJsxPragma,
              getCssFn,
              getCxFn,
              useJsxPragma,
            });
          });

        /*
        `import {Span, Div as StyledDiv} from "glamorous"`
        will be represented as `importedTags = {"Span": "span", "StyledDiv": "div"}`
        */
        const importedTags = {};

        path.node.specifiers
          .filter(s => t.isImportSpecifier(s))
          .forEach(({imported, local}) => {
            const tagName = imported.name.toLowerCase();
            if (validElementNames.has(tagName)) {
              importedTags[local.name] = tagName;
            }
          });

        // transform corresponding JSXElements if any html element imports were found
        if (Object.keys(importedTags).length) {
          path.parentPath.traverse({
            "JSXOpeningElement|JSXClosingElement": path => {
              const componentIdentifier = path.node.name;
              // exclude MemberEpressions
              if (!t.isJSXIdentifier(componentIdentifier)) return;

              const targetTagName = importedTags[componentIdentifier.name];
              if (!targetTagName) return;

              componentIdentifier.name = targetTagName;
              if (t.isJSXOpeningElement(path)) {
                path.node.attributes = transformJSXAttributes({
                  targetTagName,
                  jsxAttrs: path.node.attributes,
                  withJsxPragma: !opts.withoutJsxPragma,
                  getCssFn,
                  getCxFn,
                  useJsxPragma,
                });
              }
            },
          });
        }

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

        // if we used any emotion imports, we add them before the glamorous import path
        Object.entries(imports).forEach(([lib, libImports]) => {
          path.insertBefore(t.importDeclaration(Object.values(libImports), t.stringLiteral(lib)));
        });

        path.remove();
      },
    },
  };
};
