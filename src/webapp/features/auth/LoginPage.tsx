import { requestSignInLink, isPasswordLoginEnabled, passwordLogin } from "@features/auth";
import { Page } from "@components/Page";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DataResidency } from "./DataResidency";
import { LegalNotice } from "./LegalNotice";
import { RegionSwitch } from "./RegionSwitch";
import { SignInWithGitHub } from "./SignInWithGitHub";
import { SignInWithGoogle } from "./SignInWithGoogle";
import { isOAuthEnabled } from "@features/env";
import { Logo } from "./Logo";
import { Button } from "@components/Button";
import { TextInput } from "@components/TextInput";

type FormStatus = "idle" | "loading" | "success" | "notfound";
type PasswordFormStatus = "idle" | "loading" | "error";

type StatusMessageProps = {
  status: FormStatus;
};

const SignUpMessage = () => (
  <span className="block">
    Don't have an account?{" "}
    <Link className="font-semibold text-foreground" to="/auth/register">
      Sign up
    </Link>{" "}
    for free.
  </span>
);

const StatusMessage = (props: StatusMessageProps) => {
  if (props.status === "success") {
    return <span className="text-success">Woo-hoo! Email sent, go check your inbox!</span>;
  }

  if (props.status === "notfound") {
    return (
      <>
        <span className="text-destructive">Could not find an account with that email.</span>
        <SignUpMessage />
      </>
    );
  }

  return <SignUpMessage />;
};

const RedirectErrorMessage = () => {
  const [params] = useSearchParams();

  const error = params.get("error");
  if (!error) {
    return null;
  }
  const message = error === "expired" ? "This link has expired." : "This link is invalid.";

  return (
    <p className="mx-auto text-center mb-10 text-destructive text-sm">
      {message} Please request a new one.
    </p>
  );
};

Component.displayName = "LoginPage";
export function Component() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [passwordStatus, setPasswordStatus] = useState<PasswordFormStatus>("idle");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(false);
  const [loginMode, setLoginMode] = useState<"magic" | "password">("magic");

  useEffect(() => {
    isPasswordLoginEnabled().then(setPasswordLoginEnabled);
  }, []);

  const handleMagicLinkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");

    const found = await requestSignInLink(email);
    setStatus(found ? "success" : "notfound");
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatus("loading");
    setPasswordError("");

    const result = await passwordLogin(email, password);
    if (result.success) {
      window.location.href = "/";
    } else {
      setPasswordStatus("error");
      setPasswordError(result.message || "Login failed");
    }
  };

  return (
    <Page title="Login">
      <div className="mx-auto text-center mb-10">
        <RedirectErrorMessage />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo className="mx-auto h-12 w-auto text-primary" />
        <h2 className="text-center text-3xl text-foreground font-bold">Sign in to your account</h2>
        <DataResidency />
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="py-8 px-4 sm:rounded-lg sm:px-10">
          {isOAuthEnabled && (
            <>
              <div className="space-y-2">
                <SignInWithGitHub />
                <SignInWithGoogle />
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-muted">OR</span>
                </div>
              </div>
            </>
          )}

          {passwordLoginEnabled && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setLoginMode("magic")}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                    loginMode === "magic"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("password")}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                    loginMode === "password"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  Password
                </button>
              </div>
            </div>
          )}

          {loginMode === "magic" ? (
            <form onSubmit={handleMagicLinkSubmit} className="flex flex-col space-y-4">
              <TextInput
                label="Enter your email address"
                name="email"
                type="email"
                placeholder="peter.parker@corp.com"
                autoComplete="email"
                value={email}
                required={true}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button loading={status === "loading"}>Send magic link</Button>
              <p className="text-center text-sm h-10 text-muted-foreground">
                <StatusMessage status={status} />
              </p>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col space-y-4">
              <TextInput
                label="Email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                autoComplete="email"
                value={email}
                required={true}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextInput
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                required={true}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button loading={passwordStatus === "loading"}>Sign in</Button>
              {passwordStatus === "error" && (
                <p className="text-center text-sm text-destructive">{passwordError}</p>
              )}
            </form>
          )}
        </div>
        <LegalNotice operation="signin" />
        <RegionSwitch />
      </div>
    </Page>
  );
}
