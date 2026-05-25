"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function createNavigationItem(formData: FormData) {
  const label = formData.get("label") as string;
  const href = formData.get("href") as string;
  const parentId = formData.get("parentId") as string;
  const sortOrder = parseInt(formData.get("sortOrder") as string || "0", 10);
  const id = `${parentId}-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  await prisma.navigationItem.create({
    data: {
      id,
      label,
      href,
      parentId,
      sortOrder,
      visible: true,
    },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}

export async function updateNavigationItem(formData: FormData) {
  const id = formData.get("id") as string;
  const label = formData.get("label") as string;
  const href = formData.get("href") as string;
  const sortOrder = parseInt(formData.get("sortOrder") as string || "0", 10);
  const visible = formData.get("visible") === "true";

  await prisma.navigationItem.update({
    where: { id },
    data: {
      label,
      href,
      sortOrder,
      visible,
    },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}

export async function deleteNavigationItem(formData: FormData) {
  const id = formData.get("id") as string;

  await prisma.navigationItem.delete({
    where: { id },
  });

  revalidatePath("/admin/navigation");
  revalidatePath("/", "layout");
}
