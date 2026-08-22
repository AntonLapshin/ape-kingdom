import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Showcase } from "../../src/ui/components/Showcase";
import { toShowcaseView } from "../../src/ui/viewModels/useShowcase";
import type { ShowcaseRegistry } from "../../src/core/showcase";

/** A minimal, valid registry used across tests. */
function sampleRegistry(): ShowcaseRegistry {
  return [
    { name: "Button", showcases: { Primary: () => null, Secondary: () => null } },
    { name: "Panel", showcases: { Basic: () => null, WithFooter: () => null } },
  ];
}

/** Build a view with nothing selected. */
function emptyView() {
  return toShowcaseView(
    { file: null, showcase: null, expanded: new Set() },
    sampleRegistry(),
  );
}

describe("Showcase component", () => {
  it("renders a collapsible sidebar with every file", () => {
    render(
      <Showcase view={emptyView()} onSelect={vi.fn()} onToggleFile={vi.fn()} />,
    );
    expect(screen.getByTestId("showcase")).toBeInTheDocument();
    expect(screen.getByTestId("showcase-sidebar")).toBeInTheDocument();
    expect(screen.getAllByTestId("showcase-file")).toHaveLength(2);
    expect(screen.getByText("Button")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });

  it("shows no canvas content until a showcase is selected", () => {
    render(
      <Showcase view={emptyView()} onSelect={vi.fn()} onToggleFile={vi.fn()} />,
    );
    expect(screen.getByTestId("showcase-canvas")).toBeInTheDocument();
    expect(screen.queryByTestId("showcase-render")).toBeNull();
    expect(screen.getByText(/Select a showcase/)).toBeInTheDocument();
  });

  it("expands a file to reveal its showcases when toggled", () => {
    const onToggle = vi.fn();
    render(
      <Showcase view={emptyView()} onSelect={vi.fn()} onToggleFile={onToggle} />,
    );
    fireEvent.click(screen.getByText("Button"));
    expect(onToggle).toHaveBeenCalledWith("Button");
  });

  it("renders the showcases of an expanded file and selects one", () => {
    const view = toShowcaseView(
      { file: null, showcase: null, expanded: new Set(["Button"]) },
      sampleRegistry(),
    );
    const onSelect = vi.fn();
    render(<Showcase view={view} onSelect={onSelect} onToggleFile={vi.fn()} />);
    // Both showcases of the expanded Button file are visible.
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Secondary"));
    expect(onSelect).toHaveBeenCalledWith("Button", "Secondary");
  });

  it("renders the selected showcase render in the canvas", () => {
    const chipRender = () => <div data-testid="demo-chip">Chip demo</div>;
    const registry: ShowcaseRegistry = [
      { name: "Chip", showcases: { Active: chipRender } },
    ];
    const view = toShowcaseView(
      { file: "Chip", showcase: "Active", expanded: new Set(["Chip"]) },
      registry,
    );
    render(<Showcase view={view} onSelect={vi.fn()} onToggleFile={vi.fn()} />);
    expect(screen.getByTestId("showcase-render")).toBeInTheDocument();
    expect(screen.getByTestId("demo-chip")).toBeInTheDocument();
    expect(screen.getByText("Chip demo")).toBeInTheDocument();
  });

  it("highlights the selected showcase entry", () => {
    const view = toShowcaseView(
      { file: "Panel", showcase: "Basic", expanded: new Set(["Panel"]) },
      sampleRegistry(),
    );
    render(<Showcase view={view} onSelect={vi.fn()} onToggleFile={vi.fn()} />);
    const basic = screen.getByText("Basic");
    expect(basic.className).toContain("accent");
  });
});
