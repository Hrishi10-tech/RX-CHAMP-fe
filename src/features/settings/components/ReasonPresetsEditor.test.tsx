import { fireEvent, render, screen } from "@testing-library/react";

import { KindCard } from "./ReasonPresetsEditor";

function setup() {
  const onChange = jest.fn();
  render(
    <KindCard
      kind={"LATE_START" as never}
      label="Late start of the day"
      asked="Why are you starting late?"
      value={["Traffic"]}
      saved={["Traffic"]}
      limits={{ perKind: 12, textMax: 80 }}
      disabled={false}
      onChange={onChange}
      onReset={() => {}}
    />,
  );
  const box = screen.getByPlaceholderText("Add a quick answer");
  fireEvent.change(box, { target: { value: "病院" } });
  return { onChange, box };
}

// M-1 (guide ime-safe-enter-submit): Enter that confirms an IME composition does not add the answer.
describe("Quick answers: Enter and an IME", () => {
  it("does not add while a composition is being confirmed", () => {
    const { onChange, box } = setup();
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    fireEvent.keyDown(box, { key: "Enter", keyCode: 229 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("adds on a plain Enter", () => {
    const { onChange, box } = setup();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["Traffic", "病院"]);
  });
});
