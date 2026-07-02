"use server";

import { redirect } from "next/navigation";

import { validateOrganizationInput } from "@/lib/organizations";
import { syncCurrentUser } from "@/server/users";
import {
  createOrganizationWorkspace,
  WorkspaceError,
} from "@/server/workspaces";

export type OnboardingActionState = {
  errors?: {
    name?: string;
    organizationType?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
  };
  message?: string;
};

export async function createOrganizationAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    organizationType: String(formData.get("organizationType") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
  };
  const validation = validateOrganizationInput(input);

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  try {
    const user = await syncCurrentUser();
    await createOrganizationWorkspace(user.id, validation.data);
  } catch (error) {
    if (error instanceof WorkspaceError) {
      return { message: error.message };
    }

    return {
      message:
        "We could not create your workspace. Check your database and environment configuration, then try again.",
    };
  }

  redirect("/dashboard");
}
