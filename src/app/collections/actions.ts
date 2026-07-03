"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateCollectionInput } from "@/lib/collections";
import { CollectionError, createDraftCollection } from "@/server/collections";
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
