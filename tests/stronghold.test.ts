import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const data = new Map<string, Uint8Array>();

  const store = {
    insert: vi.fn(async (key: string, value: number[]) => {
      data.set(key, Uint8Array.from(value));
    }),
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    remove: vi.fn(async (key: string) => {
      data.delete(key);
    }),
  };

  const client = {
    getStore: vi.fn(() => store),
  };

  const stronghold = {
    loadClient: vi.fn(async () => client),
    createClient: vi.fn(async () => client),
    save: vi.fn(async () => {}),
    unload: vi.fn(async () => {}),
  };

  return {
    appDataDir: vi.fn(async () => "/tmp/incident-workbench"),
    invoke: vi.fn(async () => {}),
    load: vi.fn(async () => stronghold),
    data,
    store,
    client,
    stronghold,
  };
});

vi.mock("@tauri-apps/plugin-stronghold", () => ({
  Stronghold: {
    load: mocks.load,
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: mocks.appDataDir,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

import {
  VaultLockedError,
  deleteCredentials,
  isVaultUnlocked,
  lockVault,
  readCredentials,
  readStatuspageCredentials,
  resetVault,
  saveCredentials,
  saveStatuspageCredentials,
  unlockVault,
} from "../src/utils/stronghold";

describe("stronghold vault lifecycle", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.data.clear();
    mocks.load.mockResolvedValue(mocks.stronghold);
    mocks.stronghold.loadClient.mockResolvedValue(mocks.client);
    mocks.stronghold.createClient.mockResolvedValue(mocks.client);
    await lockVault();
  });

  it("rejects short passphrases", async () => {
    await expect(unlockVault("too-short")).rejects.toThrow(
      "Vault passphrase must be at least 12 characters.",
    );
    expect(isVaultUnlocked()).toBe(false);
  });

  it("unlocks vault and persists save/delete operations", async () => {
    await unlockVault("a secure passphrase");
    expect(isVaultUnlocked()).toBe(true);

    await saveCredentials("jira_api_token", "secret-value");
    expect(mocks.stronghold.save).toHaveBeenCalledTimes(1);
    await expect(readCredentials("jira_api_token")).resolves.toBe(
      "secret-value",
    );

    await deleteCredentials("jira_api_token");
    expect(mocks.stronghold.save).toHaveBeenCalledTimes(2);
    await expect(readCredentials("jira_api_token")).resolves.toBeNull();
  });

  it("falls back to createClient when existing client is missing", async () => {
    mocks.stronghold.loadClient.mockRejectedValueOnce(
      new Error("no client yet"),
    );

    await unlockVault("another secure passphrase");
    expect(mocks.stronghold.createClient).toHaveBeenCalledWith(
      "incident-workbench-vault",
    );
    expect(isVaultUnlocked()).toBe(true);
  });

  it("resets vault and clears in-memory unlock state", async () => {
    await unlockVault("resettable secure passphrase");
    expect(isVaultUnlocked()).toBe(true);

    await resetVault();
    expect(mocks.invoke).toHaveBeenCalledWith("reset_credentials_vault");
    expect(isVaultUnlocked()).toBe(false);
  });

  it("throws when reading credentials from a locked vault", async () => {
    await expect(readCredentials("slack_bot_token")).rejects.toBeInstanceOf(
      VaultLockedError,
    );
  });

  it("saves and reads Statuspage credentials from Stronghold", async () => {
    await unlockVault("statuspage secure passphrase");

    await expect(readStatuspageCredentials()).resolves.toBeNull();

    await saveStatuspageCredentials("page-123", "statuspage-secret");

    await expect(readStatuspageCredentials()).resolves.toEqual({
      pageId: "page-123",
      apiKey: "statuspage-secret",
    });
  });
});
