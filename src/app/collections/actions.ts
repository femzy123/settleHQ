"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateCollectionInput } from "@/lib/collections";
import { runtimeEnv } from "@/lib/env";
import { CollectionError, createDraftCollection } from "@/server/collections";
import { InvoiceError, sendInvoicesForSelectedPayers } from "@/server/invoices";
import { syncCurrentUser } from "@/server/users";
import { getActiveWorkspaceForUser } from "@/server/workspaces";

export type CollectionActionState = {
  errors?: {
    name?: string;
    description?: string;
    amount?: string;
    dueDate?: string;
    payerIds?: string;
  };
  message?: string;
};

function getInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    payerIds: formData.getAll("payerIds").map(String),
  };
}

function getBaseAppUrl() {
  return runtimeEnv.appUrl?.replace(/\/$/, "") ?? "";
}

export async function createCollectionAction(
  _previousState: CollectionActionState,
  formData: FormData,
): Promise<CollectionActionState> {
  const validation = validateCollectionInput(getInput(formData));

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  let collectionId: number;

  try {
    const collection = await createDraftCollection(
      workspace.organization.id,
      user.id,
      validation.data,
    );
    collectionId = collection.id;
  } catch (error) {
    if (error instanceof CollectionError) {
      return { message: error.message };
    }

    return { message: "We could not create this collection. Try again." };
  }

  revalidatePath("/collections");
  redirect(`/collections/${collectionId}`);
}

export async function sendInvoicesAction(formData: FormData) {
  const collectionId = Number(formData.get("collectionId"));
  const payerIds = formData
    .getAll("payerIds")
    .map((payerId) => Number(payerId))
    .filter((payerId) => Number.isInteger(payerId) && payerId > 0);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return;
  }

  const user = await syncCurrentUser();
  const workspace = await getActiveWorkspaceForUser(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  try {
    const sentInvoices = await sendInvoicesForSelectedPayers(
      workspace.organization.id,
      workspace.organization.name,
      collectionId,
      payerIds,
    );
    const baseUrl = getBaseAppUrl();

    sentInvoices.forEach((invoice) => {
      const publicUrl = `${baseUrl}${invoice.publicPath}`;

      console.info("[SettleHQ invoice delivery]", {
        deliveryMode: "console",
        createdNow: invoice.wasCreated,
        payerName: invoice.payer.fullName,
        payerEmail: invoice.payer.email,
        invoiceNumber: invoice.invoiceNumber,
        publicUrl,
      });
    });
  } catch (error) {
    if (error instanceof InvoiceError) {
      console.warn("[SettleHQ invoice delivery failed]", {
        collectionId,
        message: error.message,
      });
    }

    redirect(`/collections/${collectionId}`);
  }

  revalidatePath("/collections");
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath("/invoices");
  redirect(`/collections/${collectionId}`);
}
