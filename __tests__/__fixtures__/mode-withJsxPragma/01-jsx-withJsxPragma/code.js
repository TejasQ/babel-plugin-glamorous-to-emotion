import g, {Div, Span as StyledSpan} from "glamorous";

const GDot1 = props => <g.Span {...props}>Hi, I’m a Span!</g.Span>;
const GDot2 = props => <g.Div css={{marginTop: 5}}/>;
const GDot3 = props => <g.Div marginTop={5}/>;
const GDot4 = props => <g.Div marginTop={5} css={{marginTop: 10}} marginBottom="5" onClick={handler}/>;
const GDot5 = props => <g.Img width={100}/>;
const GDot6 = props => <g.Span width={100}/>;
const GDot7 = props => <g.Span css={redStyles} marginLeft={5}/>;
const GDot8 = props => <g.Span css={redStyles} className="my-class"/>;
const GDot9 = props => <g.Span css={styles} {...props}/>;
const GDot10 = props => <g.Span {...props} css={styles}/>;
const GDot11 = props => <g.Span marginTop={5} {...props}/>;
const GDot12 = props => <g.Div marginTop={5} innerRef={handler}/>;
const GDot13 = props => <Div marginTop={5}/>;
const GDot14 = props => <StyledSpan marginTop={5}>content</StyledSpan>;
const GDot15 = props => <other.StyledSpan marginTop={5}/>;
const GDot16 = props => <g.Div key="key" css={{marginTop: 5}}/>;
