import { api } from "@fns/api";
import { trackEvent } from "@aptabase/web";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export async function requestSignInLink(email: string): Promise<boolean> {
  const [status, response] = await api.fetch("POST", "/_auth/signin", {
    email,
  });

  if (status === 404) return false;
  if (status === 200) return true;

  await api.handleError(status, response);
  return false;
}

export async function requestRegisterLink(name: string, email: string): Promise<void> {
  await api.post("/_auth/register", { name, email });
  trackEvent("register");
}

export async function me(): Promise<UserAccount | null> {
  const [status, account] = await api.fetch("GET", "/_auth/me");

  if (status === 401) return null;

  return account.json() as Promise<UserAccount | null>;
}

export async function signOut(): Promise<void> {
  await api.fetch("POST", "/_auth/signout");
  location.href = "/auth";
}

export async function isPasswordLoginEnabled(): Promise<boolean> {
  const [status, response] = await api.fetch("GET", "/_auth/password-login-enabled");
  if (status === 200) {
    const data = await response.json();
    return data.enabled === true;
  }
  return false;
}

export async function passwordLogin(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const [status, response] = await api.fetch("POST", "/_auth/password-login", {
    email,
    password,
  });

  if (status === 200) {
    return { success: true };
  }

  if (status === 401) {
    return { success: false, message: "Invalid email or password" };
  }

  if (status === 404) {
    return { success: false, message: "Password login is not enabled" };
  }

  return { success: false, message: "Login failed" };
}
