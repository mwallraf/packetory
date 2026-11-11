import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { PasswordTool } from "./PasswordTool";

const PATH = "/tools/password";

let replaceSpy: ReturnType<typeof vi.spyOn>;

/** Sets the start URL first, then installs a pass-through spy, then mounts. */
function mount(pathAndQuery: string = PATH) {
  window.history.replaceState(null, "", pathAndQuery);
  replaceSpy = vi.spyOn(window.history, "replaceState");
  return render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
}

function text(): string {
  return screen.getByTestId("password-output").textContent ?? "";
}

function search(): string {
  return window.location.search;
}

function setLength(value: string) {
  fireEvent.change(screen.getByTestId("password-length"), {
    target: { value },
  });
}

function setSymbols(value: string) {
  fireEvent.change(screen.getByTestId("password-symbols"), {
    target: { value },
  });
}

async function toggle(key: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`password-set-${key}`));
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", PATH);
});

describe("URL state on mount (POUT-03, D-07, D-13)", () => {
  it("default mount leaves the bare path and a null history state", () => {
    mount();
    expect(window.location.pathname).toBe(PATH);
    expect(search()).toBe("");
    expect(window.history.state).toBeNull();
  });

  it("an options bookmark restores the options and keeps the URL", () => {
    mount("/tools/password?len=32&d=0");
    expect(text()).toHaveLength(32);
    expect(text()).not.toMatch(/[0-9]/);
    expect(search()).toBe("?len=32&d=0");
  });

  it("a hostile URL loads clamped and is rewritten to its canonical form", () => {
    mount(
      "/tools/password?len=999&n=1e9&u=0&l=0&d=0&s=0&sym=%F0%9F%98%80abc&evil=1",
    );
    expect(search()).toBe("?len=128");
    expect(text()).toHaveLength(128);
    expect(screen.queryByTestId("password-error")).toBeNull();
  });

  it("passphrase fields pass through in password mode (D-07)", () => {
    mount("/tools/password?words=8&sep=dot");
    expect(search()).toBe("?words=8&sep=dot");
    expect(screen.getByTestId("password-output")).toBeTruthy();
  });

  it("mode=passphrase is rewritten without mode (RESEARCH Pitfall 7)", () => {
    mount("/tools/password?mode=passphrase");
    expect(search()).toBe("");
    expect(window.location.pathname).toBe(PATH);
  });

  it("the mount rewrite of an already canonical URL is idempotent", () => {
    mount("/tools/password?len=40&u=0");
    expect(search()).toBe("?len=40&u=0");
  });

  it("StrictMode double mount writes the same canonical URL every time", () => {
    mount("/tools/password?len=999");
    expect(replaceSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    for (const call of replaceSpy.mock.calls) {
      expect(call[2]).toBe("/tools/password?len=128");
    }
  });
});

describe("URL state follows every commit (POUT-03, D-13)", () => {
  it("toggle digits, set length, then restore the defaults", async () => {
    mount();
    await toggle("digits");
    expect(search()).toBe("?d=0");
    setLength("64");
    expect(search()).toBe("?len=64&d=0");
    await toggle("digits");
    setLength("20");
    expect(search()).toBe("");
    expect(window.location.pathname).toBe(PATH);
  });

  it("the symbol set is written in first-seen order, percent-encoded", () => {
    mount();
    setSymbols("#!#");
    expect(search()).toBe("?sym=%23%21");
  });

  it("the look-alikes switch writes amb=1", async () => {
    mount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-lookalikes"));
    });
    expect(search()).toBe("?amb=1");
  });

  it("the slider writes the URL on every step", () => {
    mount();
    fireEvent.change(screen.getByTestId("password-length-slider"), {
      target: { value: "50" },
    });
    expect(search()).toBe("?len=50");
  });

  it("an invalid Length draft does not write the URL", () => {
    mount();
    const before = replaceSpy.mock.calls.length;
    setLength("3");
    setLength("");
    setLength("abc");
    expect(replaceSpy.mock.calls.length).toBe(before);
    expect(search()).toBe("");
  });

  it("the address bar equals the serialized options after every handler", async () => {
    mount();
    await toggle("symbols");
    expect(search()).toBe("?s=0");
    await toggle("uppercase");
    expect(search()).toBe("?u=0&s=0");
    setLength("12");
    expect(search()).toBe("?len=12&u=0&s=0");
  });

  it("every replaceState call passes null state and never carries the output", async () => {
    mount();
    await toggle("digits");
    setLength("30");
    setSymbols("!#");
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-regenerate"));
    });
    const shown = text();
    expect(replaceSpy.mock.calls.length).toBeGreaterThan(0);
    for (const call of replaceSpy.mock.calls) {
      expect(call[0]).toBeNull();
      expect(String(call[2])).not.toContain(shown);
      expect(String(call[2])).not.toContain("#!");
      expect(String(call[2])).not.toContain("#");
    }
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain(encodeURIComponent(shown));
  });

  it("history.length is unchanged after several option changes", async () => {
    mount();
    const length = window.history.length;
    await toggle("digits");
    setLength("33");
    setSymbols("!?");
    await toggle("symbols");
    await toggle("symbols");
    expect(window.history.length).toBe(length);
  });

  it("never pushes history", async () => {
    window.history.replaceState(null, "", PATH);
    const push = vi.spyOn(window.history, "pushState");
    mount();
    await toggle("digits");
    setLength("33");
    expect(push).not.toHaveBeenCalled();
  });

  it("CR-01: a throwing replaceState (Safari throttle) never desyncs the output from the options", async () => {
    mount();
    replaceSpy.mockImplementation(() => {
      throw new DOMException("throttled", "SecurityError");
    });
    expect(() => setLength("30")).not.toThrow();
    expect(text()).toHaveLength(30);
    const before = text();
    await toggle("digits");
    expect(text()).toHaveLength(30);
    expect(text()).not.toMatch(/[0-9]/);
    expect(text()).not.toBe(before);
    expect(screen.queryByTestId("password-error")).toBeNull();
  });
});
