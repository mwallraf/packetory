import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { loadWordlist } from "@/lib/password/wordlist";
import { PasswordTool } from "./PasswordTool";
import { reloadPage } from "./reload";

vi.mock("@/lib/password/wordlist", () => ({ loadWordlist: vi.fn() }));
vi.mock("./reload", () => ({ reloadPage: vi.fn() }));

const PATH = "/tools/password";

/** Exactly 7,776 distinct, letters-only lowercase words (the generator refuses any other length). */
function fixtureList(length = 7776): string[] {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const words: string[] = [];
  for (let i = 0; i < length; i++) {
    let n = i;
    let w = "";
    do {
      w = letters[n % 26]! + w;
      n = Math.floor(n / 26);
    } while (n > 0);
    words.push(`w${w}`.replace(/^w/, "x"));
  }
  return words;
}

type Deferred = {
  promise: Promise<readonly string[]>;
  resolve: (list: readonly string[]) => void;
  reject: (e: unknown) => void;
};

function deferred(): Deferred {
  let resolve!: Deferred["resolve"];
  let reject!: Deferred["reject"];
  const promise = new Promise<readonly string[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const loader = vi.mocked(loadWordlist);
let pending: Deferred[] = [];

/** Every loader call returns a fresh deferred the test settles on demand. */
function useDeferredLoader() {
  pending = [];
  loader.mockImplementation(() => {
    const d = deferred();
    pending.push(d);
    return d.promise;
  });
}

function mount(pathAndQuery: string = PATH) {
  window.history.replaceState(null, "", pathAndQuery);
  return render(
    <StrictMode>
      <PasswordTool />
    </StrictMode>,
  );
}

/** Lets the deferred mount-load start and the live-region timers fire. */
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

async function settle(d: Deferred | undefined, list: readonly string[]) {
  await act(async () => {
    d!.resolve(list);
    await d!.promise;
  });
  await flush();
}

async function fail(d: Deferred | undefined, e: unknown) {
  await act(async () => {
    d!.reject(e);
    await d!.promise.catch(() => undefined);
  });
  await flush();
}

function status(): string {
  return screen.getByTestId("password-status").textContent ?? "";
}

function search(): string {
  return window.location.search;
}

async function choose(mode: "password" | "passphrase") {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`password-mode-${mode}`));
  });
}

function zoneChildren(): number {
  return screen.getByTestId("password-output-zone").children.length;
}

beforeEach(() => {
  useDeferredLoader();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  loader.mockReset();
  window.history.replaceState(null, "", PATH);
});

describe("passphrase bookmark on mount (PHR-01, D-03, D-05)", () => {
  it("shows the loading block, then a 6-word hero; the search stays ?mode=passphrase", async () => {
    mount("/tools/password?mode=passphrase");
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    expect(screen.queryByTestId("password-output")).toBeNull();
    await flush();
    await settle(pending[0], fixtureList());
    const value = screen.getByTestId("password-output").textContent ?? "";
    expect(value.split("-")).toHaveLength(6);
    expect(search()).toBe("?mode=passphrase");
    expect(zoneChildren()).toBe(1);
  });

  it("a bookmark with options keeps them canonical and applies them", async () => {
    mount("/tools/password?mode=passphrase&words=8&sep=dot");
    await flush();
    await settle(pending[0], fixtureList());
    const value = screen.getByTestId("password-output").textContent ?? "";
    expect(value.split(".")).toHaveLength(8);
    expect(search()).toBe("?mode=passphrase&words=8&sep=dot");
  });

  it("StrictMode applies exactly one result, awaits one load and announces in order", async () => {
    mount("/tools/password?mode=passphrase");
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(status()).toBe("Loading word list");
    await settle(pending[0], fixtureList());
    expect(status()).toBe("Word list loaded. New passphrase generated");
    expect(screen.getAllByTestId("password-output")).toHaveLength(1);
  });

  it("the initializer has no side effects: nothing loads before the mount tick", () => {
    mount("/tools/password?mode=passphrase");
    expect(loader).not.toHaveBeenCalled();
  });

  it("a plain password mount never loads the list", async () => {
    mount();
    await flush();
    expect(loader).not.toHaveBeenCalled();
    expect(screen.getByTestId("password-output")).toBeTruthy();
  });
});

