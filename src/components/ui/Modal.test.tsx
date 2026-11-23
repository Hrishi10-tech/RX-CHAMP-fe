import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Modal } from "./Modal";

// The dialog moves focus in on the next frame. Held here, so each test decides when it lands.
let frames: FrameRequestCallback[] = [];

function landFrame() {
  const due = frames;
  frames = [];
  act(() => due.forEach((frame) => frame(0)));
}

beforeEach(() => {
  frames = [];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => {
    frames.push(frame);
    return frames.length;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

function renderDialog() {
  render(
    <Modal open onClose={jest.fn()} title="Delete September 2026 screenshots">
      <input aria-label="Reason" data-autofocus />
      <input aria-label="Month" />
    </Modal>,
  );
}

describe("Modal focus", () => {
  it("moves focus into the dialog on the frame after it opens", () => {
    renderDialog();
    expect(screen.getByLabelText("Reason")).not.toHaveFocus();
    landFrame();
    expect(screen.getByLabelText("Reason")).toHaveFocus();
  });

  it("leaves someone in the field they are typing in when that frame is late", async () => {
    const user = userEvent.setup();
    renderDialog();
    const month = screen.getByLabelText("Month");

    await user.click(month);
    await user.keyboard("sept");
    landFrame();
    expect(month).toHaveFocus();
    await user.keyboard("ember");

    expect(month).toHaveValue("september");
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });
});
