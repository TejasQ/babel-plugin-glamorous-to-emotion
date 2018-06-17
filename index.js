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

module.exports = function (babel) {
    const { types: t } = babel;

    return {
        visitor: {
            /**
             * Find all JSX elements that use the old
             * <glamorous.Something> notation and rewrite them to be
             * plain ole somethings.
             */
            JSXElement(path) {
                path.traverse({
                    "JSXOpeningElement|JSXClosingElement"(path) {
                        if (!t.isJSXMemberExpression(path.node.name)) {
                            return;
                        }
                        if (path.node.name.object.name !== "glamorous") {
                            return;
                        }
                        path.node.name = t.identifier(
                            path.node.name.property.name.toLowerCase()
                        );
                    }
                });
            },

            /**
             * Find glamorous import statements, including ThemeProvider
             * imports and rewrite them to be emotion imports.
             */
            ImportDeclaration(path, { opts }) {
                if (path.node.source.value !== "glamorous") {
                    return;
                }

                // First, check for ThemeProvider and update that.
                const themeProviderIndex = path.node.specifiers.findIndex(
                    specifier => specifier.local.name === "ThemeProvider"
                );

                if (~themeProviderIndex) {
                    path.insertAfter(
                        t.importDeclaration(
                            [
                                t.importSpecifier(
                                    t.identifier("ThemeProvider"),
                                    t.identifier("ThemeProvider")
                                )
                            ],
                            t.stringLiteral("emotion-theming")
                        )
                    );
                }

                // Then, replace the whole path with an emotion one!
                path.replaceWith(
                    t.importDeclaration(
                        [t.importDefaultSpecifier(t.identifier("styled"))],
                        t.stringLiteral(opts.preact ? "preact-emotion" : "react-emotion")
                    )
                );
            },

            /**
             * Lastly, find all glamorous.Something() calls
             * and replace them with emotion('something') calls.
             */
            CallExpression(path) {

                /**
                 * First, rewrite all glamorous(Something) calls.
                 */
                if (
                    t.isIdentifier(path.node.callee) &&
                    path.node.callee.name === "glamorous"
                ) {
                    path.node.callee.name = "styled";
                    return;
                }

                /**
                 * Now, rewrite all glamorous.div(someStyle) calls.
                 */
                if (!t.isMemberExpression(path.node.callee)) {
                    return;
                }
                if (path.node.callee.object.name !== "glamorous") {
                    return;
                }
                path.replaceWith(
                    t.callExpression(
                        t.callExpression(t.identifier("styled"), [
                            t.stringLiteral(path.node.callee.property.name)
                        ]),

                        /**
                         * Map over the arguments for an ObjectExpression,
                         * usually the styles, and look for the 'content'
                         * property.
                         */
                        path.node.arguments.map(argument => {
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
                                        value: t.stringLiteral(`"${prop.value.value}"`)
                                    };
                                })
                            };
                        })
                    )
                );
            }
        }
    };
};
