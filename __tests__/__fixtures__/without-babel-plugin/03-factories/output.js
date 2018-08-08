import styled from "react-emotion";
const CommonCase = styled("div")({
  display: "none",
  content: "\"\"",
  fontFamily: '"Arial", Helvetica, sans-serif',
  fontSize: 20
});
const FilterProps = styled(Comp, {
  shouldForwardProp: prop => something.indexOf(prop) === -1
})(styles);
const FilterSingleProps = styled(Comp, {
  shouldForwardProp: prop => prop !== "one"
})(styles);
const FilterManyProps = styled(Comp, {
  shouldForwardProp: prop => ["one", "two"].indexOf(prop) === -1
})(styles);
const ForwardSingleProps = styled(Comp, {
  shouldForwardProp: prop => prop === "one"
})(styles);
const ForwardManyProps = styled(Comp, {
  shouldForwardProp: prop => ["one", "two"].indexOf(prop) > -1
})(styles);
const ForwardAndFilterProps = styled(Comp, {
  shouldForwardProp: prop => prop === "one" && prop !== "two"
})(styles);
