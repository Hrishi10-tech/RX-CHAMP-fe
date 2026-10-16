import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DataTable } from "./DataTable";
import type { Column } from "./types";

interface Person {
  id: string;
  name: string;
  role: string;
  joined: string;
}

const columns: Column<Person>[] = [
  { key: "name", header: "Member" },
  { key: "role", header: "Role" },
  { key: "joined", header: "Joined", align: "right" },
  {
    key: "actions",
    header: "Actions",
    render: (p) => (
      <button type="button" onClick={(e) => e.stopPropagation()}>
        Edit {p.name}
      </button>
    ),
  },
];

const people: Person[] = [
  { id: "1", name: "Priya Sharma", role: "Staff", joined: "Aug 03, 2026" },
  { id: "2", name: "Deepa Nair", role: "Staff", joined: "Jul 21, 2026" },
];

describe("DataTable on a phone", () => {
  it("shows each row as a card: the first column as its heading, the rest labelled", async () => {
    const user = userEvent.setup();
    const open = jest.fn();
    render(<DataTable data={people} columns={columns} getRowKey={(p) => p.id} onRowClick={open} />);

    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const card = within(cards[0]);
    expect(card.getByText("Priya Sharma")).toBeInTheDocument();
    expect(card.getByText("Role")).toBeInTheDocument();
    expect(card.getByText("Aug 03, 2026")).toBeInTheDocument();
    // "Actions" sits beside the heading, not as a labelled line.
    expect(card.queryByText("Actions")).not.toBeInTheDocument();

    await user.click(card.getByRole("button", { name: "Edit Priya Sharma" }));
    expect(open).not.toHaveBeenCalled();
    await user.click(card.getByText("Priya Sharma"));
    expect(open).toHaveBeenCalledWith(people[0], 0);
  });

  it("says so when there is nothing to show", () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No members yet." />);
    expect(screen.getAllByText("No members yet.").length).toBeGreaterThan(0);
  });
});
