import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DepartmentIconPicker } from "./DepartmentIconPicker";
import { validateDepartmentName } from "./DepartmentDialog";
import {
  DEPARTMENT_ICON_KEYS,
  ICON_THEMES,
  departmentIcon,
  nameSuggestions,
  suggestIcon,
} from "@/features/departments/lib/icons";

function Harness({ onChange }: { onChange: (key: string) => void }) {
  const [value, setValue] = useState("briefcase");
  return (
    <DepartmentIconPicker
      value={value}
      onChange={(k) => {
        setValue(k);
        onChange(k);
      }}
    />
  );
}

describe("the themed icon set (SPEC 7.6)", () => {
  it("has the forty keys, each in exactly one theme", () => {
    expect(DEPARTMENT_ICON_KEYS).toHaveLength(40);
    const themed = ICON_THEMES.flatMap((t) => t.keys);
    expect([...themed].sort()).toEqual([...DEPARTMENT_ICON_KEYS].sort());
    expect(new Set(themed).size).toBe(themed.length);
  });

  it("draws the briefcase for an unknown key", () => {
    expect(departmentIcon("nope")).toBe(departmentIcon("briefcase"));
    expect(departmentIcon("code")).not.toBe(departmentIcon("briefcase"));
  });

  it("suggests an icon from the name", () => {
    expect(suggestIcon("Hardware")).toBe("circuit-board");
    expect(suggestIcon("Software Engineering")).toBe("code");
    expect(suggestIcon("Sales")).toBe("bar-chart");
    expect(suggestIcon("Regulatory Affairs")).toBe("scale");
    expect(suggestIcon("Kitchen")).toBe("briefcase");
  });

  it("offers name suggestions not yet taken", () => {
    const names = nameSuggestions("ha", ["Hardware"]).map((s) => s.name);
    expect(names).not.toContain("Hardware");
    expect(nameSuggestions("", [], 3)).toHaveLength(3);
  });

  it("checks names like the server: 1-60 characters, unique ignoring case and spacing", () => {
    expect(validateDepartmentName(" ", [])).toMatch(/name/);
    expect(validateDepartmentName("x".repeat(61), [])).toMatch(/60/);
    expect(validateDepartmentName("Quality  assurance", ["quality Assurance"])).toMatch(/already/);
    expect(validateDepartmentName("Hardware", ["Sales"])).toBeNull();
  });
});

describe("DepartmentIconPicker", () => {
  it("is one radio group with the chosen icon checked", () => {
    render(<Harness onChange={jest.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Icon" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(40);
    expect(screen.getByRole("radio", { name: "Briefcase" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Briefcase" })).toHaveAttribute("tabindex", "0");
  });

  it("picks an icon with a click", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Microscope" }));
    expect(onChange).toHaveBeenCalledWith("microscope");
    expect(screen.getByRole("radio", { name: "Microscope" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Briefcase" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("moves with the arrow keys", async () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole("radio", { name: "Code" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("cpu");
    expect(screen.getByRole("radio", { name: "Chip" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith(ICON_THEMES.at(-1)?.keys.at(-1));
  });
});
