"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validatePayerInput } from "@/lib/payers";
import { createPayer, PayerError, updatePayer } from "@/server/payers";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export type PayerActionState = {
  errors?: {
    fullName?: string;
    email?: string;
    phone?: string;
    externalId?: string;
  };
  message?: string;
};

function getInput(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    externalId: String(formData.get("externalId") ?? ""),
  };
}

async function getWorkspaceContext() {
  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  return { user, workspace };
}

export async function createPayerAction(
  _previousState: PayerActionState,
  formData: FormData,
): Promise<PayerActionState> {
  const validation = validatePayerInput(getInput(formData));

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  const { workspace } = await getWorkspaceContext();
  let payerId: number;

  try {
    const payer = await createPayer(workspace.organization.id, validation.data);
    payerId = payer.id;
  } catch (error) {
    if (error instanceof PayerError) {
      return { message: error.message };
    }

    return { message: "We could not save this payer. Try again." };
  }

  revalidatePath("/payers");
  redirect(`/payers/${payerId}`);
}

export async function updatePayerAction(
  _previousState: PayerActionState,
  formData: FormData,
): Promise<PayerActionState> {
  const payerId = Number(formData.get("payerId"));

  if (!Number.isInteger(payerId) || payerId <= 0) {
    return { message: "This payer could not be found." };
  }

  const validation = validatePayerInput(getInput(formData));

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  const { workspace } = await getWorkspaceContext();

  try {
    await updatePayer(workspace.organization.id, payerId, validation.data);
  } catch (error) {
    if (error instanceof PayerError) {
      return { message: error.message };
    }

    return { message: "We could not update this payer. Try again." };
  }

  revalidatePath("/payers");
  revalidatePath(`/payers/${payerId}`);
  redirect(`/payers/${payerId}`);
}
