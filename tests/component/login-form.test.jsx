import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/components/Login";

const requestedFront = "https://projects.example.invalid/expected";
let fetchMock;

const authResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  json: async () => body,
});

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

async function enterCredentials(user) {
  await user.type(screen.getByRole("textbox", { name: "Email professionnel" }), "agent@example.invalid");
  await user.type(screen.getByLabelText("Mot de passe", { exact: true }), "initial-test-password");
}

const deferredResponse = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe("Login form", () => {
  it("locks credentials and ignores repeated submissions until a refused login settles", async () => {
    const gate = deferredResponse();
    fetchMock.mockReturnValueOnce(gate.promise);
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    const form = document.querySelector("form");
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Email professionnel" }).disabled).toBe(true);
    expect(screen.getByLabelText("Mot de passe", { exact: true }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Connexion…" }).disabled).toBe(true);
    await act(async () => gate.resolve(authResponse({ message: "Identifiants refusés." }, 401)));
    expect(screen.getByRole("alert").textContent).toBe("Identifiants refusés.");
    expect(form.getAttribute("aria-busy")).toBe("false");
    expect(screen.getByRole("textbox", { name: "Email professionnel" }).disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(authResponse({ success: true }));
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith(requestedFront));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps one lock across password confirmation and reconnection, clearing stale pending feedback on transport failure", async () => {
    const change = deferredResponse();
    const reconnect = deferredResponse();
    fetchMock.mockResolvedValueOnce(authResponse({ requiresPasswordChange: true }))
      .mockReturnValueOnce(change.promise).mockReturnValueOnce(reconnect.promise);
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await screen.findByRole("heading", { name: "Nouveau mot de passe" });
    await user.type(screen.getByLabelText("Nouveau mot de passe", { exact: true }), "updated-test-password");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "updated-test-password");
    const form = document.querySelector("form");
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Nouveau mot de passe", { exact: true }).disabled).toBe(true);
    expect(screen.getByLabelText("Confirmer le mot de passe").disabled).toBe(true);
    await act(async () => change.resolve(authResponse({ success: true })));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("status").textContent).toBe("Mot de passe modifié. Connexion en cours…");
    expect(screen.getByRole("textbox", { name: "Email professionnel" }).disabled).toBe(true);
    act(() => fireEvent.submit(form));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(async () => reconnect.reject(new Error("transport unavailable")));
    expect(screen.getByRole("alert").textContent).toBe("Impossible de joindre le service de connexion.");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Email professionnel" }).disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not send an empty credential payload", () => {
    render(<Login />);
    fireEvent.submit(document.querySelector("form"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Veuillez renseigner");
  });

  it("shows a refused login without navigating or reporting success", async () => {
    fetchMock.mockResolvedValue(authResponse({ message: "Identifiants refusés." }, 401));
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Identifiants refusés.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "agent@example.invalid",
      password: "initial-test-password",
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Connexion réussie.")).toBeNull();
  });

  it("reports a failed auth-proxy request and preserves the form", async () => {
    fetchMock.mockRejectedValue(new Error("network unavailable"));
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Impossible de joindre le service de connexion.");
    expect(screen.getByRole("textbox", { name: "Email professionnel" }).value).toBe("agent@example.invalid");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects to the requested front only after a successful login", async () => {
    fetchMock.mockResolvedValue(authResponse({ success: true }));
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith(requestedFront));
    expect(screen.getByRole("status").textContent).toBe("Connexion réussie.");
  });

  it("requires a matching new password, then retries login before redirecting", async () => {
    fetchMock
      .mockResolvedValueOnce(authResponse({ requiresPasswordChange: true }))
      .mockResolvedValueOnce(authResponse({ success: true }))
      .mockResolvedValueOnce(authResponse({ success: true }));
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Login redirectUrl={requestedFront} navigate={navigate} />);
    await enterCredentials(user);
    await user.click(screen.getByRole("button", { name: "Se connecter" }));

    await screen.findByRole("heading", { name: "Nouveau mot de passe" });
    expect(navigate).not.toHaveBeenCalled();
    const password = screen.getByLabelText("Nouveau mot de passe", { exact: true });
    const confirmation = screen.getByLabelText("Confirmer le mot de passe");
    await user.type(password, "updated-test-password");
    await user.type(confirmation, "different-test-password");
    await user.click(screen.getByRole("button", { name: "Modifier le mot de passe" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Les mots de passe ne correspondent pas.");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.clear(confirmation);
    await user.type(confirmation, "updated-test-password");
    await user.click(screen.getByRole("button", { name: "Modifier le mot de passe" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith(requestedFront));

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/auth/login",
      "/api/auth/force_change_password",
      "/api/auth/login",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ newPassword: "updated-test-password" });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      email: "agent@example.invalid",
      password: "updated-test-password",
    });
  });

  it("has labeled controls, keyboard focus and no serious axe violations", async () => {
    const user = userEvent.setup();
    render(<Login />);
    expect(screen.getByLabelText("Mot de passe", { exact: true })).toBeTruthy();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Email professionnel" }));

    const results = await axe(document.body);
    expect(results.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });
});
