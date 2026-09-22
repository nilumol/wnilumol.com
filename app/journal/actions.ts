"use server";

import { revalidatePath } from "next/cache";
import { insertJournalEntry } from "@/scripts/journal/db";

export type JournalActionState = {
  status: "idle" | "success" | "error";
  message: string;
  entryId?: number;
};

export const initialJournalActionState: JournalActionState = { status: "idle", message: "" };

export async function submitJournalEntry(
  _prevState: JournalActionState,
  formData: FormData,
): Promise<JournalActionState> {
  const raw = formData.get("body");
  const body = typeof raw === "string" ? raw.trim() : "";

  if (!body) {
    return { status: "error", message: "Write something before saving." };
  }

  const entry = await insertJournalEntry(body);
  revalidatePath("/journal");

  return { status: "success", message: "Saved.", entryId: entry.id };
}
