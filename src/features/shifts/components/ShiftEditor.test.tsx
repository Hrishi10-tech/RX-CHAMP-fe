import { render, screen } from "@testing-library/react";

import { ShiftEditor } from "@/features/shifts/components/ShiftEditor";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/features/shifts/hooks/useShifts", () => ({
  useShift: () => ({ data: undefined, isLoading: false, isError: false }),
  useShiftValidation: () => ({ data: undefined, isLoading: false, isFetching: false }),
  useSaveShift: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe("ShiftEditor (brief 1.2: no sound)", () => {
  it("has no box for a sound, and keeps the other rule boxes", () => {
    render(<ShiftEditor />);
    expect(screen.queryByText(/sound/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Ask for a reason when a break starts early/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ask for a reason when a break starts late/)).toBeInTheDocument();
  });
});
