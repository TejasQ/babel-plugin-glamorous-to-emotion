# 💄 glamorous  → 👩‍🎤 emotion
This codemod was created to help migrate an existing React or Preact codebase from [glamorous](https://github.com/paypal/glamorous) to [emotion](https://github.com/emotion-js/emotion) in light of [this issue](https://github.com/paypal/glamorous/issues/419) on glamorous.

[Here's a demo](https://astexplorer.net/#/gist/7bc4771564a12c9f93c4904b3934aa1c/latest) of the codemod in action. The upper-left quadrant is glamorous code, the lower-right quadrant is the transformed code.

## Features
This codemod follows the [glamorous to emotion migration guide](https://github.com/paypal/glamorous/blob/master/other/EMOTION_MIGRATION.md) on the glamorous repo. Particularly, it rewrites the following:

- ✅ All import statements, including ThemeProvider inclusion.
- ✅ All glamorous function calls to emotion function calls.
- ✅ The content property to be emotion friendly.

## Usage
You'll need to use [`babel-codemod`](https://github.com/square/babel-codemod) to apply this codemod to your existing codebase. It should be pretty straightforward:

- First, install this plugin: `yarn add babel-plugin-glamorous-to-emotion -D`

- Then run it: `npx babel-codemod --plugin glamorous-to-emotion "src/**/*.js"` or a similar variation depending on your directory structure.

This will put you fully in emotion-land.

## Contributing
I sincerely hope it helps you migrate your codebase! Please open issues for areas where it doesn't quite help and we'll sort it out.

## Acknowledgements
The following people are awesome for their open source work and should be acknowledged as such.

- [@tkh44](https://github.com/tkh44) for writing emotion.
- [@kentcdodds](https://github.com/kentcdodds) for writing glamorous.
- [@cbhoweth](https://github.com/cbhoweth), [@coldpour](https://github.com/coldpour), [@mitchellhamilton](https://github.com/mitchellhamilton), [@roystons](https://github.com/roystons) for writing the migration guide.
- [@jamiebuilds](https://github.com/jamiebuilds) for an incredible [Babel handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/README.md).