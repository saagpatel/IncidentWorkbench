/**
 * Wrapper around Tauri Stronghold for credential storage
 */

import { Client, Stronghold } from "@tauri-apps/plugin-stronghold";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";

let strongholdClient: Client | null = null;
let strongholdInstance: Stronghold | null = null;

const VAULT_NAME = "incident-workbench-vault";
const RECORD_PATH = "credentials";
const STRONGHOLD_FILENAME = "credentials.stronghold";

export class VaultLockedError extends Error {
  constructor() {
    super("Credentials vault is locked");
    this.name = "VaultLockedError";
  }
}

async function getStrongholdPath(): Promise<string> {
  const appDir = await appDataDir();
  return `${appDir}/${STRONGHOLD_FILENAME}`;
}

async function loadOrCreateClient(stronghold: Stronghold): Promise<Client> {
  try {
    return await stronghold.loadClient(VAULT_NAME);
  } catch {
    return await stronghold.createClient(VAULT_NAME);
  }
}

async function persistStronghold(): Promise<void> {
  if (!strongholdInstance) {
    throw new VaultLockedError();
  }
  await strongholdInstance.save();
}

/**
 * Return whether the credentials vault has been unlocked in this session.
 */
export function isVaultUnlocked(): boolean {
  return strongholdClient !== null;
}

/**
 * Unlock the credentials vault with a user-provided passphrase.
 */
export async function unlockVault(passphrase: string): Promise<void> {
  const normalized = passphrase.trim();
  if (normalized.length < 12) {
    throw new Error("Vault passphrase must be at least 12 characters.");
  }

  const strongholdPath = await getStrongholdPath();

  try {
    const stronghold = await Stronghold.load(strongholdPath, normalized);
    const client = await loadOrCreateClient(stronghold);

    strongholdInstance = stronghold;
    strongholdClient = client;
  } catch (error) {
    await lockVault();
    console.error("Failed to unlock Stronghold vault:", error);
    throw new Error(
      "Failed to unlock credentials vault. Check your passphrase or reset the vault.",
    );
  }
}

/**
 * Lock and unload the credentials vault from memory.
 */
export async function lockVault(): Promise<void> {
  if (strongholdInstance) {
    try {
      await strongholdInstance.unload();
    } catch (error) {
      console.error("Failed to unload Stronghold instance:", error);
    }
  }
  strongholdClient = null;
  strongholdInstance = null;
}

/**
 * Reset (delete) the credentials vault file.
 */
export async function resetVault(): Promise<void> {
  await lockVault();
  await invoke("reset_credentials_vault");
}

/**
 * Get the unlocked Stronghold client.
 */
async function getStrongholdClient(): Promise<Client> {
  if (strongholdClient) {
    return strongholdClient;
  }
  throw new VaultLockedError();
}

/**
 * Save credentials to Stronghold
 */
export async function saveCredentials(
  key: string,
  value: string,
): Promise<void> {
  const client = await getStrongholdClient();
  const store = client.getStore();

  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  await store.insert(`${RECORD_PATH}/${key}`, Array.from(encoded));
  await persistStronghold();
}

/**
 * Read credentials from Stronghold
 */
export async function readCredentials(key: string): Promise<string | null> {
  try {
    const client = await getStrongholdClient();
    const store = client.getStore();

    const data = await store.get(`${RECORD_PATH}/${key}`);
    if (!data) {
      // Not found is expected for new keys, return null without error
      return null;
    }

    const decoder = new TextDecoder();
    try {
      return decoder.decode(data);
    } catch (decodeError) {
      console.error(`Failed to decode credential '${key}':`, decodeError);
      throw new Error(`Credential decode error for '${key}': ${decodeError}`);
    }
  } catch (error) {
    if (error instanceof VaultLockedError) {
      throw error;
    }
    // Distinguish between "not found" (which is fine) and actual errors
    if (
      error instanceof Error &&
      error.message.includes("Credential decode error")
    ) {
      throw error;
    }
    console.error("Failed to read credentials:", error);
    return null;
  }
}

/**
 * Delete credentials from Stronghold
 */
export async function deleteCredentials(key: string): Promise<void> {
  const client = await getStrongholdClient();
  const store = client.getStore();

  await store.remove(`${RECORD_PATH}/${key}`);
  await persistStronghold();
}

/**
 * Save Jira credentials
 */
export async function saveJiraCredentials(
  url: string,
  email: string,
  apiToken: string,
): Promise<void> {
  await saveCredentials("jira_url", url);
  await saveCredentials("jira_email", email);
  await saveCredentials("jira_api_token", apiToken);
}

/**
 * Read Jira credentials
 */
export async function readJiraCredentials(): Promise<{
  url: string;
  email: string;
  apiToken: string;
} | null> {
  const url = await readCredentials("jira_url");
  const email = await readCredentials("jira_email");
  const apiToken = await readCredentials("jira_api_token");

  if (!url || !email || !apiToken) {
    return null;
  }

  return { url, email, apiToken };
}

/**
 * Save Slack credentials
 */
export async function saveSlackCredentials(
  botToken: string,
  userToken?: string,
): Promise<void> {
  await saveCredentials("slack_bot_token", botToken);
  if (userToken) {
    await saveCredentials("slack_user_token", userToken);
  }
}

/**
 * Read Slack credentials
 */
export async function readSlackCredentials(): Promise<{
  botToken: string;
  userToken?: string;
} | null> {
  const botToken = await readCredentials("slack_bot_token");
  if (!botToken) {
    return null;
  }

  const userToken = await readCredentials("slack_user_token");

  return {
    botToken,
    userToken: userToken || undefined,
  };
}

/**
 * Save Statuspage credentials
 */
export async function saveStatuspageCredentials(
  pageId: string,
  apiKey: string,
): Promise<void> {
  await saveCredentials("statuspage_page_id", pageId);
  await saveCredentials("statuspage_api_key", apiKey);
}

/**
 * Read Statuspage credentials
 */
export async function readStatuspageCredentials(): Promise<{
  pageId: string;
  apiKey: string;
} | null> {
  const pageId = await readCredentials("statuspage_page_id");
  const apiKey = await readCredentials("statuspage_api_key");

  if (!pageId || !apiKey) {
    return null;
  }

  return { pageId, apiKey };
}

/**
 * Save Zendesk credentials
 */
export async function saveZendeskCredentials(
  url: string,
  email: string,
  apiToken: string,
): Promise<void> {
  await saveCredentials("zendesk_url", url);
  await saveCredentials("zendesk_email", email);
  await saveCredentials("zendesk_api_token", apiToken);
}

/**
 * Read Zendesk credentials
 */
export async function readZendeskCredentials(): Promise<{
  url: string;
  email: string;
  apiToken: string;
} | null> {
  const url = await readCredentials("zendesk_url");
  const email = await readCredentials("zendesk_email");
  const apiToken = await readCredentials("zendesk_api_token");

  if (!url || !email || !apiToken) {
    return null;
  }

  return { url, email, apiToken };
}
