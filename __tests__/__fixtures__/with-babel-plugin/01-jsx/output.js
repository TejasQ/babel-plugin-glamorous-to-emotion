const GDot1 = props => <span {...props}>Hi, I'm a Span!</span>;

const GDot2 = props => <div css={{
  marginTop: 5
}} />;

const GDot3 = props => <div css={{
  marginTop: 5
}} />;

const GDot4 = props => <div onClick={handler} css={{
  marginTop: 10,
  marginTop: 5,
  marginBottom: "5"
}} />;

const GDot5 = props => <img width={100} />;

const GDot6 = props => <span css={{
  width: 100
}} />;

const GDot7 = props => <span css={{ ...redStyles,
  marginLeft: 5
}} />;

const GDot8 = props => <span className="my-class" css={redStyles} />;