describe("sequence token (PHR-01, PHR-03; D-04)", () => {
  it("switching back to Password before the list resolves applies nothing", async () => {
    mount();
    await choose("passphrase");
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    await choose("password");
    const before = screen.getByTestId("password-output").textContent ?? "";
    await settle(pending[0], fixtureList());
    expect(screen.getByTestId("password-output").textContent).toBe(before);
    expect(before).toHaveLength(20);
    expect(status()).not.toBe("Word list loaded. New passphrase generated");
    expect(zoneChildren()).toBe(1);
  });

  it("a load started under older options applies nothing; the latest options win", async () => {
    mount();
    await choose("passphrase");
    expect(pending).toHaveLength(1);
    await act(async () => {
      fireEvent.change(screen.getByTestId("password-batch-count"), {
        target: { value: "3" },
      });
    });
    expect(pending).toHaveLength(2);
    await settle(pending[0], fixtureList());
    // The stale continuation applied nothing: still loading.
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    await settle(pending[1], fixtureList());
    expect(screen.getAllByTestId("password-row")).toHaveLength(3);
    for (const row of screen.getAllByTestId("password-row-value")) {
      expect((row.textContent ?? "").split("-")).toHaveLength(6);
    }
  });

  it("unmounting before the load settles causes no state update", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = mount();
    await choose("passphrase");
    view.unmount();
    await settle(pending[0], fixtureList());
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("a stale rejection after a mode change shows no error panel", async () => {
    mount();
    await choose("passphrase");
    await choose("password");
    await fail(pending[0], new Error("late"));
    expect(screen.queryByTestId("password-wordlist-error")).toBeNull();
    expect(screen.getByTestId("password-output")).toBeTruthy();
  });

  it("a list that is not 7,776 words fails closed with the unexpected panel", async () => {
    mount();
    await choose("passphrase");
    await settle(pending[0], fixtureList(7775));
    expect(screen.getByTestId("password-error")).toBeTruthy();
    expect(screen.queryByTestId("password-output")).toBeNull();
    expect(screen.queryByTestId("password-copy")).toBeNull();
    expect(screen.queryByTestId("password-copy-all")).toBeNull();
    expect(zoneChildren()).toBe(1);
  });

  it("the output zone always holds exactly one block across the state matrix", async () => {
    mount("/tools/password?mode=passphrase");
    await flush();
    expect(zoneChildren()).toBe(1);
    await fail(pending[0], new Error("net"));
    expect(screen.getByTestId("password-wordlist-error")).toBeTruthy();
    expect(zoneChildren()).toBe(1);
  });
});

const D04_SENTENCE = "Couldn't load the word list, so no passphrase was generated.";
const D04_NEXT_STEP = "Check your connection and try again.";

function chunkError(): Error {
  const e = new Error("Loading chunk failed");
  e.name = "ChunkLoadError";
  return e;
}

async function failedMount() {
  mount("/tools/password?mode=passphrase");
  await flush();
  await fail(pending[0], new Error("network down"));
}

describe("word-list error and Retry (PHR-03, D-04)", () => {
  it("a plain failure shows the D-04 copy and Retry, and no controls or value", async () => {
    await failedMount();
    const panel = screen.getByTestId("password-wordlist-error");
    const alert = panel.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain(D04_SENTENCE);
    expect(alert.textContent).toContain(D04_NEXT_STEP);
    const retry = screen.getByTestId("password-wordlist-retry");
    expect(retry.textContent).toBe("Retry");
    expect(alert.contains(retry)).toBe(false);
    expect(screen.queryByTestId("password-output")).toBeNull();
    expect(screen.queryByTestId("password-copy")).toBeNull();
    expect(screen.queryByTestId("password-copy-all")).toBeNull();
    expect(screen.queryByTestId("password-regenerate")).toBeNull();
  });

  it("Retry after a plain failure loads again and recovers", async () => {
    await failedMount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-wordlist-retry"));
    });
    expect(screen.getByTestId("password-wordlist-loading")).toBeTruthy();
    expect(screen.queryByTestId("password-wordlist-error")).toBeNull();
    await flush();
    expect(status()).toBe("Loading word list");
    expect(loader).toHaveBeenCalledTimes(2);
    await settle(pending[1], fixtureList());
    const value = screen.getByTestId("password-output").textContent ?? "";
    expect(value.split("-")).toHaveLength(6);
    expect(status()).toBe("Word list loaded. New passphrase generated");
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("a second failure shows the same error panel again", async () => {
    await failedMount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-wordlist-retry"));
    });
    await fail(pending[1], new Error("still down"));
    const panel = screen.getByTestId("password-wordlist-error");
    expect(panel.textContent).toContain(D04_SENTENCE);
    expect(screen.getByTestId("password-wordlist-retry")).toBeTruthy();
    expect(zoneChildren()).toBe(1);
  });

  it("a ChunkLoadError makes Retry reload the page and not call the loader", async () => {
    mount("/tools/password?mode=passphrase");
    await flush();
    await fail(pending[0], chunkError());
    await act(async () => {
      fireEvent.click(screen.getByTestId("password-wordlist-retry"));
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("Enter while the error panel shows neither loads nor announces", async () => {
    await failedMount();
    const before = status();
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(status()).toBe(before);
    expect(screen.getByTestId("password-wordlist-error")).toBeTruthy();
  });
});
