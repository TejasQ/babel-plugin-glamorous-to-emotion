import { css, cx } from "react-emotion";

const GDot1 = props => <span {...props}>Hi, I'm a Span!</span>;

const GDot2 = props => <div className={css({
  marginTop: 5
})} />;

const GDot3 = props => <div className={css({
  marginTop: 5
})} />;

const GDot4 = props => <div onClick={handler} className={css({
  marginTop: 10,
  marginTop: 5,
  marginBottom: "5"
})} />;

const GDot5 = props => <img width={100} />;

const GDot6 = props => <span className={css({
  width: 100
})} />;

const GDot7 = props => <span className={css({ ...redStyles,
  marginLeft: 5
})} />;

const GDot8 = props => <span className={cx("my-class", redStyles)} />;

const GDot9 = props => <span {...props} className={cx(props.className, styles)} />;

const GDot10 = props => <span {...props} className={cx(props.className, styles)} />;

const GDot11 = props => <span {...props} className={cx(props.className, {
  marginTop: 5
})} />;
