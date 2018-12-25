const GDot1 = props => <span {...props}>Hi, I’m a Span!</span>;

const GDot2 = props => <div css={{
  marginTop: 5
}} />;

const GDot3 = props => <div css={{
  marginTop: 5
}} />;

const GDot4 = props => <div css={{
  marginTop: 10,
  marginTop: 5,
  marginBottom: "5"
}} onClick={handler} />;

const GDot5 = props => <img width={100} />;

const GDot6 = props => <span css={{
  width: 100
}} />;

const GDot7 = props => <span css={{ ...redStyles,
  marginLeft: 5
}} />;

const GDot8 = props => <span css={redStyles} className="my-class" />;

const GDot9 = props => <span css={styles} {...props} />;

const GDot10 = props => <span {...props} css={styles} />;

const GDot11 = props => <span {...props} css={{
  marginTop: 5
}} />;

const GDot12 = props => <div ref={handler} css={{
  marginTop: 5
}} />;

const GDot13 = props => <div css={{
  marginTop: 5
}} />;

const GDot14 = props => <span css={{
  marginTop: 5
}}>content</span>;

const GDot15 = props => <other.StyledSpan marginTop={5} />;
