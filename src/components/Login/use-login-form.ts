import { FormEvent, useEffect, useRef, useState } from "react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  requiresPasswordChange?: boolean;
  restartLogin?: boolean;
};

export type LoginFormOptions = {
  redirectUrl?: string;
  navigate: (url: string) => void;
  resumeSession: boolean;
  initialError: string;
};

// Session resume, password sign-in and the first-login password change of the sign-in card.
export function useLoginForm({ redirectUrl, navigate, resumeSession, initialError }: LoginFormOptions) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordChange, setIsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(resumeSession && redirectUrl));
  const [isResuming, setIsResuming] = useState(Boolean(resumeSession && redirectUrl));
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [successMessage, setSuccessMessage] = useState("");
  const submissionPending = useRef(Boolean(resumeSession && redirectUrl));
  const resumeRequest = useRef<{ target: string; result: Promise<{ status: number; valid: boolean }> } | null>(null);

  useEffect(() => {
    if (!resumeSession || !redirectUrl) return;
    let active = true;
    submissionPending.current = true;
    if (!resumeRequest.current || resumeRequest.current.target !== redirectUrl) {
      // A Strict Mode effect replay observes the same request. The owner reads
      // its scoped HttpOnly cookie; no credential is passed through the page.
      const result = fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        body: "{}",
      }).then(async response => {
        const body: unknown = await response.json().catch(() => null);
        return {
          status: response.status,
          valid: response.status === 200 && typeof body === "object" && body !== null &&
            "message" in body && typeof body.message === "string" && Boolean(body.message.trim()),
        };
      }).catch(() => ({ status: 0, valid: false }));
      resumeRequest.current = { target: redirectUrl, result };
    }
    void resumeRequest.current.result.then(result => {
      if (!active) return;
      if (result.valid) {
        try { navigate(redirectUrl); return; } catch { /* Keep sign-in available if navigation fails. */ }
      }
      setErrorMessage(result.status === 401
        ? "Votre session a expiré. Veuillez vous reconnecter."
        : "La reprise de votre session est temporairement indisponible. Vous pouvez vous connecter à nouveau.");
      submissionPending.current = false;
      setIsLoading(false);
      setIsResuming(false);
    });
    return () => { active = false; };
  }, [resumeSession, redirectUrl, navigate]);

  const redirectAfterLogin = () => {
    if (redirectUrl) {
      navigate(redirectUrl);
    }
  };

  const loginWithPassword = async (passwordValue: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password: passwordValue,
      }),
    });
    const result = (await response.json()) as LoginResponse;

    if (result.requiresPasswordChange) {
      setIsPasswordChange(true);
      setPassword("");
      setSuccessMessage("");
      return;
    }

    if (!response.ok) {
      setSuccessMessage("");
      setErrorMessage(result.message ?? "La connexion a échoué.");
      return;
    }

    setPassword("");
    setSuccessMessage("Connexion réussie.");
    redirectAfterLogin();
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }

    submissionPending.current = true;
    setIsLoading(true);

    try {
      await loginWithPassword(password);
    } catch {
      setSuccessMessage("");
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword) {
      setErrorMessage("Veuillez renseigner votre nouveau mot de passe.");
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    submissionPending.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/force_change_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok) {
        if (result.restartLogin) {
          setIsPasswordChange(false);
          setNewPassword("");
          setNewPasswordConfirmation("");
        }

        setErrorMessage(result.message ?? "Le mot de passe n’a pas pu être modifié.");
        return;
      }

      const updatedPassword = newPassword;

      setIsPasswordChange(false);
      setPassword(updatedPassword);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setSuccessMessage("Mot de passe modifié. Connexion en cours…");
      await loginWithPassword(updatedPassword);
    } catch {
      setSuccessMessage("");
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  return {
    email, setEmail, password, setPassword, isPasswordChange, newPassword, setNewPassword, newPasswordConfirmation, setNewPasswordConfirmation,
    isLoading, isResuming, errorMessage, successMessage,
    dismissError: () => setErrorMessage(""),
    onSubmit: isPasswordChange ? handlePasswordChange : handleLogin,
  };
}
