import glamorous from "glamorous";

const CommonCase = glamorous.div({
  display: "none",
  content: "",
  fontFamily: '"Arial", Helvetica, sans-serif',
  fontSize: 20
});

const FilterProps = glamorous(Comp, {filterProps: something})(styles);

const FilterSingleProps = glamorous(Comp, {filterProps: ["one"]})(styles);
const FilterManyProps = glamorous(Comp, {filterProps: ["one", "two"]})(styles);

const ForwardSingleProps = glamorous(Comp, {forwardProps: ["one"]})(styles);
const ForwardManyProps = glamorous(Comp, {forwardProps: ["one", "two"]})(styles);

const ForwardAndFilterProps = glamorous(Comp, {forwardProps: ["one"], filterProps: ["two"]})(styles);
