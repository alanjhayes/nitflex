"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const validated = signUpSchema.safeParse(data);
  if (!validated.success) {
    throw new Error("Invalid data");
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("Email already in use");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
    },
  });

  return { success: true };
}
